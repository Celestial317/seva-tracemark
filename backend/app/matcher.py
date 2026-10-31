"""Text -> question blocks -> version probabilities -> centre ranking."""
import math
import re
import unicodedata
from functools import lru_cache

import numpy as np
from rapidfuzz import fuzz
from scipy.optimize import linear_sum_assignment

from . import questions as qb
from . import semantic
from .config import (ALIGN_MIN_SIM, DETECT_P, HIGH_MARGIN, HIGH_MIN_Q, MED_MARGIN, MED_MIN_Q, NUMBER_BONUS,
                     TEMPERATURE, VERSIONS, W_FUZZY, W_MEANING, W_ORDER, W_UNIQUE)

LABELS = {"O": "Original", "A": "New wording", "B": "New numbers", "C": "New option order"}
Q_START = re.compile(r"(?:^|\n)[ \t]*([Qq0O]?)[ \t]*(\d{1,2})[ \t]*[.)]")


# ---------- Step 1: normalise ----------
def normalise(text: str) -> str:
    t = unicodedata.normalize("NFKC", text).lower()
    for _ in range(2):  # inside numbers: o->0, l/i->1, s->5 only next to digits
        t = re.sub(r"(?<=\d)o|o(?=\d)", "0", t)
        t = re.sub(r"(?<=\d)[li]|[li](?=\d)", "1", t)
        t = re.sub(r"(?<=\d)s|s(?=\d)", "5", t)
    t = re.sub(r"[^a-z0-9./\s]", " ", t)
    t = re.sub(r"(?<!\d)\.|\.(?!\d)", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def tokens(text: str) -> set[str]:
    return set(normalise(text).split())


# ---------- Step 2: precomputed index ----------
class Index:
    def __init__(self):
        self.qs = qb.questions()
        self.emb = semantic.version_embeddings(normalise)  # (Q, 4, 384)
        self.emb_q = self.emb.mean(axis=1)
        self.emb_q /= np.linalg.norm(self.emb_q, axis=1, keepdims=True)
        self.norm_stem = [[normalise(q["versions"][v]["stem"]) for v in VERSIONS] for q in self.qs]
        self.option_order = [[[normalise(o) for o in q["versions"][v]["options"]] for v in VERSIONS] for q in self.qs]
        self.unique = []
        for qi in range(len(self.qs)):
            sets = [tokens(qb.version_text(self.qs[qi], v)) for v in VERSIONS]
            self.unique.append([sets[vi] - set().union(*(sets[j] for j in range(4) if j != vi)) for vi in range(4)])


@lru_cache(maxsize=1)
def index() -> Index:
    return Index()


# ---------- Step 3/4: blocks and alignment ----------
def split_blocks(text: str) -> list[dict]:
    starts = []
    for m in Q_START.finditer(text):
        prefix, num = m.group(1), int(m.group(2))
        rest = text[m.end():].split("\n", 1)[0].strip()
        if not prefix and len(rest) < 20:  # "1) 48 m" is an option line, not a question start
            continue
        starts.append((m.start(), num))
    blocks = []
    for i, (s, num) in enumerate(starts):
        e = starts[i + 1][0] if i + 1 < len(starts) else len(text)
        blocks.append({"number": num, "text": text[s:e].strip("\n")})
    return blocks


def window_blocks(text: str, size: int = 4) -> list[dict]:
    lines = [l for l in text.split("\n") if l.strip()]
    return [{"number": None, "text": "\n".join(lines[i:i + size])} for i in range(0, max(len(lines) - size + 1, 1), size)]


def align(blocks: list[dict], ix: Index) -> list[tuple[dict, int, float]]:
    if not blocks:
        return []
    bemb = semantic.embed([normalise(b["text"]) for b in blocks])
    sim = bemb @ ix.emb_q.T
    for bi, b in enumerate(blocks):
        if b["number"] is not None:
            for qi, q in enumerate(ix.qs):
                if q["id"] == b["number"]:
                    sim[bi, qi] += NUMBER_BONUS
    rows, cols = linear_sum_assignment(1 - sim)
    return [(blocks[r], int(c), float(sim[r, c])) for r, c in zip(rows, cols) if sim[r, c] >= ALIGN_MIN_SIM]


# ---------- Step 5: score versions ----------
_OPT = re.compile(r"^[\s(\[{]*([1-4lI])[\s)\]}.:]+(.+)$")


def displayed_options(raw_block: str) -> list[str]:
    out = []
    for ln in raw_block.split("\n"):
        m = _OPT.match(ln)
        if m:
            out.append(normalise(m.group(2)))
    return out[:4]


def order_score(raw_block: str, opts: list[str]) -> float:
    shown = displayed_options(raw_block)
    seq = []
    for s in shown:
        best = max(range(4), key=lambda i: fuzz.ratio(s, opts[i]))
        if fuzz.ratio(s, opts[best]) >= 85:
            seq.append(best)
    if len(seq) < 3:
        return 0.5
    pairs = [(a, b) for i, a in enumerate(seq) for b in seq[i + 1:]]
    conc = sum(1 for a, b in pairs if a < b)
    return 1.0 if conc == len(pairs) else conc / len(pairs)


def unique_score(toks: set[str], t: str, uniq: set[str]) -> float:
    if not uniq:
        return 0.0
    hit = 0
    for u in uniq:
        if any(ch.isdigit() for ch in u) or len(u) < 5:
            hit += u in toks
        else:
            hit += fuzz.partial_ratio(u, t) >= 88
    return hit / len(uniq)


def softmax(x: np.ndarray) -> np.ndarray:
    e = np.exp(x - x.max())
    return e / e.sum()


def score_block(qi: int, block: dict, ix: Index) -> dict:
    t = normalise(block["text"])
    toks = set(t.split())
    bemb = semantic.embed([t])[0]
    m = np.array([float(bemb @ ix.emb[qi, vi]) for vi in range(4)])
    s = np.array([fuzz.token_set_ratio(ix.norm_stem[qi][vi], t) / 100 for vi in range(4)])
    u = np.array([unique_score(toks, t, ix.unique[qi][vi]) for vi in range(4)])
    o = np.array([order_score(block["text"], ix.option_order[qi][vi]) for vi in range(4)])
    e = W_UNIQUE * u + W_ORDER * o + W_MEANING * (m - m.mean()) + W_FUZZY * (s - s.mean())
    return {"p": softmax(e / TEMPERATURE), "u": u, "o": o, "m": m, "s": s}


def version_label(ix: Index, qi: int, vi: int) -> str:
    v = VERSIONS[vi]
    if v == "B":
        nums = sorted((u for u in ix.unique[qi][vi] if re.fullmatch(r"\d+(?:\.\d+)?", u)), key=lambda x: (len(x), x))[:2]
        if nums:
            return f"New numbers ({', '.join(nums)})"
    return LABELS[v]


# ---------- Steps 6/7: centres and evidence ----------
def trace_text(text: str, centres: list[dict]) -> dict:
    """centres: [{id, city, code}]. Returns the API trace result (without ocr/steps)."""
    ix = index()
    aligned = align(split_blocks(text), ix)
    if not aligned:
        aligned = align(window_blocks(text), ix)
    detected = []
    for block, qi, sim in aligned:
        sc = score_block(qi, block, ix)
        vi = int(np.argmax(sc["p"]))
        if sc["p"][vi] >= DETECT_P:
            detected.append({"qi": qi, "vi": vi, "p": sc["p"], "sim": sim})
    detected.sort(key=lambda d: d["qi"])

    scores = {
        c["id"]: sum(math.log(float(d["p"][VERSIONS.index(c["code"][d["qi"]])]) + 0.001) for d in detected)
        for c in centres
    }
    ranked = sorted(centres, key=lambda c: -scores[c["id"]])
    top_s = scores[ranked[0]["id"]]
    margin = top_s - scores[ranked[1]["id"]] if len(ranked) > 1 else 0.0
    n = len(detected)
    if margin >= HIGH_MARGIN and n >= HIGH_MIN_Q:
        confidence = "High"
    elif margin >= MED_MARGIN and n >= MED_MIN_Q:
        confidence = "Medium"
    else:
        confidence = "Inconclusive"
    status = "inconclusive" if confidence == "Inconclusive" else "traced"

    ranking = []
    for i, c in enumerate(ranked):
        label = "Not enough evidence" if status == "inconclusive" else ("Strongest" if i == 0 else "Ruled out")
        ranking.append({"centre": c["id"], "city": c["city"], "label": label,
                        "bar": round(max(2.0, 100 * math.exp(scores[c["id"]] - top_s)), 1),
                        "score": round(scores[c["id"]], 3)})
    questions = []
    for d in detected:
        qi, vi = d["qi"], d["vi"]
        questions.append({
            "number": ix.qs[qi]["id"], "version": VERSIONS[vi], "label": version_label(ix, qi, vi),
            "probability": round(float(d["p"][vi]), 3),
            "centres": [c["id"] for c in centres if c["code"][qi] == VERSIONS[vi]],
        })
    one_page = all(d["qi"] < 5 for d in detected) or all(d["qi"] >= 5 for d in detected)
    return {
        "status": status,
        "confidence": confidence,
        "margin": round(margin, 2),
        "questions_read": n,
        "page_total": 5 if one_page else 10,
        "top": ({"centre": ranked[0]["id"], "city": ranked[0]["city"], "confidence": confidence,
                 "margin": round(margin, 2)} if status == "traced" else None),
        "ranking": ranking,
        "questions": questions,
        "steps": {"questions_matched": n, "papers_compared": len(centres)},
    }
