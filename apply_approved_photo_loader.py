#!/usr/bin/env python3
"""Install approved GainFocus Photo Library v2 into the existing large index.html.
Run inside a development checkout, review diff, commit on branch; never deploy.
"""
from pathlib import Path
import re

base = Path(__file__).resolve().parent
index = base / "index.html"
source = base / "exercise-photo-thumbnails-v2.js"
if not index.is_file() or not source.is_file():
    raise SystemExit("Missing existing index.html or approved photo resolver")
html = index.read_text(encoding="utf-8")
tag = '<script src="./exercise-photo-thumbnails-v2.js?v=2" defer></script>'
if tag in html:
    print("Approved photo loader already present; no changes")
else:
    if len(re.findall(r"</body>", html, flags=re.I)) != 1:
        raise SystemExit("Cannot identify exactly one closing body tag")
    updated = re.sub(r"</body>", tag + "\n</body>", html, count=1, flags=re.I)
    index.write_text(updated, encoding="utf-8")
    print("Approved photo loader added. Verify app before merging or deployment.")
