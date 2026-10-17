/**
 * GF74 isolated thumbnail patch. Apply to index.html on a dev branch only.
 * No workout plans, profile data or deployment changes.
 * Run: node tools/apply-gf74-photo-thumbnails.mjs
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const file='index.html';
const original=fs.readFileSync(file,'utf8');
const marker='<script id="gf70-exercise-thumbnails">';
const styleMarker='<style id="gf70-exercise-thumbnails">';
const patchStyleId='gf74-photo-thumb-style';
assert(original.includes(marker),'Expected GF70 script not found');
assert(original.includes('const EXERCISE_STOCK={'),'Existing offline photographic library missing');

const newFunction=[
  '  function thumb(e,large=false){',
  '    const [kind,type,variant]=spec(e),name=String(e?.name||"Exercise");',
  '    const bank=EXERCISE_STOCK;',
  '    const key=kind==="bench"?(variant.includes("incline")?"incline":"bench")',
  '      :["row"].includes(kind)?"row"',
  '      :["pulldown","pullover","pullup","crunch"].includes(kind)?"pulldown"',
  '      :["triceps"].includes(kind)?"triceps"',
  '      :["hinge","legcurl"].includes(kind)?"hinge"',
  '      :["squat","legpress","legextension","lunge","calf"].includes(kind)?"squat"',
  '      :["curl","raise","reversefly"].includes(kind)?"lateral"',
  '      :["fly","dip"].includes(kind)?"bench":"shoulder";',
  '    const src=bank[key]||bank.shoulder;',
  '    const label=(type+" · "+kind).replace(/[^a-z0-9 .·-]/gi,"");',
  '    return \'<figure class="gf74-photo-thumb\'+(large?\' gf74-large\':\'\')+\'" role="img" aria-label="\'+esc(name)+\' thumbnail">\'',
  '      +\'<img src="\'+src+\'" alt="" aria-hidden="true" loading="lazy" decoding="async">\'',
  '      +\'<span class="gf74-photo-tag">\'+esc(label)+\'</span><figcaption>\'+esc(name)+\'</figcaption></figure>\';',
  '  }',
  ''
].join('\n');

const css=[
'<style id="gf74-photo-thumb-style">',
'.gf74-photo-thumb{display:block;position:relative;width:100%;height:100%;min-height:66px;margin:0;overflow:hidden;border-radius:inherit;color:#f0f6ff;background:#0c172b;isolation:isolate}',
'.gf74-photo-thumb img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 45%;filter:contrast(1.07) saturate(.92)}',
'.gf74-photo-thumb:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(3,8,17,.4),transparent 33%,rgba(3,8,17,.9));pointer-events:none}',
'.gf74-photo-thumb .gf74-photo-tag{position:absolute;z-index:1;top:6px;left:6px;max-width:calc(100% - 12px);background:rgba(3,12,27,.82);padding:3px 6px;border:1px solid rgba(139,193,249,.55);border-radius:5px;color:#bddfff;text-transform:uppercase;font:700 9px/1.15 system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'.gf74-photo-thumb figcaption{position:absolute;z-index:1;bottom:7px;left:7px;right:7px;text-shadow:0 2px 5px #000;font:700 clamp(10px,1.2vw,14px)/1.13 system-ui,sans-serif;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
'.gf74-photo-thumb.gf74-large{min-height:190px}',
'.gf74-photo-thumb.gf74-large figcaption{font-size:clamp(19px,3vw,26px);bottom:12px}',
'.gf74-photo-thumb.gf74-large .gf74-photo-tag{font-size:11px;top:10px;left:10px}',
'</style>',
''
].join('\n');

let result=original;
if(!result.includes('id="'+patchStyleId+'"')){
  const a=result.indexOf('  function thumb(e,large=false){',result.indexOf(marker));
  const b=result.indexOf('  window.gf70ExerciseThumbnailSpec=spec;',a);
  assert(a>=0&&b>a&&b-a<3000,'Thumbnail function boundaries not found');
  result=result.slice(0,a)+newFunction+result.slice(b);
  result=result.replace(styleMarker,css+'\n'+styleMarker);
  assert(result!==original,'Expected changed contents');
}

// Unit tests use mocked browser globals to verify exact-name coverage offline.
const start=result.indexOf(marker)+marker.length;
const end=result.indexOf('</script>',start);
const script=result.slice(start,end);
const entries=script.slice(script.indexOf('  const E={'),script.indexOf('  const norm='));
const names=[...entries.matchAll(/"([^"]+)":\[/g)].map(x=>x[1]);
assert.equal(new Set(names).size,43,'Expected 43 unique exercise thumbnail types');
const keys=['bench','incline','shoulder','lateral','pulldown','row','triceps','squat','hinge'];
const ctx={window:{},EXERCISE_STOCK:Object.fromEntries(keys.map(k=>[k,'data:image/webp;base64,AAAB'+k])),
  esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),
  setTimeout:()=>{},console};
vm.createContext(ctx);
vm.runInContext(script,ctx,{timeout:3000});
for(const name of [...names,'Custom machine shoulder press','Custom goblet squat','Custom cable curl']){
  const html=ctx.window.exerciseVisual({name},false);
  assert(html.includes('<figure class="gf74-photo-thumb'),'Missing photographic card: '+name);
  assert(html.includes('<img src="data:image/webp;'),'Missing source photo: '+name);
  assert(html.includes(name),'Missing exercise label: '+name);
  assert(!html.includes('<svg'),'Stick figure still present: '+name);
}
assert(result.includes('id="'+patchStyleId+'"'),'GF74 styles absent');
if(result!==original)fs.writeFileSync(file,result,'utf8');
console.log('GF74 QA passed: 43/43 named types + 3 custom; photographic source and labels; no stick SVG.');
console.log(result===original?'Already applied; no changes.':'index.html patched on development branch.');
