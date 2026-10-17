#!/usr/bin/env python3
"""Update only the two photo-loader versions in the existing full GainFocus HTML."""
from pathlib import Path
f=Path(__file__).resolve().parent/"index.html"
s=f.read_text(encoding="utf-8")
replacements=[
 ('src="./exercise-photo-thumbnails-v2.js?v=2"','src="./exercise-photo-thumbnails-v2.js?v=3"'),
 ('src="./exercise-photo-readiness.js?v=2"','src="./exercise-photo-readiness.js?v=3"')
]
for old,new in replacements:
    if old in s:
        assert s.count(old)==1, "Multiple original photo loaders"
        s=s.replace(old,new)
    else:
        assert s.count(new)==1, "Photo loader not found"
assert s.index(replacements[0][1])<s.index(replacements[1][1]),"Photo resolver must load before gate"
f.write_text(s,encoding="utf-8")
print("PASS: two scoped script-version replacements; all approved app content preserved")
