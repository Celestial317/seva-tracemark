import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DATA_DIR = BASE_DIR / "data"
PAPERS_DIR = DATA_DIR / "papers"
MODELS_DIR = BASE_DIR / "models"
QUESTIONS_PATH = DATA_DIR / "questions.json"
STATE_PATH = DATA_DIR / "state.json"
EMBEDDINGS_PATH = DATA_DIR / "embeddings.npz"
KEYS_DEMO_PATH = DATA_DIR / "keys_demo.txt"

SEED = int(os.getenv("TRACEMARK_SEED", "20261030"))

CENTRES = [
    ("C-01", "Panipat"),
    ("C-02", "Ludhiana"),
    ("C-03", "Dehradun"),
    ("C-04", "Rohini, Delhi"),
    ("C-05", "Chandigarh"),
]
VERSIONS = ["O", "A", "B", "C"]
N_QUESTIONS = 10
MIN_DIFF_TOTAL = 6
MIN_DIFF_HALF = 3

# keys / vault
KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
KEY_LEN = 8
KEY_ROLES = ["Authority key", "Superintendent key", "Observer key"]
SCRYPT_N, SCRYPT_R, SCRYPT_P = 2**15, 8, 1
MAX_FAILS = 5
LOCKOUT_SECONDS = 60

# OCR
OCR_MIN_CONF = 0.6
OCR_MIN_LINES = 4
OCR_LONG_SIDE = 1400

# semantic / matcher
MINILM_NAME = "sentence-transformers/all-MiniLM-L6-v2"
MINILM_PATH = MODELS_DIR / "all-MiniLM-L6-v2"
ALIGN_MIN_SIM = 0.45
NUMBER_BONUS = 0.05
DETECT_P = 0.6
TEMPERATURE = 0.25
W_UNIQUE, W_ORDER, W_MEANING, W_FUZZY = 3.0, 2.0, 4.0, 1.0
HIGH_MARGIN, HIGH_MIN_Q = 4.0, 3
MED_MARGIN, MED_MIN_Q = 2.0, 2
