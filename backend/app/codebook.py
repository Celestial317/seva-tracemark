import random

from .config import MIN_DIFF_HALF, MIN_DIFF_TOTAL, N_QUESTIONS, SEED, VERSIONS


def _diff(a: str, b: str, lo: int = 0, hi: int = N_QUESTIONS) -> int:
    return sum(1 for i in range(lo, hi) if a[i] != b[i])


def _letters_ok(code: str) -> bool:
    return all(code.count(v) >= 2 for v in VERSIONS)


def compatible(a: str, b: str) -> bool:
    half = N_QUESTIONS // 2
    return (
        _diff(a, b) >= MIN_DIFF_TOTAL
        and _diff(a, b, 0, half) >= MIN_DIFF_HALF
        and _diff(a, b, half, N_QUESTIONS) >= MIN_DIFF_HALF
    )


def make_codes(n: int, seed: int = SEED) -> list[str]:
    rng = random.Random(seed)
    codes: list[str] = []
    for _ in range(200_000):
        code = "".join(rng.choice(VERSIONS) for _ in range(N_QUESTIONS))
        if not _letters_ok(code):
            continue
        if all(compatible(code, c) for c in codes):
            codes.append(code)
            if len(codes) == n:
                return codes
    raise RuntimeError("could not build a codebook with the required distances")
