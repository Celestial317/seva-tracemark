import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from app.config import QUESTIONS_PATH  # noqa: E402

TOKEN = re.compile(r"[a-z0-9]+(?:\.[0-9]+)?")


def tokens(ver: dict) -> set[str]:
    text = (ver["stem"] + " " + " ".join(ver["options"])).lower()
    return set(TOKEN.findall(text))


def main() -> int:
    data = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))
    bad = 0
    for q in data["questions"]:
        qid, vs, errs = q["id"], q["versions"], []
        for k, v in vs.items():
            if len(set(v["options"])) != 4:
                errs.append(f"{k}: option values not unique")
            if q.get("check"):
                got = eval(q["check"], {"log10": math.log10}, {"log10": math.log10, **v["vars"]})
                want = float(re.match(r"[+-]?[0-9.]+", v["options"][v["answer"]]).group())
                if abs(got - want) > 0.01 * max(1.0, abs(want)):
                    errs.append(f"{k}: formula gives {got:g} but marked answer is {want:g}")
        if sorted(vs["C"]["options"]) != sorted(vs["O"]["options"]):
            errs.append("C options are not a permutation of O")
        if vs["C"]["options"] == vs["O"]["options"]:
            errs.append("C option order equals O")
        if vs["C"]["stem"] != vs["O"]["stem"]:
            errs.append("C stem must equal O stem")
        if vs["C"]["options"][vs["C"]["answer"]] != vs["O"]["options"][vs["O"]["answer"]]:
            errs.append("C answer does not match O answer")
        for k in "AB":
            others = set().union(*(tokens(vs[o]) for o in vs if o != k))
            uniq = tokens(vs[k]) - others
            if len(uniq) < 2:
                errs.append(f"{k}: only {len(uniq)} unique tokens {sorted(uniq)}")
        print(f"Q{qid:<2} {q['subject']:<9}", "OK" if not errs else "FAIL")
        for e in errs:
            print("     -", e)
        bad += bool(errs)
    print("ALL OK" if not bad else f"{bad} question(s) FAILED")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
