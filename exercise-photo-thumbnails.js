/* GainFocus thumbnail overlay v4.0.74 — review branch only.
   Load AFTER the gf70 inline exercise-thumbnail script. No network calls.
   Exercise photographs are category references, not exact demonstrations.
*/
(function(){
  'use strict';
  const PHOTO={
    bench:'bench',pulldown:'pulldown',pullover:'pulldown',pullup:'pulldown',
    row:'row',fly:'bench',reversefly:'lateral',shrug:'lateral',raise:'lateral',
    squat:'squat',legpress:'squat',legextension:'squat',legcurl:'hinge',
    calf:'squat',hinge:'hinge',lunge:'squat',dip:'triceps',triceps:'triceps'
  };
  const FAMILIES={
    bench:'Chest press',pulldown:'Vertical pull',pullover:'Straight-arm pull',
    pullup:'Pull-up',row:'Row',fly:'Chest fly',reversefly:'Rear delt fly',
    shrug:'Shrug',raise:'Raise',squat:'Squat',legpress:'Leg press',
    legextension:'Leg extension',legcurl:'Leg curl',calf:'Calf raise',
    hinge:'Hip hinge',crunch:'Core',dip:'Dip',curl:'Curl',triceps:'Triceps',
    lunge:'Lunge',shoulder:'Shoulder press',general:'Exercise'
  };
  const escText=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const parse=e=>{
    if(typeof window.gf70ExerciseThumbnailSpec==='function')return window.gf70ExerciseThumbnailSpec(e);
    const n=String(e?.name||'').toLowerCase();
    if(/curl/.test(n))return ['curl','dumbbell','standard'];
    if(/crunch|plank|ab\b/.test(n))return ['crunch','bodyweight','standard'];
    if(/squat|lunge|leg|calf/.test(n))return ['squat','machine','standard'];
    if(/row/.test(n))return ['row','cable','standard'];
    if(/pull/.test(n))return ['pulldown','cable','standard'];
    if(/tricep|extension|pushdown/.test(n))return ['triceps','cable','standard'];
    return ['general','bodyweight','standard'];
  };
  const style=document.createElement('style');
  style.id='gf74-exercise-photo-style';
  style.textContent=`
.gf74-thumb{position:relative;display:block;width:100%;height:100%;min-height:76px;overflow:hidden;border-radius:inherit;background:#0a1a31;color:#f2f8ff;isolation:isolate}
.gf74-thumb.large{min-height:158px}
.gf74-thumb img{display:block;width:100%;height:100%;object-fit:cover;object-position:center 35%}
.gf74-thumb .gf74-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(3,9,21,.57),transparent 37%,rgba(3,9,21,.94));pointer-events:none}
.gf74-thumb .gf74-label{position:absolute;left:8px;right:8px;bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font:800 12px/1.16 system-ui,-apple-system,sans-serif;letter-spacing:-.015em;text-shadow:0 1px 4px #000}
.gf74-thumb.large .gf74-label{font-size:clamp(16px,2.2vw,24px);left:14px;bottom:13px}
.gf74-thumb .gf74-equipment{position:absolute;top:7px;left:8px;padding:3px 6px;border:1px solid rgba(173,219,255,.42);border-radius:5px;background:rgba(3,12,29,.72);color:#cee9ff;font:750 9px/1 system-ui,-apple-system,sans-serif;letter-spacing:.055em;text-transform:uppercase}
.gf74-thumb.large .gf74-equipment{left:14px;top:12px;font-size:11px}
.gf74-thumb.no-photo{background:radial-gradient(circle at 50% 32%,#234c70,#081625 80%)}
.gf74-thumb .gf74-symbol{position:absolute;width:72%;max-width:180px;height:72%;left:14%;top:12%}
`;
  document.head.appendChild(style);
  const symbol=(kind,type)=>{
    const dumbbell='<rect x="29" y="39" width="42" height="8" rx="4" fill="#d0e6fb"/><rect x="18" y="28" width="14" height="30" rx="4" fill="#80c8ff"/><rect x="68" y="28" width="14" height="30" rx="4" fill="#80c8ff"/>';
    const cable='<rect x="17" y="11" width="12" height="69" rx="4" fill="#c3dcee"/><path d="M23 21 H72 V51" fill="none" stroke="#80c8ff" stroke-width="4"/><rect x="64" y="50" width="16" height="7" rx="3.5" fill="#c3dcee"/>';
    const core='<path d="M39 18Q50 11 61 18L67 35 62 66 55 76 45 76 38 66 33 35Z" fill="#4b97c9" stroke="#c6e3fb" stroke-width="2"/><path d="M39 38H61M40 50H60M42 62H58M50 32V70" fill="none" stroke="#a5d7ff" stroke-width="2"/>';
    const art=kind==='crunch'?core:(type==='cable'||type==='rope'?cable:dumbbell);
    return '<svg class="gf74-symbol" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="46" r="42" fill="rgba(11,39,67,.68)" stroke="rgba(141,207,255,.3)"/>'+art+'</svg>';
  };
  function render(e,large=false){
    const [kind,type,variant]=parse(e);
    const name=String(e?.name||'Exercise'),lower=name.toLowerCase();
    let key=PHOTO[kind]||'';
    if(kind==='bench'&&/shoulder press|overhead press|military press/.test(lower))key='shoulder';
    if(kind==='bench'&&/incline/.test(lower))key='incline';
    // No misleading pose photos for exercises not represented in the source assets.
    if(kind==='curl'||kind==='crunch'||kind==='general')key='';
    const photos=(typeof EXERCISE_STOCK!=='undefined')?EXERCISE_STOCK:{};
    const src=key&&photos[key];
    const family=FAMILIES[kind]||'Exercise',title=escText(name);
    const img=src?'<img src="'+src+'" loading="'+(large?'eager':'lazy')+'" alt="'+escText(family)+' movement-family reference photo (not a form tutorial)">':symbol(kind,type);
    const gear=escText(type==='ezbar'?'EZ-bar':type==='bodyweight'?'Bodyweight':type||'Exercise');
    return '<div class="gf74-thumb'+(large?' large':'')+(src?'':' no-photo')+'" role="group" aria-label="'+title+' exercise preview">'+img+'<span class="gf74-overlay" aria-hidden="true"></span><span class="gf74-equipment">'+gear+'</span><span class="gf74-label">'+title+'</span></div>';
  }
  window.gf74ExerciseVisual=render;
  window.gf70ExerciseThumbnail=render;
  window.exerciseVisual=render;
  try{exerciseVisual=render}catch(_){}
  setTimeout(()=>{try{if(typeof renderTrain==='function')renderTrain()}catch(_){ }},100);
})();
