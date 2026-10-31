"""Phone photo -> cleaned image -> RapidOCR -> lines of text."""
import io
import statistics

import cv2
import numpy as np
from PIL import Image, ImageOps

from .config import OCR_LONG_SIDE, OCR_MIN_CONF, OCR_MIN_LINES

RETAKE_MESSAGE = "Photo is unclear. Retake it flat, in good light, showing the whole page."

_engine = None


def engine():
    global _engine
    if _engine is None:
        from rapidocr_onnxruntime import RapidOCR
        _engine = RapidOCR()
    return _engine


def _order_corners(pts: np.ndarray) -> np.ndarray:
    s, d = pts.sum(axis=1), np.diff(pts, axis=1).ravel()
    return np.array([pts[np.argmin(s)], pts[np.argmin(d)], pts[np.argmax(s)], pts[np.argmax(d)]], dtype="float32")


def find_and_flatten(bgr: np.ndarray) -> tuple[np.ndarray, bool]:
    """Find the page as the largest 4-corner contour; warp it flat if it fills > 30% of the photo."""
    gray = cv2.GaussianBlur(cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY), (5, 5), 0)
    edges = cv2.dilate(cv2.Canny(gray, 50, 150), np.ones((3, 3), np.uint8), iterations=2)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    area_img = bgr.shape[0] * bgr.shape[1]
    for cnt in sorted(contours, key=cv2.contourArea, reverse=True)[:5]:
        if cv2.contourArea(cnt) < 0.3 * area_img:
            break
        approx = cv2.approxPolyDP(cnt, 0.02 * cv2.arcLength(cnt, True), True)
        if len(approx) == 4 and cv2.isContourConvex(approx):
            src = _order_corners(approx.reshape(4, 2).astype("float32"))
            w = max(np.linalg.norm(src[1] - src[0]), np.linalg.norm(src[2] - src[3]))
            h = max(np.linalg.norm(src[3] - src[0]), np.linalg.norm(src[2] - src[1]))
            # flat rectangle with the page's own aspect (a half-page photo is not A4), long side OCR_LONG_SIDE
            k = OCR_LONG_SIDE / max(w, h)
            ow, oh = int(w * k), int(h * k)
            dst = np.array([[0, 0], [ow - 1, 0], [ow - 1, oh - 1], [0, oh - 1]], dtype="float32")
            return cv2.warpPerspective(bgr, cv2.getPerspectiveTransform(src, dst), (ow, oh)), True
    return bgr, False


def preprocess(data: bytes) -> tuple[np.ndarray, bool]:
    img = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
    bgr = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    scale = OCR_LONG_SIDE / max(bgr.shape[:2])
    if abs(scale - 1) > 0.02:
        bgr = cv2.resize(bgr, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA if scale < 1 else cv2.INTER_CUBIC)
    flat, found = find_and_flatten(bgr)
    gray = cv2.cvtColor(flat, cv2.COLOR_BGR2GRAY)
    return cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray), found


def build_lines(items: list[tuple[list, str, float]]) -> list[str]:
    """items: (box, text, conf). Group boxes into lines by vertical centre, left to right."""
    if not items:
        return []
    boxes = []
    for box, text, _ in items:
        ys, xs = [p[1] for p in box], [p[0] for p in box]
        boxes.append({"cy": sum(ys) / 4, "x": min(xs), "h": max(ys) - min(ys), "text": text})
    boxes.sort(key=lambda b: b["cy"])
    tol = 0.6 * statistics.median(b["h"] for b in boxes)
    lines: list[list[dict]] = [[boxes[0]]]
    for b in boxes[1:]:
        cur = lines[-1]
        if abs(b["cy"] - sum(x["cy"] for x in cur) / len(cur)) <= tol:
            cur.append(b)
        else:
            lines.append([b])
    return [" ".join(b["text"] for b in sorted(ln, key=lambda b: b["x"])) for ln in lines]


def read_array(gray: np.ndarray) -> dict:
    result, _ = engine()(gray, use_cls=False)
    items = [(r[0], r[1], float(r[2])) for r in (result or [])]
    lines = build_lines(items)
    conf = sum(i[2] for i in items) / len(items) if items else 0.0
    return {"text": "\n".join(lines), "mean_confidence": conf, "line_count": len(lines)}


def read_photo(data: bytes) -> dict:
    gray, found = preprocess(data)
    out = read_array(gray)
    out["page_found"] = found
    out["retake"] = out["mean_confidence"] < OCR_MIN_CONF or out["line_count"] < OCR_MIN_LINES
    return out
