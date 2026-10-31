"""Render one exam paper per centre. Nothing centre-specific is printed: the fingerprint is the content."""
import io
import textwrap

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from . import questions as qb

FONT, SIZE, LEADING = "Helvetica", 13, 13 * 1.4
LEFT, TOP, BOTTOM = 72, A4[1] - 72, 72
WRAP = 78  # characters per line at 13 pt inside the margins
PAGES = [(0, 5), (5, 10)]


def render_pdf(code: str) -> bytes:
    qs = qb.questions()
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    c.setTitle(qb.exam_name())
    for page_no, (lo, hi) in enumerate(PAGES, start=1):
        y = TOP
        c.setFont("Helvetica-Bold", 11)
        c.drawString(LEFT, y, f"{qb.exam_name()}  ·  Physics, Chemistry, Biology  ·  10 questions")
        y -= LEADING * 2.2
        c.setFont(FONT, SIZE)
        for i in range(lo, hi):
            q = qs[i]
            ver = q["versions"][code[i]]
            lines = textwrap.wrap(f"Q{q['id']}. {ver['stem']}", WRAP)
            for ln in lines:
                c.drawString(LEFT, y, ln)
                y -= LEADING
            for n, opt in enumerate(ver["options"], start=1):
                c.drawString(LEFT + 18, y, f"({n}) {opt}")
                y -= LEADING
            y -= LEADING * 0.8
        c.showPage()
    c.save()
    return buf.getvalue()
