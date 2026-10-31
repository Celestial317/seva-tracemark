"""Download MiniLM into models/ and warm up RapidOCR."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

from app.config import MINILM_NAME, MINILM_PATH  # noqa: E402


def setup_minilm():
    from sentence_transformers import SentenceTransformer
    if MINILM_PATH.exists():
        model = SentenceTransformer(str(MINILM_PATH), device="cpu")
    else:
        model = SentenceTransformer(MINILM_NAME, device="cpu")
        MINILM_PATH.parent.mkdir(parents=True, exist_ok=True)
        model.save(str(MINILM_PATH))
    dim = model.encode(["test"]).shape[-1]
    assert dim == 384, dim
    print(f"MiniLM OK ({dim}-dim)")


def setup_ocr():
    from rapidocr_onnxruntime import RapidOCR
    img = Image.new("RGB", (600, 120), "white")
    try:
        font = ImageFont.truetype("arial.ttf", 44)
    except OSError:
        font = ImageFont.load_default()
    ImageDraw.Draw(img).text((20, 30), "Q1. Test 24 m/s", fill="black", font=font)
    result, _ = RapidOCR()(np.array(img))
    text = " ".join(r[1] for r in (result or []))
    print("OCR read:", repr(text))
    assert "24" in text, "RapidOCR did not read the test image"
    print("RapidOCR OK")


if __name__ == "__main__":
    setup_minilm()
    setup_ocr()
