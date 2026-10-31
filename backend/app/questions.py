import hashlib
import json
from functools import lru_cache

from .config import QUESTIONS_PATH, VERSIONS


def file_hash() -> str:
    return hashlib.sha256(QUESTIONS_PATH.read_bytes()).hexdigest()


@lru_cache(maxsize=1)
def load() -> dict:
    data = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))
    qs = data["questions"]
    assert len(qs) == 10, "question bank must have 10 questions"
    for q in qs:
        assert set(q["versions"]) == set(VERSIONS), f"Q{q['id']} needs versions {VERSIONS}"
    return data


def questions() -> list[dict]:
    return load()["questions"]


def version_text(q: dict, v: str) -> str:
    ver = q["versions"][v]
    return ver["stem"] + " " + " ".join(ver["options"])


def exam_name() -> str:
    return load()["exam"]
