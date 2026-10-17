/* GainFocus pre-entry photo readiness + workout spinners v1.
   Preserves owner-approved photographic artwork. Never substitutes new imagery. */
(function(){
  'use strict';
  const VERSION='gf-photo-gate-v1';
  const INDEX='./exercise-photo-index-v2.json';
  const CACHE='gain-focus-photo-thumbs-v2-local-2';
  const CONCURRENCY=8;
  const TIMEOUT_MS=25000;
  let entryPromise=null;
  let currentGate=null;
  const containerLocks=new WeakMap();
  const style=document.createElement('style');
  style.id='gf-photo-readiness-css';
  style.textContent=[
    '@keyframes gf-photo-spin{to{transform:rotate(360deg)}}',
    '.gf-photo-spinner{width:36px;height:36px;border:3px solid rgba(119,202,243,.23);border-top-color:#88dcff;border-radius:50%;animation:gf-photo-spin .85s linear infinite;flex:none}',
    '.gf-photo-gate{position:fixed;inset:0;z-index:250;background:radial-gradient(circle at 50% 23%,#17304b,#070d1c 70%);display:flex;align-items:center;justify-content:center;padding:26px;color:#edf7ff;font:500 14px/1.5 system-ui,-apple-system,sans-serif}',
    '.gf-photo-gate-card{width:min(100%,430px);display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;border:1px solid #365471;background:rgba(11,25,43,.87);border-radius:25px;padding:32px 24px;box-shadow:0 32px 90px #0008}',
    '.gf-photo-gate h2{font:800 24px/1.15 system-ui,sans-serif;margin:0;color:#f2fbff}',
    '.gf-photo-gate p{font-size:13px;color:#a9c4d9;margin:0}',
    '.gf-photo-count{font-weight:800;font-size:16px;font-variant-numeric:tabular-nums}',
    '.gf-photo-progress{width:100%;height:7px;background:#22384e;border-radius:12px;overflow:hidden}',
    '.gf-photo-progress>span{display:block;height:100%;width:0;background:linear-gradient(90deg,#6d9aff,#8de5ff);transition:width .2s}',
    '.gf-photo-btn{border:1px solid #6bbce6;background:#14344f;color:#effaff;padding:11px 20px;min-height:44px;border-radius:12px;font-weight:700;cursor:pointer}',
    '.gf-photo-surface{position:relative!important}',
    '.gf-photo-surface>.gf-photo-screen-loader{position:absolute;z-index:80;inset:0;min-height:240px;display:flex;align-items:center;justify-content:center;background:rgba(5,15,29,.95);border-radius:inherit}',
    '.gf-photo-screen-loader .gf-photo-small-inner{display:flex;align-items:center;flex-direction:column;gap:12px;text-align:center;padding:22px;color:#dfefff;font:700 13px/1.4 system-ui,sans-serif}',
    '.gf-photo-screen-loader .gf-photo-spinner{width:29px;height:29px}',
    '.gf-photo-screen-loader button{margin-top:6px}',
    '@media(prefers-reduced-motion:reduce){.gf-photo-spinner{animation-duration:2s}.gf-photo-progress>span{transition:none}}'
  ].join('\n');
  (document.head||document.documentElement).appendChild(style);
  const pause=ms=>new Promise(r=>setTimeout(r,ms));
  function el(tag,cls){const node=document.createElement(tag);if(cls)node.className=cls;return node;}
  function spinner(){const d=el('span','gf-photo-spinner');d.setAttribute('role','status');d.setAttribute('aria-label','Loading photographs');return d;}
  function showGate(){
    if(currentGate)return currentGate;
    const main=el('section','gf-photo-gate');
    main.id='gfPhotoGate';main.setAttribute('role','status');main.setAttribute('aria-live','polite');
    const card=el('div','gf-photo-gate-card'),heading=el('h2'),info=el('p'),count=el('div','gf-photo-count'),bar=el('div','gf-photo-progress'),fill=el('span'),action=el('button','gf-photo-btn');
    heading.textContent='Preparing your training photos';
    info.textContent='Loading and checking all 873 exercise photographs before opening GainFocus.';
    count.textContent='0 / 873 ready';bar.appendChild(fill);action.type='button';action.textContent='Retry loading';action.hidden=true;
    card.append(spinner(),heading,info,count,bar,action);main.appendChild(card);document.body.appendChild(main);
    currentGate={main,info,count,fill,action};
    return currentGate;
  }
  async function decodeImage(bytes){
    const url=URL.createObjectURL(bytes);
    const img=new Image();img.decoding='async';img.src=url;
    try{await img.decode();if(img.naturalWidth<5||img.naturalHeight<5)throw new Error('Image dimensions unavailable');}
    finally{img.removeAttribute('src');URL.revokeObjectURL(url);}
  }
  async function downloadAndDecode(path,cache){
    const rel=path.split('/').map(encodeURIComponent).join('/');
    const url=new URL('./exercise-photos/'+rel,document.baseURI).href;
    let response=cache?await cache.match(url):null;
    if(!response)response=await fetch(url,{credentials:'same-origin',cache:'force-cache'});
    if(!response||!response.ok)throw new Error('Image request failed: '+path);
    const bytes=await response.blob();
    if(!bytes.type.startsWith('image/') && !/\.(jpe?g|png|webp)$/i.test(path))throw new Error('Unexpected image type: '+path);
    await decodeImage(bytes);
    if(cache && !(await cache.match(url))){
      try{await cache.put(url,new Response(bytes,{headers:{'Content-Type':bytes.type||'image/jpeg'}}));}
      catch(error){console.warn('GainFocus photo cache storage unavailable',error);}
    }
  }
  async function preloadAll(onProgress){
    if(!window.GFExerciseThumbsV2)throw new Error('Exercise photo library did not load');
    await window.GFExerciseThumbsV2.ready;
    const response=await fetch(INDEX,{credentials:'same-origin',cache:'force-cache'});
    if(!response.ok)throw new Error('Exercise index unavailable');
    const rows=await response.json();
    if(!Array.isArray(rows)||rows.length!==873)throw new Error('Incomplete photo index: expected 873');
    let cache=null;
    try{if('caches' in window)cache=await caches.open(CACHE);}catch(error){console.warn('GainFocus cache unavailable',error);}
    let next=0,done=0;
    const failed=[];
    const worker=async()=>{
      while(next<rows.length){
        const current=rows[next++], name=current[0], path=current[1];
        try{
          if(!/^[a-zA-Z0-9_()\-]+\/\d+\.(?:jpg|png|webp)$/i.test(path))throw new Error('Invalid photo path');
          await Promise.race([downloadAndDecode(path,cache),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Photo timed out')),TIMEOUT_MS))]);
        }catch(error){failed.push({name,path,error:String(error)});}
        done++;onProgress(done,rows.length,failed.length);
      }
    };
    await Promise.all(Array.from({length:CONCURRENCY},worker));
    if(failed.length)throw Object.assign(new Error(failed.length+' exercise photos could not load; check your connection and retry.'),{failed});
    return {loaded:done,total:rows.length,cacheEnabled:!!cache};
  }
  function enterWithImages(original,args,context){
    if(entryPromise)return entryPromise;
    const g=showGate();
    const load=async()=>{
      g.action.hidden=true;g.main.setAttribute('aria-busy','true');
      g.info.textContent='Loading and checking all exercise photographs before opening GainFocus.';
      try{
        const result=await preloadAll((done,total,failed)=>{
          g.count.textContent=done+' / '+total+' checked'+(failed?' · '+failed+' failed':'');
          g.fill.style.width=(done/total*100).toFixed(2)+'%';
        });
        g.info.textContent=result.loaded+' photographs ready.';
        g.main.remove();currentGate=null;
        return original.apply(context,args);
      }catch(error){
        console.warn('GainFocus photo entry gate',error);
        g.info.textContent=error.message||'Could not load photographs.';
        g.action.hidden=false;g.main.setAttribute('aria-busy','false');
        entryPromise=null;
        return null;
      }
    };
    g.action.onclick=()=>{entryPromise=load();};
    return entryPromise=load();
  }
  function waitForImage(img,timeout=TIMEOUT_MS){
    if(!img.isConnected)return Promise.resolve();
    img.loading='eager';
    return new Promise((resolve,reject)=>{
      let ended=false;
      const finish=(err)=>{if(ended)return;ended=true;clearTimeout(timer);img.removeEventListener('load',changed);img.removeEventListener('error',changed);if(err)reject(err);else resolve();};
      const changed=()=>{if(img.complete&&img.naturalWidth>0){img.decode().then(()=>finish(),()=>{});} };
      const timer=setTimeout(()=>finish(new Error('Workout photo loading timed out')),timeout);
      img.addEventListener('load',changed);
      img.addEventListener('error',changed);
      changed();
      // Catch already loaded/failed fallback replacements without getting stuck.
      const poll=async()=>{for(let t=0;t<timeout/180&&!ended;t++){changed();await pause(180);}};
      poll();
    });
  }
  function markContainerPending(root,label){
    if(!root)return;
    let entry=containerLocks.get(root);
    if(entry?.overlay?.isConnected)entry.overlay.remove();
    const overlay=el('div','gf-photo-screen-loader'),inner=el('div','gf-photo-small-inner'),heading=el('div'),btn=el('button','gf-photo-btn');
    heading.textContent=label||'Loading workout photos';
    btn.type='button';btn.textContent='Retry photos';btn.hidden=true;
    inner.append(spinner(),heading,btn);overlay.appendChild(inner);root.classList.add('gf-photo-surface');root.appendChild(overlay);
    const state={overlay,heading,btn};containerLocks.set(root,state);
    const check=async()=>{
      btn.hidden=true;heading.textContent=label||'Loading workout photos';
      try{
        const imgs=[...root.querySelectorAll('img[data-gf-photo="v2"],img.exercise-stock')];
        await Promise.all(imgs.map(i=>waitForImage(i)));
        if(containerLocks.get(root)!==state)return;
        overlay.remove();
      }catch(error){
        if(containerLocks.get(root)!==state)return;
        heading.textContent='Some workout photos are not ready';
        btn.hidden=false;btn.onclick=()=>check();
        console.warn('GainFocus workout image wait',error);
      }
    };
    check();
  }
  function wrap(name,runner){
    const original=window[name];
    if(typeof original!=='function'||original.__gfPhotoGate)return false;
    const wrapped=function(){return runner.call(this,original,Array.from(arguments));};
    wrapped.__gfPhotoGate=true;
    window[name]=wrapped;
    return true;
  }
  wrap('enterApp',function(original,args){return enterWithImages(original,args,this);});
  wrap('showTab',function(original,args){
    const r=original.apply(this,args);
    if(args[0]==='train')markContainerPending(document.getElementById('train'),'Loading workout previews');
    return r;
  });
  for(const method of ['openSession','startWorkout','openExerciseGuide']){
    wrap(method,function(original,args){
      const r=original.apply(this,args);
      markContainerPending(document.getElementById('sessionSheet'),'Loading exercise photos');
      return r;
    });
  }
  window.GainFocusPhotoReadiness={version:VERSION,preloadAll,status:()=>({active:!!currentGate,loading:!!entryPromise}),checkWorkout:markContainerPending};
})();
