#!/usr/bin/env python3
"""Tiny idempotent patch to existing 10.5MB GainFocus HTML: two textual replacements only."""
from pathlib import Path
f=Path(__file__).resolve().parent/"index.html"
s=f.read_text(encoding="utf-8")
old_script='<script src="./exercise-photo-readiness.js?v=1" defer></script>'
new_script='<script src="./exercise-photo-readiness.js?v=2" defer></script>'
old_boot='<strong>Loading content</strong><p>Preparing GainFocus</p>'
new_boot='<strong>Loading content</strong><p>Tip: Log your meals in Food Diary to track daily nutrition.</p>'
for old,new in [(old_script,new_script),(old_boot,new_boot)]:
    if old in s:
        assert s.count(old)==1,"Unexpected repeated old HTML block"
        s=s.replace(old,new)
    else:
        assert s.count(new)==1,"Expected first-paint HTML block missing"
assert s.count(new_script)==1 and s.count(new_boot)==1
assert s.count('<script src="./exercise-photo-thumbnails-v2.js?v=2" defer></script>')==1
f.write_text(s,encoding="utf-8")
print("PASS: exact two text replacements, no layout or artwork changed")
