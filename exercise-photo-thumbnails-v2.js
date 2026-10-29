/* Gain Focus Photo Thumbnails v2.1 — Local verified photo mirror.
 * Photo source: yuhonas/free-exercise-db @ f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5 (Unlicense).
 * Coverage: 873 photographed entries of 876 in upstream catalogue,
 * plus validated built-in aliases and nine already embedded local photos.
 */
(function(){
  'use strict';
  if (window.__gfPhotoThumbsV2) return;
  window.__gfPhotoThumbsV2 = true;
  const REMOTE = './exercise-photos/';
  const REMOTE_BACKUP = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5/exercises/';
  const CATALOGUE = './exercise-photo-index-v2.json';
  const LOCAL = './exercise-thumbnails/';
  const CATALOGUE_CACHE = 'gf-photo-catalogue-2026-10-local-v2-1';
  const CSS_ID = 'gf-exercise-photo-styles-v2';
  const EXACT={
    'incline dumbbell press':'Incline_Dumbbell_Press/0.jpg',
    'flat dumbbell press':'Dumbbell_Bench_Press/0.jpg',
    'dumbbell bench press':'Dumbbell_Bench_Press/0.jpg',
    'barbell bench press':'Barbell_Bench_Press_-_Medium_Grip/0.jpg',
    'bench press':'Barbell_Bench_Press_-_Medium_Grip/0.jpg',
    'incline barbell press':'Barbell_Incline_Bench_Press_-_Medium_Grip/0.jpg',
    'incline bench press':'Barbell_Incline_Bench_Press_-_Medium_Grip/0.jpg',
    'incline smith press':'Smith_Machine_Incline_Bench_Press/0.jpg',
    'incline machine press':'Leverage_Incline_Chest_Press/0.jpg',
    'machine chest press':'Leverage_Chest_Press/0.jpg',
    'chest press':'Leverage_Chest_Press/0.jpg',
    'lat pulldown':'Wide-Grip_Lat_Pulldown/0.jpg',
    'wide grip lat pulldown':'Wide-Grip_Lat_Pulldown/0.jpg',
    'close grip lat pulldown':'Close-Grip_Front_Lat_Pulldown/0.jpg',
    
    'seated cable row':'Seated_Cable_Rows/0.jpg',
    'cable row':'Seated_Cable_Rows/0.jpg',
    'chest supported row':'Dumbbell_Incline_Row/0.jpg',
    'dumbbell row':'One-Arm_Dumbbell_Row/0.jpg',
    'barbell row':'Bent_Over_Barbell_Row/0.jpg',
    'bent over row':'Bent_Over_Barbell_Row/0.jpg',
    't bar row':'T-Bar_Row_with_Handle/0.jpg',
    'face pull':'Face_Pull/0.jpg',
    'pull up':'Pullups/0.jpg',
    'pull ups':'Pullups/0.jpg',
    'pullup':'Pullups/0.jpg',
    'chin up':'Chin-Up/0.jpg',
    'romanian deadlift':'Romanian_Deadlift/0.jpg',
    'rdl':'Romanian_Deadlift/0.jpg',
    'deadlift':'Barbell_Deadlift/0.jpg',
    'leg press':'Leg_Press/0.jpg',
    'narrow stance leg press':'Narrow_Stance_Leg_Press/0.jpg',
    'leg extension':'Leg_Extensions/0.jpg',
    'leg extensions':'Leg_Extensions/0.jpg',
    'leg curl':'Lying_Leg_Curls/0.jpg',
    'lying leg curl':'Lying_Leg_Curls/0.jpg',
    'seated leg curl':'Seated_Leg_Curl/0.jpg',
    'standing calf raise':'Standing_Calf_Raises/0.jpg',
    'seated calf raise':'Seated_Calf_Raise/0.jpg',
    'walking lunge':'Bodyweight_Walking_Lunge/0.jpg',
    'barbell walking lunge':'Barbell_Walking_Lunge/0.jpg',
    'dumbbell walking lunge':'Dumbbell_Lunges/0.jpg',
    'bulgarian split squat':'Split_Squat_with_Dumbbells/0.jpg',
    'dumbbell split squat':'Split_Squat_with_Dumbbells/0.jpg',
    'back squat':'Barbell_Squat/0.jpg',
    'barbell squat':'Barbell_Squat/0.jpg',
    'squat':'Barbell_Squat/0.jpg',
    'hack squat':'Hack_Squat/0.jpg',
    'seated shoulder press':'Dumbbell_Shoulder_Press/0.jpg',
    'dumbbell shoulder press':'Dumbbell_Shoulder_Press/0.jpg',
    'shoulder press':'Dumbbell_Shoulder_Press/0.jpg',
    'barbell overhead press':'Barbell_Shoulder_Press/0.jpg',
    'overhead press':'Barbell_Shoulder_Press/0.jpg',
    'arnold press':'Arnold_Dumbbell_Press/0.jpg',
    'lateral raise':'Side_Lateral_Raise/0.jpg',
    'dumbbell lateral raise':'Side_Lateral_Raise/0.jpg',
    'cable lateral raise':'Cable_Seated_Lateral_Raise/0.jpg',
    'seated lateral raise':'Seated_Side_Lateral_Raise/0.jpg',
    'rear delt fly':'Cable_Rear_Delt_Fly/0.jpg',
    'cable rear delt fly':'Cable_Rear_Delt_Fly/0.jpg',
    'reverse pec deck':'Reverse_Machine_Flyes/0.jpg',
    'dumbbell fly':'Dumbbell_Flyes/0.jpg',
    
    'incline cable fly':'Incline_Cable_Flye/0.jpg',
    'dumbbell curl':'Dumbbell_Bicep_Curl/0.jpg',
    'seated dumbbell curl':'Seated_Dumbbell_Curl/0.jpg',
    'incline dumbbell curl':'Incline_Dumbbell_Curl/0.jpg',
    'barbell curl':'Barbell_Curl/0.jpg',
    'preacher curl':'Preacher_Curl/0.jpg',
    'hammer curl':'Hammer_Curls/0.jpg',
    'cable curl':'High_Cable_Curls/0.jpg',
    'cable triceps pushdown':'Triceps_Pushdown/0.jpg',
    'triceps pushdown':'Triceps_Pushdown/0.jpg',
    'rope pushdown':'Triceps_Pushdown_-_Rope_Attachment/0.jpg',
    'triceps rope pushdown':'Triceps_Pushdown_-_Rope_Attachment/0.jpg',
    'overhead triceps extension':'Cable_Rope_Overhead_Triceps_Extension/0.jpg',
    'skull crushers':'Lying_Triceps_Press/0.jpg'
  };
  const OFFLINE={
    'incline dumbbell press':'incline',
    'incline db press':'incline',
    'seated shoulder press':'shoulder',
    'dumbbell shoulder press':'shoulder',
    'shoulder press':'shoulder',
    'lat pulldown':'pulldown',
    'wide grip lat pulldown':'pulldown',
    'seated cable row':'row',
    'cable row':'row',
    'lateral raise':'lateral',
    'dumbbell lateral raise':'lateral',
    'cable triceps pushdown':'triceps',
    'triceps pushdown':'triceps',
    'rope pushdown':'triceps',
    'romanian deadlift':'hinge',
    'rdl':'hinge',
    'barbell bench press':'bench',
    'bench press':'bench'
  };
  // An explicit alias must retain movement AND equipment. Generic guesses are prohibited.
  const ALIASES={
    'db bench press':'flat dumbbell press',
    'flat db press':'flat dumbbell press',
    'incline db press':'incline dumbbell press',
    'db shoulder press':'dumbbell shoulder press',
    'lat pull down':'lat pulldown',
    'lat pull downs':'lat pulldown',
    'cable seated row':'seated cable row',
    'chest supported dumbbell row':'chest supported row',
    'dumbbell romanian deadlift':'dumbbell romanian deadlift',
    'bb bench press':'barbell bench press',
    'bb back squat':'back squat',
    'cable rope triceps pushdown':'rope pushdown',
    'bulgarian squat':'bulgarian split squat',
    'calf raises':'standing calf raise',
    'flat chest press':'chest press',
    'dumbbell side raise':'dumbbell lateral raise',
    'pullups':'pull up',
    'chinups':'chin up',
    'rdls':'rdl'
  };
  // Refuse lookalike substitutions for equipment-specific ambiguous inputs.
  const BLOCKED_ALIASES = new Set([
    'dumbbell romanian deadlift' // Never substitute barbell RDL for this name
  ]);
  const normalize=s=>String(s||'').toLowerCase().replace(/&/g,' and ').replace(/[–—]/g,'-').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const safe=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validPhotoPath=s=>typeof s==='string'&&/^[A-Za-z0-9_()\-]+\/\d+\.(jpg|jpeg|png|webp)$/.test(s)&&!s.includes('..');
  const photoURL=path=>REMOTE+path.split('/').map(encodeURIComponent).join('/');
  const remoteBackupURL=path=>REMOTE_BACKUP+path.split('/').map(encodeURIComponent).join('/');
  const EXPLICIT=new Map(Object.entries(EXACT).map(([name,path])=>[normalize(name),path]).filter(([,p])=>validPhotoPath(p)));
  const OFFLINE_EXACT=new Map(Object.entries(OFFLINE).map(([name,key])=>[normalize(name),key]));
  let CATALOGUE_EXACT=new Map(), catalogStatus='loading', catalogueCount=0, imageMisses=new Set();
  let lastRendered=0;

  const styles=document.createElement('style'); styles.id=CSS_ID;
  styles.textContent=`
    .gf-photo-exercise{display:block!important;position:relative;overflow:hidden;width:100%;height:100%;min-height:inherit;border-radius:inherit;background:linear-gradient(145deg,#173453,#081322 78%);isolation:isolate}
    .gf-photo-exercise img{display:block;width:100%;height:100%;min-height:inherit;object-fit:cover;object-position:center;filter:contrast(1.05) saturate(.96)}
    .gf-photo-exercise.gf-photo-loading::before{content:'';position:absolute;z-index:3;width:26px;height:26px;box-sizing:border-box;left:calc(50% - 13px);top:calc(50% - 13px);border:3px solid rgba(121,198,245,.27);border-top-color:#9eeaff;border-radius:50%;animation:gf-photo-tile-spin .8s linear infinite;pointer-events:none}
    .gf-photo-exercise.gf-photo-loading img{opacity:0}
    .gf-photo-exercise.gf-photo-ready img{opacity:1}
    .gf-photo-exercise.gf-photo-failed::before{content:'Photo unavailable';position:absolute;z-index:3;left:5px;right:5px;top:50%;transform:translateY(-50%);text-align:center;color:#bdd7ed;font:600 11px/1.3 system-ui,sans-serif}
    .gf-photo-exercise.gf-photo-failed img{opacity:0}
    @keyframes gf-photo-tile-spin{to{transform:rotate(360deg)}}
    @media(prefers-reduced-motion:reduce){.gf-photo-exercise.gf-photo-loading::before{animation-duration:2s}}
    .gf-photo-exercise::after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,transparent 70%,rgba(4,12,24,.32))}
    .gf-photo-placeholder{display:flex;align-items:center;justify-content:center;text-align:center;flex-direction:column;gap:6px;padding:8px;color:#d6eaff;font:700 10px/1.25 system-ui,-apple-system,sans-serif;letter-spacing:.02em}
    .gf-photo-placeholder b{font-size:clamp(12px,3vw,15px);color:#75baff;font-weight:850;letter-spacing:.07em}
    .gf-photo-placeholder span{max-width:100%;overflow-wrap:anywhere}
    .exercise-detail-visual .gf-photo-exercise{min-height:190px}
    .workout-cover .gf-photo-exercise,.cover-cell .gf-photo-exercise{height:100%}
    .gf-photo-exercise .gf-photo-label{position:absolute;left:7px;right:7px;bottom:6px;z-index:1;color:white;text-shadow:0 1px 5px #050a15;font:700 9px/1.2 system-ui,-apple-system,sans-serif;opacity:0}
    .exercise-detail-visual .gf-photo-exercise .gf-photo-label{opacity:1;font-size:12px}
  `;
  (document.head||document.documentElement).appendChild(styles);

  function resolve(e){
    const name=String(e?.name||'').trim();
    let k=normalize(name);
    if(ALIASES[k])k=normalize(ALIASES[k]);
    const path=CATALOGUE_EXACT.get(k)||(BLOCKED_ALIASES.has(k)?null:EXPLICIT.get(k))||null;
    const local=OFFLINE_EXACT.get(k)||null;
    // Custom exercises can explicitly carry a safe personal photo URL.
    let custom=null;
    const field=e?.thumbnailUrl || e?.photoUrl;
    if(typeof field==='string'){
      try{const u=new URL(field,document.baseURI);if(u.protocol==='https:'||u.protocol==='blob:') custom=u.href;}catch(_error){}
    }
    return {name,path,local,custom,source:custom?'custom':path?'catalogued':local?'local-only':catalogStatus==='loading'?'pending':'unmapped'};
  }
  function placeholder(name,pending){
    return `<span class="gf-photo-exercise gf-photo-placeholder" data-gf-exercise-name="${safe(name)}" data-gf-await-catalogue="${pending?'yes':'no'}" role="img" aria-label="${safe(name)}: ${pending?'loading image':'no verified photo'}"><b>GAIN FOCUS</b><span>${safe(name)}</span></span>`;
  }
  function render(e,large=false){
    const info=resolve(e||{}), name=info.name||'Exercise';
    if(!info.path&&!info.local&&!info.custom)return placeholder(name,info.source==='pending');
    const primary=info.custom|| (info.path?photoURL(info.path):LOCAL+info.local+'.webp');
    const fallback=info.path&&info.local?` data-gf-photo-local="${safe(info.local)}"`:'';
    const sourcePath=info.path?` data-gf-source-path="${safe(info.path)}"`:'';
    lastRendered++;
    return `<span class="gf-photo-exercise gf-photo-loading${large?' large':''}" data-gf-exercise-name="${safe(name)}" data-gf-photo-v2="yes"><img class="exercise-stock gf-real-ex-image" data-gf-photo="v2"${fallback}${sourcePath} src="${safe(primary)}" alt="${safe(name)} exercise demonstration" loading="lazy" decoding="async"><span class="gf-photo-label">${safe(name)}</span></span>`;
  }

  function photoDecoded(img){
    if(!(img instanceof HTMLImageElement)||img.dataset.gfPhoto!=='v2')return;
    if(!img.complete||!img.naturalWidth)return;
    const source=img.currentSrc||img.src;
    const mark=()=>{
      if(!img.isConnected||(img.currentSrc||img.src)!==source)return;
      const tile=img.closest('[data-gf-photo-v2]');
      if(tile){tile.classList.remove('gf-photo-loading');tile.classList.add('gf-photo-ready');}
    };
    if(typeof img.decode==='function')img.decode().then(mark,()=>{});
    else mark();
  }
  document.addEventListener('load',ev=>photoDecoded(ev.target),true);
  document.addEventListener('error',function(ev){
    const img=ev.target;
    if(!(img instanceof HTMLImageElement)||img.dataset.gfPhoto!=='v2')return;
    const path=img.dataset.gfSourcePath;
    // Retry the exact approved image from pinned upstream on a missed local asset.
    if(path&&validPhotoPath(path)&&!img.dataset.gfRemoteTried){
      img.closest('[data-gf-photo-v2]')?.classList.add('gf-photo-loading');
      img.dataset.gfRemoteTried='yes';
      img.src=remoteBackupURL(path);
      return;
    }
    const local=img.dataset.gfPhotoLocal;
    if(local&&!img.dataset.gfLocalTried){
      img.closest('[data-gf-photo-v2]')?.classList.add('gf-photo-loading');
      img.dataset.gfLocalTried='yes';
      img.src=LOCAL+local+'.webp';
      return;
    }
    const tile=img.closest('[data-gf-photo-v2]');
    if(!tile)return;
    const name=tile.dataset.gfExerciseName||'';
    imageMisses.add(normalize(name));
    tile.outerHTML=placeholder(name,false);
  },true);

  // Replaces the original stick-figure producer without touching muscle-map SVG.
  window.exerciseVisual=render;
  const targets='.exercise-preview-thumb,.exercise-guide-thumb,.exercise-detail-visual,.log-thumb,.cover-cell';
  function exerciseNameFor(el){
    const row=el.closest('.exercise-preview-row,.exercise-guide-row,.workout-log-item,.workout-engine-head,.workout-sheet');
    const fromRow=row?.querySelector('.exercise-preview-copy b,.exercise-guide-copy b,.meta b,.workout-engine-head h2');
    if(fromRow?.textContent)return fromRow.textContent.trim();
    if(el.matches('.exercise-detail-visual'))return el.parentElement?.querySelector('h2')?.textContent?.trim()||'';
    return '';
  }
  function refreshPending(){
    document.querySelectorAll('[data-gf-await-catalogue="yes"]').forEach(tile=>{
      const name=tile.dataset.gfExerciseName;
      if(!name)return;
      const info=resolve({name});
      // After catalogue fetch failures, show final placeholder and avoid loops.
      if(info.path||info.local){tile.outerHTML=render({name});}
      else tile.setAttribute('data-gf-await-catalogue','no');
    });
  }
  function repairExisting(){
    document.querySelectorAll('[data-gf-photo-v2] img[data-gf-photo="v2"]').forEach(photoDecoded);
    document.querySelectorAll(targets).forEach(el=>{
      if(el.querySelector('[data-gf-photo="v2"],.gf-photo-placeholder'))return;
      if(!el.querySelector('svg'))return;
      const name=exerciseNameFor(el);
      if(name)el.innerHTML=render({name},el.matches('.exercise-detail-visual'));
    });
  }
  let scheduled=false;
  const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;repairExisting();});};
  function watch(){repairExisting();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});}
  if(document.body)watch(); else document.addEventListener('DOMContentLoaded',watch,{once:true});

  function loadIndex(rows){
    const next=new Map();
    for(const item of rows){
      let name,path;
      if(Array.isArray(item)){[name,path]=item;}
      else {name=item?.name;path=item?.images?.[0];}
      if(!name||!validPhotoPath(path))continue;
      const key=normalize(name);
      if(key&&!next.has(key))next.set(key,path);
    }
    CATALOGUE_EXACT=next;catalogueCount=next.size;catalogStatus='ready';
    refreshPending();
  }
  try{
    const stored=localStorage.getItem(CATALOGUE_CACHE);
    if(stored){let parsed=JSON.parse(stored);if(Array.isArray(parsed)&&parsed.length>=800)loadIndex(parsed);}
  }catch(_error){}
  // Fetch full metadata once, then cache a compact validated manifest (not 876 photographs).
  // Individual images remain lazy-loaded and browser cached.
  const catalogueReady=(async()=>{
    if(catalogStatus==='ready')return catalogueCount;
    try{
      const response=await fetch(CATALOGUE,{cache:'force-cache'});
      if(!response.ok)throw Error('catalogue HTTP '+response.status);
      const rows=await response.json();
      if(!Array.isArray(rows)||rows.length<800)throw Error('catalogue incomplete');
      loadIndex(rows);
      try{localStorage.setItem(CATALOGUE_CACHE,JSON.stringify([...CATALOGUE_EXACT]));}catch(_error){}
    }catch(error){catalogStatus='offline';refreshPending();}
    return catalogueCount;
  })();
  window.GFExerciseThumbsV2={
    get status(){return catalogStatus;},
    get catalogueCount(){return catalogueCount;},
    ready:catalogueReady,
    resolve,
    render,
    audit(names){
      const exerciseNames=Array.isArray(names)?names:
        (typeof plan!=='undefined'&&plan?.training?.sessions||[]).flatMap(s=>(s.exercises||[]).map(e=>e.name));
      const entries=exerciseNames.map(name=>{const r=resolve({name});return {name:r.name,source:r.source,found:!!(r.path||r.local||r.custom),photo:r.path||null};});
      return {catalogueStatus:catalogStatus,catalogueCount,total:entries.length,covered:entries.filter(x=>x.found).length,missing:entries.filter(x=>!x.found),entries,imageLoadFailures:[...imageMisses]};
    }
  };
})();


