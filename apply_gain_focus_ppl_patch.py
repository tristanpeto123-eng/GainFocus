#!/usr/bin/env python3
"""Idempotently wire v4.0.74 split-lock assets into the existing large app shell.

Run at the repository root: python3 apply_gain_focus_ppl_patch.py
Safe for repeat runs. The large index.html stays byte-for-byte intact aside
from two reference lines; nothing is rewritten or minified.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
index = ROOT / "index.html"
js = "gain-focus-ppl-schedule.js"
css = "gain-focus-ppl-schedule.css"
for asset in (js, css):
    if not (ROOT / asset).is_file():
        raise SystemExit(f"Required asset absent: {asset}")
text = index.read_text(encoding="utf-8")
if text.count("</head>") != 1 or text.count("</body>") != 1:
    raise SystemExit("Unexpected HTML shell: closing head/body tags missing or duplicated")
css_ref = '<link rel="stylesheet" href="./' + css + '?v=4.0.74">'
js_ref = '<script src="./' + js + '?v=4.0.74" defer></script>'
if css_ref not in text:
    text = text.replace("</head>", css_ref + "\n</head>", 1)
if js_ref not in text:
    text = text.replace("</body>", js_ref + "\n</body>", 1)
index.write_text(text, encoding="utf-8")
assert index.read_text(encoding="utf-8").count(css_ref) == 1
assert index.read_text(encoding="utf-8").count(js_ref) == 1
print("PASS: Gain Focus v4.0.74 assets linked exactly once.")
