import logging
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from . import matcher, ocr, vault
from .config import KEYS_DEMO_PATH
from .schemas import CreateBody, TraceTextBody, UnlockBody

log = logging.getLogger("tracemark")
READY = {"ocr": False, "semantic": False}


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        matcher.index()  # loads MiniLM, builds/reads the embedding cache
        warm = "Q1. A car accelerates uniformly from rest to 20 m/s in 5 s. What distance does it cover?\n(1) 40 m\n(2) 50 m"
        matcher.trace_text(warm,
                           [{"id": "W-1", "city": "-", "code": "OOOOOOOOOO"}, {"id": "W-2", "city": "-", "code": "AAAAAAAAAA"}])
        READY["semantic"] = True
    except Exception:
        log.exception("MiniLM failed to load")
    try:
        ocr.read_array(np.full((120, 400), 255, dtype=np.uint8))
        READY["ocr"] = True
    except Exception:
        log.exception("RapidOCR failed to load")
    yield


app = FastAPI(title="TraceMark", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):\d+",
    allow_methods=["*"], allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"ok": READY["ocr"] and READY["semantic"], "ocr": READY["ocr"], "semantic": READY["semantic"]}


@app.post("/api/papers/create")
def create(body: CreateBody | None = None):
    n = body.centres if body else 5
    return {"centres": vault.create_papers(n)}


@app.get("/api/papers")
def papers():
    state = vault.load_state()
    if not state:
        return {"created": False, "centres": []}
    return {"created": True, "centres": [
        {"id": c["id"], "city": c["city"], "code": c["code"], "status": "locked"} for c in state["centres"]]}


@app.get("/api/papers/keys-demo")
def keys_demo():
    if not KEYS_DEMO_PATH.exists():
        raise HTTPException(404, "No papers created yet.")
    return Response(KEYS_DEMO_PATH.read_text(encoding="utf-8"), media_type="text/plain",
                    headers={"Content-Disposition": 'attachment; filename="tracemark-keys.txt"'})


@app.post("/api/papers/{centre_id}/unlock")
def unlock(centre_id: str, body: UnlockBody):
    try:
        pdf = vault.unlock(centre_id, body.keys)
    except KeyError:
        raise HTTPException(404, "Unknown centre or no papers created yet.")
    except vault.Locked as e:
        return JSONResponse({"error": f"Too many attempts. Try again in {e.seconds} seconds.",
                             "retry_after": e.seconds}, status_code=429, headers={"Retry-After": str(e.seconds)})
    except vault.BadKeys:
        return JSONResponse({"error": "These keys do not open this paper."}, status_code=403)
    return Response(pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'inline; filename="{centre_id}.pdf"', "Cache-Control": "no-store"})


def _centres() -> list[dict]:
    state = vault.load_state()
    if not state:
        raise HTTPException(409, "Create papers first.")
    return [{"id": c["id"], "city": c["city"], "code": c["code"]} for c in state["centres"]]


@app.post("/api/trace")
async def trace(image: UploadFile = File(...)):
    centres = _centres()
    data = await image.read()
    try:
        read = ocr.read_photo(data)
    except Exception:
        raise HTTPException(400, "That file could not be read as an image.")
    info = {"text": read["text"], "confidence": round(read["mean_confidence"], 3), "lines": read["line_count"]}
    base_steps = {"page_found": read["page_found"], "text_read": round(read["mean_confidence"], 3)}
    if read["retake"]:
        return {"status": "retake", "message": ocr.RETAKE_MESSAGE, "top": None, "ranking": [], "questions": [],
                "ocr": info, "steps": base_steps}
    result = matcher.trace_text(read["text"], centres)
    result["ocr"] = info
    result["steps"] = {**base_steps, **result["steps"]}
    return result


@app.post("/api/trace/text")
def trace_text(body: TraceTextBody):
    result = matcher.trace_text(body.text, _centres())
    result["steps"] = {"page_found": True, "text_read": 1.0, **result["steps"]}
    return result
