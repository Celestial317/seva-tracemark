TraceMarkAI
Submitted by Team Invictus:
Palak Jain
Suravi Jha
Soumya Sourav Das
Tushar Mathur
Sudhanshu Shekhar
Devyanshi Bansal

# TraceMarkAI

Leak-traceable exam papers. Every exam centre receives the same paper, but each centre's copy carries a different mix of semantically equivalent question versions (its hidden fingerprint). If a page leaks, a single phone photo of it is enough to name the centre it came from.

## How it works

1. **Create papers** – one click generates 5 encrypted papers (one per centre) for the same 10 questions. Each paper gets 3 keys.
2. **Unlock and print** – choose a centre and enter all 3 keys. Only the full set of correct keys decrypts that centre's PDF (AES-256-GCM, scrypt-derived key).
3. **Trace a leak** – upload a photo of a printed page. The app reads it with OCR, matches each question to its version by meaning, and reports the centre with evidence and a confidence level. Weak matches return "inconclusive" and never name a centre.

No model training is needed. Two pretrained models are used:

| Model | Purpose |
| --- | --- |
| RapidOCR (PP-OCR, ONNX) | Read text from the photo |
| `sentence-transformers/all-MiniLM-L6-v2` | Match OCR text to question versions by meaning |

## Tech stack

- Backend: Python 3.11+, FastAPI, Uvicorn, reportlab, PyMuPDF, cryptography, OpenCV
- Frontend: React, TypeScript, Vite, Tailwind CSS

## Project layout

```
backend/
  app/            FastAPI app (codebook, pdfgen, vault, ocr, semantic, matcher)
  scripts/        model setup, question verification, accuracy simulation
  data/           question bank (questions.json)
web/              React frontend
```

## Run locally

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
python scripts/setup_models.py     # downloads MiniLM and checks OCR
python scripts/verify_questions.py
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend (second terminal):

```bash
cd web
npm install
npm run dev -- --host
```

Open http://localhost:5173. To trace from a phone, use the laptop's LAN address on the same Wi-Fi.

Accuracy test:

```bash
cd backend && python scripts/simulate.py
```

## Known limits

- Five centres and 10 questions are a demo; real exams have 180+ questions, which makes the fingerprint far stronger.
- Question versions here are authored for the demo; a full product would generate them with a larger model and have subject experts approve them.
- 3-of-3 scrypt-derived keys are a simplification; production would use threshold key sharing on secure hardware with a time window.
