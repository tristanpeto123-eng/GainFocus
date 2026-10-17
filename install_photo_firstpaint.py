#!/usr/bin/env python3
"""Pre-paint loading screen injection for the existing 10.5 MB GainFocus index.
Only two deterministic inserts: critical style in <head> and boot loader at <body>.
"""
from pathlib import Path
import re
f=Path(__file__).resolve().parent/"index.html"
original=f.read_text(encoding="utf-8")
style='''<style id="gfPhotoBootCSS">
#gfPhotoBoot{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 20%,#183451,#070d1c 74%);color:#eefbff;font-family:system-ui,-apple-system,sans-serif;padding:25px}
#gfPhotoBoot>div{width:min(100%,430px);box-sizing:border-box;display:flex;align-items:center;flex-direction:column;gap:19px;text-align:center;padding:35px 25px;border:1px solid #31516a;border-radius:24px;background:#0b2036}
#gfPhotoBoot .gfPhotoSpin{width:38px;height:38px;border-radius:50%;border:3px solid #36506d;border-top-color:#8de5ff;animation:gfBootSpin .85s linear infinite}
#gfPhotoBoot strong{font-size:23px;font-weight:800}
#gfPhotoBoot p{font-size:13px;color:#a9c4d9;margin:0}
@keyframes gfBootSpin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){#gfPhotoBoot .gfPhotoSpin{animation-duration:2s}}
</style>'''
boot='''<div id="gfPhotoBoot" role="status" aria-live="polite"><div><span class="gfPhotoSpin" aria-hidden="true"></span><strong>Loading content</strong><p>Preparing GainFocus</p></div></div>'''
updated=original
if 'id="gfPhotoBootCSS"' not in updated:
    assert len(re.findall(r"<head(?:\\s[^>]*)?>",updated,flags=re.I))==1,"Expected one head tag"
    updated=re.sub(r"(<head(?:\\s[^>]*)?>)",lambda m:m.group(1)+"\n"+style+"\n",updated,count=1,flags=re.I)
else:assert updated.count('id="gfPhotoBootCSS"')==1
if 'id="gfPhotoBoot"' not in updated:
    assert len(re.findall(r"<body(?:\\s[^>]*)?>",updated,flags=re.I))==1,"Expected one body tag"
    updated=re.sub(r"(<body(?:\\s[^>]*)?>)",lambda m:m.group(1)+"\n"+boot+"\n",updated,count=1,flags=re.I)
else:assert updated.count('id="gfPhotoBoot"')==1
assert 'src="./exercise-photo-readiness.js?v=1"' in updated
assert 'src="./exercise-photo-thumbnails-v2.js?v=2"' in updated
f.write_text(updated,encoding="utf-8")
print("PASS: first-paint loading screen precedes original app; modifications restricted to two inserts")
