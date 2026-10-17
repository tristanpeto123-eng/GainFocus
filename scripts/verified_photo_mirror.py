#!/usr/bin/env python3
"""Mirror every approved-source exercise thumbnail and fail on missing/corrupt data.
Owner-approved source: yuhonas/free-exercise-db (Unlicense).
Runs only on a disposable GitHub development branch.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import hashlib, json, os, re, sys, time, urllib.request

ROOT=Path(__file__).resolve().parents[1]
PIN="f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5"
BASE=f"https://raw.githubusercontent.com/yuhonas/free-exercise-db/{PIN}/"
CATALOGUE=BASE+"dist/exercises.json"
ROOT_IMAGES=ROOT/"exercise-photos"
OUT_INDEX=ROOT/"exercise-photo-index-v2.json"
OUT_REPORT=ROOT/"PHOTO_THUMBNAIL_VERIFICATION.json"
PATTERN=re.compile(r"^[A-Za-z0-9_()\-]+/[0-9]+\.(?:jpg|jpeg|png|webp)$")
def get(url, attempts=4):
    last=None
    for attempt in range(attempts):
        try:
            req=urllib.request.Request(url, headers={"User-Agent":"GainFocus-photo-v2-audit/1.0"})
            with urllib.request.urlopen(req, timeout=35) as resp:
                data=resp.read(3_000_001)
                if resp.status!=200 or len(data)>3_000_000: raise RuntimeError("invalid status or over size limit")
                return data
        except Exception as e:
            last=e
            if attempt+1<attempts:time.sleep((attempt+1)*1.6)
    raise RuntimeError(str(last))
def one(item):
    name,path=item
    dest=ROOT_IMAGES/path
    if dest.is_file():
        data=dest.read_bytes()
    else:
        data=get(BASE+"exercises/"+"/".join(urllib.parse.quote(x,safe="") for x in path.split("/")))
    if path.lower().endswith((".jpg",".jpeg")):
        valid=data.startswith(b"\xff\xd8\xff") and data.rstrip().endswith(b"\xff\xd9")
    elif path.lower().endswith(".png"):
        valid=data.startswith(b"\x89PNG\r\n\x1a\n")
    else:
        valid=data.startswith(b"RIFF") and data[8:12]==b"WEBP"
    if not valid or len(data)<512:raise RuntimeError(f"{name}: invalid/corrupt image ({len(data)} bytes)")
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists():dest.write_bytes(data)
    return {"name":name,"path":path,"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest()}
def main():
    from urllib import parse
    urllib.parse=parse
    rows=json.loads(get(CATALOGUE))
    if len(rows)!=876:raise SystemExit(f"Unexpected catalogue size: {len(rows)} != 876")
    usable=[]; missing=[]
    for row in rows:
        name=row.get("name","")
        image=next((i for i in row.get("images",[]) if isinstance(i,str) and PATTERN.fullmatch(i)),None)
        if image:usable.append((name,image))
        else:missing.append(name)
    if len(usable)!=873 or len(missing)!=3:raise SystemExit(f"Unexpected 873/3 catalogue split: {len(usable)}/{len(missing)}")
    print(f"Auditing {len(usable)} image files at pinned upstream {PIN}",flush=True)
    results=[]; failures=[]
    with ThreadPoolExecutor(max_workers=14) as executor:
        futures={executor.submit(one,x):x for x in usable}
        for i,f in enumerate(as_completed(futures),1):
            try:results.append(f.result())
            except Exception as e:failures.append({"name":futures[f][0],"path":futures[f][1],"error":str(e)})
            if i%100==0:print(f"Checked {i}/{len(usable)} files, failures {len(failures)}",flush=True)
    payload={"source":"https://github.com/yuhonas/free-exercise-db","source_sha":PIN,"total":len(rows),"images_expected":873,"images_verified":len(results),"no_photo_entries":missing,"failed":failures,"bytes_total":sum(x["bytes"] for x in results),"image_checks":results}
    OUT_REPORT.write_text(json.dumps(payload,sort_keys=True,indent=2)+"\n")
    if failures:
        raise SystemExit(f"FAILED: {len(failures)} expected exercise photos failed download/validation; see PHOTO_THUMBNAIL_VERIFICATION.json")
    # Deterministic lean startup metadata; offline even on first load.
    OUT_INDEX.write_text(json.dumps(usable,ensure_ascii=False,separators=(",",":"))+"\n")
    print(f"PASS {len(usable)}/{len(usable)} complete photos | 3 explicitly unavailable | {payload['bytes_total']} image bytes",flush=True)
if __name__=="__main__":main()
