#!/usr/bin/env python3
"""Surgical install: append three enhancing modules after approved original functionality."""
from pathlib import Path
import re
root=Path(__file__).resolve().parent
file=root/"index.html"
original=file.read_text(encoding="utf-8")
approved='<script src="./exercise-photo-readiness.js?v=1" defer></script>'
tags=[
  '<script src="./nutrition-portions.js?v=1" defer></script>',
  '<script src="./nutrition-ocr-enhanced.js?v=2" defer></script>',
  '<script src="./nutrition-barcode.js?v=1" defer></script>'
]
assert original.count(approved)==1,"Approved photo gate missing"
result=original
for tag in tags:
  if tag not in result:
    assert result.lower().count('</body>')==1
    result=re.sub(r'</body>',lambda m:tag+'\n'+m.group(0),result,count=1,flags=re.I)
  assert result.count(tag)==1,"Duplicate nutrition enhancement loader"
assert result.index(approved)<result.index(tags[0])<result.index(tags[1])<result.index(tags[2])
file.write_text(result,encoding="utf-8")
print("PASS: added only enhanced nutrition JS loaders; original approved source unchanged")
