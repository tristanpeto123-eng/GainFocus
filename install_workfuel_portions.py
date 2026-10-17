#!/usr/bin/env python3
"""Surgical fix for legacy WorkFuel diary path to enforce each consumed portion."""
from pathlib import Path
import re
f=Path(__file__).resolve().parent/"index.html"
s=f.read_text(encoding="utf-8")
patches=[
  ('$("logBtn").onclick=()=>{','$("logBtn").onclick=async()=>{'),
  ('$("logStatus").textContent=bridge.log(rows);','$("logStatus").textContent=await bridge.log(rows);'),
  ("log:rows=>{if(!rows.length)return 'Add a meal first.';ensureProgressExtras();const date=todayISO();for(const r of rows){const id='workfuel-'+date+'-'+r.mealId;const entry={...r,id,date,createdAt:new Date().toISOString(),source:'work-fuel'};const i=progress.nutritionLogs.findIndex(x=>x.id===id);if(i<0)progress.nutritionLogs.push(entry);else progress.nutritionLogs[i]=entry}write();toast('Meals saved to today’s food diary');return 'Saved to today’s diary. Logging again updates these entries.'}",
   """log:async rows=>{
if(!rows.length)return 'Add a meal first.';
const servings=await window.GFWorkFuelConfirmPortions?.(rows);
if(!servings||servings.length!==rows.length)return 'No meals were logged — portion confirmation was cancelled.';
ensureProgressExtras();
const date=todayISO();
for(let idx=0;idx<rows.length;idx++){
const r=rows[idx],amount=Number(servings[idx]);
if(!Number.isFinite(amount)||amount<=0)return 'Enter the portion consumed for every meal.';
const id='workfuel-'+date+'-'+r.mealId;
const entry={...r,id,date,createdAt:new Date().toISOString(),source:'work-fuel',
 quantity:amount,quantityUnit:'servings',
 calories:(Number(r.calories)||0)*amount,protein:(Number(r.protein)||0)*amount,
 carbs:(Number(r.carbs)||0)*amount,fat:(Number(r.fat)||0)*amount};
const i=progress.nutritionLogs.findIndex(x=>x.id===id);
if(i<0)progress.nutritionLogs.push(entry);else progress.nutritionLogs[i]=entry;
}
write();toast('Consumed meal portions saved to today’s food diary');
return 'Saved confirmed portions to today’s diary.';
}""")
]
for a,b in patches:
  if a in s:
    if s.count(a)!=1:raise SystemExit(f"Unsafe duplicate patch anchor: {a[:50]}")
    s=s.replace(a,b)
  elif b not in s:
    raise SystemExit(f"Expected original source fragment missing: {a[:70]}")
tag='<script src="./workfuel-portions.js?v=1" defer></script>'
if tag not in s:
  assert s.lower().count("</body>")==1
  s=re.sub(r"</body>",tag+"\n</body>",s,count=1,flags=re.I)
assert s.count(tag)==1
f.write_text(s,encoding="utf-8")
print('PASS: original planner diary action now waits for individual consumed servings; original script preserved otherwise')
