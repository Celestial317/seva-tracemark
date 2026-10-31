"""Simulated phone photos + typed-text tests. Usage: python scripts/simulate.py [per_centre_page] [text_tests] [--dump]"""
import random
import re
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

import cv2
import numpy as np
import pymupdf

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app import matcher, ocr, pdfgen, vault  # noqa: E402
from app.config import KEYS_DEMO_PATH  # noqa: E402
from app import questions as qb  # noqa: E402

rng = random.Random(7)


def demo_keys() -> dict[str, list[str]]:
    out, cur = {}, None
    for ln in KEYS_DEMO_PATH.read_text().splitlines():
        m = re.match(r"(C-\d\d) ", ln)
        if m:
            cur = m.group(1); out[cur] = []
        elif cur and ":" in ln:
            out[cur].append(ln.split(":")[1].strip())
    return out


def render_pages(centre_id: str, keys: list[str]) -> list[np.ndarray]:
    pdf = vault.unlock(centre_id, keys)  # in memory only
    doc = pymupdf.open(stream=pdf, filetype="pdf")
    pages = []
    for p in doc:
        pix = p.get_pixmap(dpi=150)
        img = np.frombuffer(pix.samples, np.uint8).reshape(pix.h, pix.w, pix.n)[:, :, :3]
        pages.append(cv2.cvtColor(img.copy(), cv2.COLOR_RGB2BGR))
    return pages


def distort(page: np.ndarray) -> bytes:
    h, w = page.shape[:2]
    # random crop keeping 60-100% of the page (height), full width mostly
    keep = rng.uniform(0.6, 1.0)
    top = rng.uniform(0, 1 - keep)
    page = page[int(top * h): int((top + keep) * h)]
    h, w = page.shape[:2]
    # desk background, page placed with perspective + rotation
    pad = int(0.12 * max(h, w))
    canvas_w, canvas_h = w + 2 * pad, h + 2 * pad
    desk = np.full((canvas_h, canvas_w, 3), rng.randint(60, 110), np.uint8)
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    j = lambda: rng.uniform(-0.08, 0.08)  # perspective jitter up to 8%
    dst = np.float32([[pad + j() * w * 0.5, pad + j() * h * 0.5], [pad + w + j() * w * 0.5, pad + j() * h * 0.5],
                      [pad + w + j() * w * 0.5, pad + h + j() * h * 0.5], [pad + j() * w * 0.5, pad + h + j() * h * 0.5]])
    M = cv2.getPerspectiveTransform(src, dst)
    warped = cv2.warpPerspective(page, M, (canvas_w, canvas_h), borderValue=(0, 0, 0))
    mask = cv2.warpPerspective(np.full((h, w), 255, np.uint8), M, (canvas_w, canvas_h))
    img = np.where(mask[..., None] > 0, warped, desk)
    R = cv2.getRotationMatrix2D((canvas_w / 2, canvas_h / 2), rng.uniform(-7, 7), 1.0)
    img = cv2.warpAffine(img, R, (canvas_w, canvas_h), borderValue=(90, 90, 90))
    # blur, brightness, shadow gradient
    s = rng.uniform(0, 1.5)
    if s > 0.1:
        img = cv2.GaussianBlur(img, (0, 0), s)
    img = img.astype(np.float32) * rng.uniform(0.75, 1.15) + rng.uniform(-20, 20)
    grad = np.linspace(rng.uniform(0.7, 1.0), rng.uniform(0.9, 1.0), canvas_w, dtype=np.float32)
    if rng.random() < 0.5:
        grad = grad[::-1]
    img = np.clip(img * grad[None, :, None], 0, 255).astype(np.uint8)
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, rng.randint(40, 80)])
    return buf.tobytes()


def typo(s: str) -> str:
    out = []
    for ch in s:
        r = rng.random()
        if r < 0.015: continue
        if r < 0.03: out.append(ch + ch); continue
        if r < 0.04 and ch.isalpha(): out.append(rng.choice("aeiou")); continue
        out.append(ch)
    return "".join(out)


def typed_text(code: str) -> str:
    qs = qb.questions()
    picks = sorted(rng.sample(range(10), rng.randint(4, 6)))
    lines = []
    for i in picks:
        v = qs[i]["versions"][code[i]]
        lines.append(typo(f"Q{qs[i]['id']}. {v['stem']}"))
        lines += [typo(f"({n}) {o}") for n, o in enumerate(v["options"], 1)]
    return "\n".join(lines)


def outcome(res: dict) -> str:
    if res["status"] == "traced":
        return res["top"]["centre"] + ("" if res["confidence"] == "High" else "?")
    return res["status"]


def report(title: str, rows: list[tuple[str, dict]], times: list[float]):
    print(f"\n=== {title} ({len(rows)} cases) ===")
    centres = sorted({t for t, _ in rows})
    cols = centres + [c + "?" for c in centres] + ["inconclusive", "retake"]
    cm = defaultdict(Counter)
    for truth, res in rows:
        cm[truth][outcome(res)] += 1
    print("truth".ljust(8) + "".join(c[:12].rjust(13) for c in cols if any(cm[t][c] for t in centres)))
    shown = [c for c in cols if any(cm[t][c] for t in centres)]
    for t in centres:
        print(t.ljust(8) + "".join(str(cm[t][c]).rjust(13) for c in shown))
    high = [(t, r) for t, r in rows if r["status"] == "traced" and r["confidence"] == "High"]
    right = sum(1 for t, r in high if r["top"]["centre"] == t)
    wrong_any = sum(1 for t, r in rows if r["status"] == "traced" and r["top"]["centre"] != t)
    print(f"High-confidence results: {len(high)}  correct: {right}  wrong: {len(high) - right}")
    print(f"High accuracy: {100 * right / max(1, len(high)):.1f}%   (a ? marks Medium; wrong at any named confidence: {wrong_any})")
    print(f"Inconclusive/retake share: {100 * sum(1 for _, r in rows if r['status'] != 'traced') / len(rows):.1f}%")
    if times:
        print(f"Mean time per trace: {sum(times) / len(times):.2f}s")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    per = int(args[0]) if args else 40
    n_text = int(args[1]) if len(args) > 1 else 50
    keys, state = demo_keys(), vault.load_state()
    centres = [{"id": c["id"], "city": c["city"], "code": c["code"]} for c in state["centres"]]
    ocr.engine(); matcher.index()
    rows, times, bad = [], [], []
    for c in centres:
        for pi, page in enumerate(render_pages(c["id"], keys[c["id"]]), 1):
            for k in range(per):
                data = distort(page)
                t0 = time.time()
                read = ocr.read_photo(data)
                res = ({"status": "retake"} if read["retake"] else matcher.trace_text(read["text"], centres))
                times.append(time.time() - t0)
                rows.append((c["id"], res))
                if res["status"] == "traced" and res["top"]["centre"] != c["id"]:
                    bad.append((c["id"], pi, k, res, read["text"]))
        print(f"{c['id']} done", flush=True)
    report("Simulated phone photos", rows, times)
    for b in bad[:3]:
        print("WRONG:", b[0], "page", b[1], b[3]["confidence"], b[3]["margin"], [(q["number"], q["version"]) for q in b[3]["questions"]])
    trows = []
    for _ in range(n_text):
        c = rng.choice(centres)
        trows.append((c["id"], matcher.trace_text(typed_text(c["code"]), centres)))
    report("Typed text with typos", trows, [])


if __name__ == "__main__":
    main()
