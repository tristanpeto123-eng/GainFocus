from pathlib import Path
import re,json
s=Path('index.html').read_text(encoding='utf-8')
patterns=[
 r'(?i)tesseract',r'(?i)ocr',r'(?i)barcode',r'(?i)nutrition label',r'(?i)food scanner',
 r'(?i)scan label',r'(?i)upload label',r'(?i)nutrition scanner',r'(?i)food diary',r'(?i)portion',
 r'(?i)camera',r'(?i)processFood',r'(?i)parseNutrition',r'(?i)extractNutrition',r'(?i)logFood',
 r'(?i)foodEntry',r'(?i)addFood',r'(?i)function .*food',r'(?i)calculate.*macro'
]
lines=s.splitlines(keepends=True)
lineStarts=[0]
for line in lines:lineStarts.append(lineStarts[-1]+len(line))
res={'chars':len(s),'line_count':len(lines),'matches':{}}
for pat in patterns:
 out=[]
 for m in re.finditer(pat,s):
  if len(out)>=17:break
  pos=m.start()
  snippet=s[max(0,pos-260):min(len(s),pos+600)]
  line=s.count('\n',0,pos)+1
  out.append({'line':line,'pos':pos,'context':snippet})
 res['matches'][pat]=out
Path('nutrition_source_inspection.json').write_text(json.dumps(res,indent=2,ensure_ascii=False))
print('Inspection complete:',len(s),'chars',len(lines),'lines')

# Inspection refresh trigger
