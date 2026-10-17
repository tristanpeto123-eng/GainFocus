#!/usr/bin/env python3
"""Inject one pre-entry photo gate script into GainFocus without modifying unrelated HTML."""
from pathlib import Path
import re
base=Path(__file__).resolve().parent
html_path=base/"index.html"
html=html_path.read_text(encoding="utf-8")
tag='<script src="./exercise-photo-readiness.js?v=1" defer></script>'
approved='<script src="./exercise-photo-thumbnails-v2.js?v=2" defer></script>'
assert html.count(approved)==1,"Approved photographic resolver must exist exactly once"
if tag in html:
    assert html.count(tag)==1,"Duplicate readiness loader"
    print("Photo readiness loader already installed")
else:
    assert html.lower().count("</body>")==1,"Exactly one body closing tag required"
    assert html.index(approved)<html.lower().rfind("</body>"),"Approved resolver must run before readiness gate"
    revised=re.sub(r"</body>",tag+"\n</body>",html,count=1,flags=re.I)
    assert revised.replace(tag+"\n","")==html,"Unexpected change outside readiness tag"
    html_path.write_text(revised,encoding="utf-8")
    print("Photo readiness loader added once; no unrelated HTML changes")
# Workflow trigger: ensure the approved-photo gate is staged on this branch.
