"""Encryption, 3-key unlock and lockout. Keys and the derived paper key are never stored."""
import base64
import hashlib
import json
import os
import re
import secrets
import time

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from . import codebook, pdfgen
from .config import (CENTRES, KEYS_DEMO_PATH, KEY_ALPHABET, KEY_LEN, KEY_ROLES, LOCKOUT_SECONDS,
                     MAX_FAILS, PAPERS_DIR, SCRYPT_N, SCRYPT_P, SCRYPT_R, STATE_PATH)

_fails: dict[str, list[float]] = {}  # centre -> [fail_count, locked_until]


def normalise_key(k: str) -> str:
    return re.sub(r"[\s-]", "", k).upper()


def fmt_key(k: str) -> str:
    return f"{k[:4]}-{k[4:]}"


def new_key() -> str:
    return "".join(secrets.choice(KEY_ALPHABET) for _ in range(KEY_LEN))


def derive(keys: list[str], salt: bytes) -> bytes:
    joined = "".join(sorted(normalise_key(k) for k in keys))
    return hashlib.scrypt(joined.encode(), salt=salt, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P,
                          dklen=32, maxmem=128 * 1024 * 1024)


def load_state() -> dict | None:
    return json.loads(STATE_PATH.read_text(encoding="utf-8")) if STATE_PATH.exists() else None


def create_papers(n: int = 5) -> list[dict]:
    """Make n encrypted papers. Returns centres with their 3 keys (the only time keys are visible)."""
    PAPERS_DIR.mkdir(parents=True, exist_ok=True)
    codes = codebook.make_codes(n)
    centres, out, demo = [], [], []
    for (cid, city), code in zip(CENTRES[:n], codes):
        keys = [new_key() for _ in KEY_ROLES]
        salt = os.urandom(16)
        pdf = pdfgen.render_pdf(code)
        nonce = os.urandom(12)
        blob = nonce + AESGCM(derive(keys, salt)).encrypt(nonce, pdf, None)
        (PAPERS_DIR / f"{cid}.pdf.enc").write_bytes(blob)
        del pdf  # plain PDF only ever lived in memory
        centres.append({"id": cid, "city": city, "code": code, "salt": base64.b64encode(salt).decode()})
        out.append({"id": cid, "city": city, "code": code,
                    "keys": [{"role": r, "key": fmt_key(k)} for r, k in zip(KEY_ROLES, keys)]})
        demo.append(f"{cid} {city} ({code})\n" + "\n".join(
            f"  {r}: {fmt_key(k)}" for r, k in zip(KEY_ROLES, keys)))
    STATE_PATH.write_text(json.dumps({"centres": centres}, indent=2), encoding="utf-8")
    KEYS_DEMO_PATH.write_text("DEMO ONLY - keys for the mock exam\n\n" + "\n\n".join(demo) + "\n", encoding="utf-8")
    _fails.clear()
    return out


class Locked(Exception):
    def __init__(self, seconds: int):
        self.seconds = seconds


class BadKeys(Exception):
    pass


def unlock(centre_id: str, keys: list[str]) -> bytes:
    state = load_state()
    centre = next((c for c in (state or {}).get("centres", []) if c["id"] == centre_id), None)
    if centre is None:
        raise KeyError(centre_id)
    count, until = _fails.get(centre_id, [0, 0.0])
    now = time.time()
    if until > now:
        raise Locked(int(until - now) + 1)
    if until and until <= now:
        count, until = 0, 0.0
    blob = (PAPERS_DIR / f"{centre_id}.pdf.enc").read_bytes()
    try:
        key = derive(keys, base64.b64decode(centre["salt"]))
        return AESGCM(key).decrypt(blob[:12], blob[12:], None)
    except InvalidTag:
        count += 1
        if count >= MAX_FAILS:
            _fails[centre_id] = [0, now + LOCKOUT_SECONDS]
        else:
            _fails[centre_id] = [count, 0.0]
        raise BadKeys()