/* Gain Focus Cassidy home-training compatibility repair (2026-10-29).
 * External module so existing v4.0.73+ bundled app is preserved.
 * Accepts only explicit safe inline exercise images; never guesses an exercise photo.
 * Blank client weight renders a pending state, never a fictitious measurement.
 */
(function(){
  'use strict';
  if (window.__gfCassidyHomeRepair20261029) return;
  window.__gfCassidyHomeRepair20261029 = true;

  const previousVisual=window.exerciseVisual;
  if (typeof previousVisual === 'function') {
    window.exerciseVisual=function(e,large){
      const src=typeof e?.imageSrc==='string'?e.imageSrc.trim():'';
      if(src.length<=200000 && /^data:image\/(?:webp|png|jpeg|svg\+xml);base64,[a-zA-Z0-9+/=]+$/.test(src)){
        const safeName=String(e?.name||'Exercise').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        return '<span class="gf-photo-exercise gf-photo-custom'+(large?' large':'')+'"><img class="exercise-stock gf-real-ex-image'+(large?' large':'')+'" src="'+src+'" alt="'+safeName+' demonstration" loading="lazy" decoding="async"></span>';
      }
      return previousVisual.apply(this,arguments);
    };
  }

  const originalRenderProgress=window.renderProgress;
  if(typeof originalRenderProgress==='function'){
    window.renderProgress=function(){
      const hasClient=typeof plan!=='undefined' && plan && plan.client;
      if(!hasClient)return originalRenderProgress.apply(this,arguments);
      const w=typeof latestWeight==='function'?Number(latestWeight()):NaN;
      if(!Number.isFinite(w)||w<=0){
        const host=document.getElementById('progress');
        if(host)host.innerHTML='<div class="card glass hero" role="status"><div class="eyebrow">Analysis</div><h2>Measurements pending</h2><p class="muted">Add your height and weight in your profile to unlock your weight trend and body-composition analysis. Your workouts and nutrition plan are ready to use.</p></div>';
        return;
      }
      return originalRenderProgress.apply(this,arguments);
    };
    const recoverErrorPanel=()=>{
      const host=document.getElementById('progress');
      if(host && /Couldn.t load this section/.test(host.textContent||'') && typeof renderModuleSafe==='function'){
        renderModuleSafe('progress','Progress',window.renderProgress);
      }
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',recoverErrorPanel,{once:true});
    else recoverErrorPanel();
  }
})();
