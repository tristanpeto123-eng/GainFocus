/* GainFocus pre-entry photo readiness + workout spinners v1.1.
   Preserves owner-approved photographic artwork. Never substitutes new imagery. */
(function(){
  'use strict';
  const VERSION='gf-photo-gate-v1.2';
  const INDEX='./exercise-photo-index-v2.json';
  const CACHE='gain-focus-photo-thumbs-v2-local-4';
  const CONCURRENCY=8;
  const STALL_MS=3000; // restart only after 3 seconds with no image progress
  const MAX_RESTARTS=3;
  const PHRASES=['Loading content','Warming up','Getting ready','Preparing your workouts','Almost there'];
  const TIPS=[
    'Tip: Log your meals in Food Diary to track daily nutrition.',
    'Tip: Scan a food barcode to find nutrition information faster.',
    'Tip: Confirm the amount you actually ate before saving a meal.',
    'Tip: Open Training to see your planned exercises.',
    'Tip: Track changes over time in your training records.',
    'Tip: Tap an exercise to see its demonstration photo.'
  ];
  const verifiedPaths=new Set();
  let preloaded=false;
  let phraseTimer=null;
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
  function stopPhrases(){if(phraseTimer!==null){clearInterval(phraseTimer);phraseTimer=null;}}
  function startPhrases(g){
    stopPhrases();
    let headingIndex=0,tipIndex=0;
    g.heading.textContent=PHRASES[0];
    g.info.textContent=TIPS[0];
    phraseTimer=setInterval(()=>{
      if(currentGate!==g||!g.main.isConnected){stopPhrases();return;}
      g.heading.textContent=PHRASES[(++headingIndex)%PHRASES.length];
      if(headingIndex%3===0)g.info.textContent=TIPS[(++tipIndex)%TIPS.length];
    },1450);
  }
  function showGate(){
    if(currentGate)return currentGate;
    const main=el('section','gf-photo-gate');
    main.id='gfPhotoGate';main.setAttribute('role','status');main.setAttribute('aria-live','polite');
    const card=el('div','gf-photo-gate-card'),heading=el('h2'),info=el('p'),count=el('div','gf-photo-count'),bar=el('div','gf-photo-progress'),fill=el('span'),action=el('button','gf-photo-btn');
    heading.textContent=PHRASES[0];
    info.textContent=TIPS[0];
    count.textContent='0% ready';bar.appendChild(fill);action.type='button';action.textContent='Retry loading';action.hidden=true;
    card.append(spinner(),heading,info,count,bar,action);main.appendChild(card);document.body.appendChild(main);
    currentGate={main,heading,info,count,fill,action};
    const boot=document.getElementById('gfPhotoBoot');
    if(boot)boot.remove(); // only after the runtime gate is already visible
    startPhrases(currentGate);
    return currentGate;
  }
  function abortable(promise,signal){
    if(signal.aborted)return Promise.reject(new Error('Load reinitialised'));
    return new Promise((resolve,reject)=>{
      const abort=()=>reject(new Error('Load reinitialised'));
      signal.addEventListener('abort',abort,{once:true});
      Promise.resolve(promise).then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));
    });
  }
  async function decodeImage(bytes,signal){
    if(signal.aborted)throw new Error('Load reinitialised');
    const url=URL.createObjectURL(bytes),img=new Image();
    img.decoding='async';
    const stop=()=>{img.removeAttribute('src');URL.revokeObjectURL(url);};
    try{
      img.src=url;
      await abortable(img.decode(),signal);
      if(signal.aborted||img.naturalWidth<5||img.naturalHeight<5)throw new Error('Image dimensions unavailable');
    }finally{stop();}
  }
  async function downloadAndDecode(path,cache,signal){
    const rel=path.split('/').map(encodeURIComponent).join('/');
    const url=new URL('./exercise-photos/'+rel,document.baseURI).href;
    const cached=cache?await abortable(cache.match(url),signal):null;
    const response=cached||await fetch(url,{credentials:'same-origin',cache:'force-cache',signal});
    if(signal.aborted)throw new Error('Load reinitialised');
    if(!response||!response.ok)throw new Error('Image request failed: '+path);
    const bytes=await abortable(response.blob(),signal);
    if(signal.aborted)throw new Error('Load reinitialised');
    if(!bytes.type.startsWith('image/')&&!/\.(jpe?g|png|webp)$/i.test(path))throw new Error('Unexpected image type: '+path);
    await decodeImage(bytes,signal);
    if(cache&&!cached&&!signal.aborted){
      // Cache storage may be quota-limited: decoding is the readiness requirement.
      try{await abortable(cache.put(url,new Response(bytes,{headers:{'Content-Type':bytes.type||'image/jpeg'}})),signal);}
      catch(error){if(!signal.aborted)console.warn('GainFocus photo cache storage unavailable',error);}
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
    try{if('caches' in window)cache=await caches.open(CACHE);}
    catch(error){console.warn('GainFocus cache unavailable',error);}
    for(let attempt=0;attempt<=MAX_RESTARTS;attempt++){
      const pending=rows.filter(item=>!verifiedPaths.has(item[1]));
      if(!pending.length)break;
      const controller=new AbortController();
      let next=0,active=true,lastProgress=Date.now();
      const failed=[];
      const interval=setInterval(()=>{
        if(active&&verifiedPaths.size<rows.length&&Date.now()-lastProgress>=STALL_MS){
          controller.abort(); // cancels network/decode waits for all in-flight images
        }
      },100);
      const worker=async()=>{
        while(next<pending.length&&!controller.signal.aborted){
          const [name,path]=pending[next++];
          try{
            if(!/^[a-zA-Z0-9_()\x2d]+\/\d+\.(?:jpg|png|webp)$/i.test(path))throw new Error('Invalid photo path');
            await downloadAndDecode(path,cache,controller.signal);
            if(controller.signal.aborted)break;
            verifiedPaths.add(path);
            lastProgress=Date.now();
            onProgress(verifiedPaths.size,rows.length,0,attempt);
          }catch(error){
            if(controller.signal.aborted)break;
            failed.push({name,path,error:String(error)});
          }
        }
      };
      try{await Promise.all(Array.from({length:CONCURRENCY},worker));}
      finally{active=false;clearInterval(interval);controller.abort();}
      if(verifiedPaths.size===rows.length)break;
      if(attempt<MAX_RESTARTS){
        onProgress(verifiedPaths.size,rows.length,failed.length,attempt+1);
        // Reinitialise ONLY unfinished images; already decoded photos remain ready.
        await pause(150);
      }else{
        throw new Error('Loading stalled or '+(rows.length-verifiedPaths.size)+' photos unavailable after '+(MAX_RESTARTS+1)+' attempts. Retry loading.');
      }
    }
    return {loaded:verifiedPaths.size,total:rows.length,cacheEnabled:!!cache};
  }
  function beginPreload(){
    if(preloaded)return Promise.resolve(true);
    if(entryPromise)return entryPromise;
    const g=showGate();
    g.action.hidden=true;
    g.main.setAttribute('aria-busy','true');
    if(phraseTimer===null)startPhrases(g);
    entryPromise=(async()=>{
      try{
        const result=await preloadAll((done,total,failed,retries)=>{
          if(!currentGate||currentGate!==g)return;
          const percent=Math.round(done/total*100);
          g.count.textContent=percent+'% ready'+(retries?' · reconnecting':'');
          g.fill.style.width=(done/total*100).toFixed(2)+'%';
        });
        if(result.loaded!==result.total)throw new Error('Not all photos have loaded');
        preloaded=true;
        stopPhrases();
        if(g.main.isConnected)g.main.remove();
        if(currentGate===g)currentGate=null;
        return true;
      }catch(error){
        console.warn('GainFocus photo gate',error);
        stopPhrases();
        g.heading.textContent='Loading interrupted';
        g.info.textContent=error.message||'Unable to finish loading. Please retry.';
        g.action.hidden=false;
        g.main.setAttribute('aria-busy','false');
        entryPromise=null;
        return false;
      }
    })();
    g.action.onclick=()=>{beginPreload();};
    return entryPromise;
  }
  function enterWithImages(original,args,context){
    if(preloaded)return original.apply(context,args);
    return beginPreload().then(ready=>ready?original.apply(context,args):null);
  }
  function waitForImage(img){
    if(!img.isConnected)return Promise.resolve();
    img.loading='eager';
    return new Promise((resolve,reject)=>{
      let complete=false,retries=0,last=Date.now(),decoding=false;
      const finish=(error)=>{
        if(complete)return;
        complete=true;clearInterval(interval);
        if(error)reject(error);else resolve();
      };
      const interval=setInterval(()=>{
        if(complete)return;
        if(!img.isConnected){finish();return;}
        // A decoded image is the actual success condition; an unresolved decode
        // promise counts as a stalled image, even when its network transfer finished.
        if(Date.now()-last>=STALL_MS){
          if(retries>=MAX_RESTARTS){finish(new Error('Exercise image stalled after automatic retries'));return;}
          retries++;last=Date.now();decoding=false;
          const src=img.getAttribute('src');
          if(src){
            // Reinitialise the same verified photo. Keep owner-approved image identity.
            try{
              const u=new URL(src,document.baseURI);
              if(u.origin===location.origin){
                u.searchParams.set('gfRetry',String(retries));
                img.src=u.href;
              }else img.src=src; // remote approved fallback only
            }catch(_error){img.src=src;}
          }
        }
        if(img.complete&&img.naturalWidth>0&&!decoding){
          decoding=true;
          img.decode().then(()=>finish(),()=>{decoding=false;});
        }
      },150);
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
  window.GainFocusPhotoReadiness={
    version:VERSION,preloadAll,
    status:()=>({active:!!currentGate,loading:!!entryPromise,ready:preloaded,verified:verifiedPaths.size}),
    checkWorkout:markContainerPending
  };
  // Gate immediately, before the original splash, login or main app becomes visible.
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>beginPreload(),{once:true});
  else beginPreload();
})();
