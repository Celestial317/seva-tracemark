import itertools, json, re, sys, time
from pathlib import Path
import requests, fitz
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
B = "http://127.0.0.1:8000/api"
r = requests.post(f"{B}/papers/create", json={"centres": 5}).json()["centres"]
print("CODES:"); [print(" ", c["id"], c["city"], c["code"]) for c in r]
ok = True
for a, b in itertools.combinations(r, 2):
    d = [x != y for x, y in zip(a["code"], b["code"])]
    t, h1, h2 = sum(d), sum(d[:5]), sum(d[5:])
    if t < 6 or h1 < 3 or h2 < 3: ok = False; print("BAD PAIR", a["id"], b["id"], t, h1, h2)
print("pair distances ok (>=6 total, >=3 per page):", ok)
print("each code has every letter >=2x:", all(all(c["code"].count(v) >= 2 for v in "OABC") for c in r))
c = r[3]; keys = [k["key"] for k in c["keys"]]
res = requests.post(f"{B}/papers/{c['id']}/unlock", json={"keys": keys[::-1]})
print("right keys reversed order ->", res.status_code, res.headers["content-type"])
doc = fitz.open(stream=res.content, filetype="pdf"); txt = "".join(p.get_text() for p in doc)
print("pages:", len(doc), "| contains centre id/code:", c["id"] in txt or c["code"] in txt, "| C-0 in text:", bool(re.search(r"C-0\d", txt)))
print("page1 head:", txt.strip().splitlines()[:3])
res = requests.post(f"{B}/papers/{c['id']}/unlock", json={"keys": [keys[0], keys[1], "AAAA-AAAA"]})
print("2 right + 1 wrong ->", res.status_code, res.json())
codes = []
for i in range(5):
    codes.append(requests.post(f"{B}/papers/C-01/unlock", json={"keys": ["AAAAAAAA"]*3}).status_code)
codes.append(requests.post(f"{B}/papers/C-01/unlock", json={"keys": ["AAAAAAAA"]*3}))
print("5 wrong tries:", codes[:5], "| 6th:", codes[5].status_code, codes[5].json())
