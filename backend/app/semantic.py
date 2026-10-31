"""MiniLM loading and the cached embeddings of every question version."""
import numpy as np

from . import questions as qb
from .config import EMBEDDINGS_PATH, MINILM_NAME, MINILM_PATH, VERSIONS

_model = None
_emb: np.ndarray | None = None  # (n_questions, 4, 384)


def model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(str(MINILM_PATH) if MINILM_PATH.exists() else MINILM_NAME, device="cpu")
    return _model


def embed(texts: list[str]) -> np.ndarray:
    return np.asarray(model().encode(texts, normalize_embeddings=True, show_progress_bar=False), dtype="float32")


def version_embeddings(normalise) -> np.ndarray:
    """Embeddings of stem + options for every version. Cached in embeddings.npz, keyed by questions.json hash."""
    global _emb
    if _emb is not None:
        return _emb
    h = qb.file_hash()
    if EMBEDDINGS_PATH.exists():
        z = np.load(EMBEDDINGS_PATH, allow_pickle=False)
        if str(z["hash"]) == h:
            _emb = z["emb"]
            return _emb
    texts = [normalise(qb.version_text(q, v)) for q in qb.questions() for v in VERSIONS]
    _emb = embed(texts).reshape(len(qb.questions()), len(VERSIONS), -1)
    np.savez(EMBEDDINGS_PATH, emb=_emb, hash=np.array(h))
    return _emb
