/* GainFocus pre-entry photo readiness + workout spinners v1.1.
   Preserves owner-approved photographic artwork. Never substitutes new imagery. */
(function(){
  'use strict';
  const VERSION='gf-photo-gate-v1.3';
  const INDEX='./exercise-photo-index-v2.json';
  const CACHE='gain-focus-photo-thumbs-v2-local-5';
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
  let offlineMode=false;
  let externalAbort=null;
  let resolveOfflineChoice=null;
  let pingController=null;
  let pingAttempt=0;
  const PING_MS=3000;
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
    '.gf-offline-choice[hidden]{display:none!important}',
    '.gf-offline-choice{display:flex;flex-direction:column;gap:11px;align-items:stretch;text-align:center;width:100%;border-top:1px solid #345470;padding-top:15px;margin-top:3px}',
    '.gf-offline-choice p{margin:0;color:#d3e8f7;font-size:13px;line-height:1.5}',
    '.gf-offline-controls{display:flex;gap:9px;justify-content:center;flex-wrap:wrap}',
    '.gf-offline-controls .gf-photo-btn{flex:1;min-width:125px}',
    '.gf-offline-notice{position:fixed;z-index:990;left:10px;right:10px;top:calc(env(safe-area-inset-top,0px) + 9px);border:1px solid #5c8aad;background:#112c44;color:#f0f9ff;border-radius:13px;padding:10px 13px;display:flex;align-items:center;gap:12px;box-shadow:0 10px 30px #0008;font:600 12px/1.4 system-ui,sans-serif}',
    '.gf-offline-notice span{flex:1}',
    '.gf-offline-notice button{border:1px solid #84cef1;border-radius:9px;color:#f1fbff;background:#1a4663;padding:9px;min-height:38px;font-weight:700}',
    '.gf-photo-surface{position:relative!important}',
    '.gf-photo-surface>.gf-photo-screen-loader{position:absolute;z-index:80;inset:0;min-height:0;display:flex;align-items:center;justify-content:center;background:transparent;pointer-events:none}',
    '.gf-photo-screen-loader .gf-photo-small-inner{display:flex;align-items:center;flex-direction:column;gap:10px;text-align:center;padding:0;color:#dfefff;font:700 13px/1.4 system-ui,sans-serif}',
    '.gf-photo-screen-loader .gf-photo-spinner{width:29px;height:29px}',
    '.gf-photo-screen-loader button{pointer-events:auto;margin-top:6px}',
    '.gf-photo-screen-loader [hidden]{display:none!important}',
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
    const choice=el('div','gf-offline-choice');
    choice.id='gfOfflineChoice';
    choice.hidden=true;
    const warning=el('p');
    warning.id='gfOfflineWarning';
    warning.textContent='Your connection is slow or unavailable. You can continue offline, but some photos and other media may not load.';
    const controls=el('div','gf-offline-controls');
    const offlineButton=el('button','gf-photo-btn');
    offlineButton.id='gfContinueOffline';
    offlineButton.type='button';
    offlineButton.textContent='Continue offline';
    const retryPing=el('button','gf-photo-btn');
    retryPing.id='gfRetryConnection';
    retryPing.type='button';
    retryPing.textContent='Retry connection';
    controls.append(offlineButton,retryPing);choice.append(warning,controls);
    card.append(spinner(),heading,info,count,bar,choice,action);
    main.appendChild(card);document.body.appendChild(main);
    currentGate={main,heading,info,count,fill,action,choice,warning,offlineButton,retryPing};
    offlineButton.onclick=continueOffline;
    retryPing.onclick=()=>checkConnection();
    const boot=document.getElementById('gfPhotoBoot');
    if(boot)boot.remove(); // only after the runtime gate is already visible
    startPhrases(currentGate);
    return currentGate;
  }
  function showOfflineChoice(message){
    if(offlineMode)return;
    const g=currentGate;
    if(!g){if(preloaded)showRuntimeOfflineChoice(message);return;}
    g.warning.textContent=message||
      'Your connection is slow or unavailable. You can continue offline, but some photos and other media may not load.';
    g.choice.hidden=false;
  }
  function dismissOfflineChoice(){
    if(currentGate)currentGate.choice.hidden=true;
    document.getElementById('gfRuntimeOfflinePrompt')?.remove();
  }
  function showRuntimeOfflineChoice(message){
    if(offlineMode||!preloaded)return;
    let box=document.getElementById('gfRuntimeOfflinePrompt');
    if(!box){
      box=el('aside','gf-offline-notice');
      box.id='gfRuntimeOfflinePrompt';
      box.setAttribute('role','alert');
      const copy=el('span');
      copy.id='gfRuntimeConnectionMessage';
      const continueButton=el('button');
      continueButton.type='button';
      continueButton.textContent='Continue offline';
      continueButton.onclick=continueOffline;
      const retry=el('button');
      retry.type='button';
      retry.textContent='Retry';
      retry.onclick=checkConnection;
      box.append(copy,continueButton,retry);
      document.body.appendChild(box);
    }
    box.querySelector('#gfRuntimeConnectionMessage').textContent=message||
      'Connection is slow or unavailable. Continue offline? Some photos and other media may not load.';
  }
  function showOfflineNotice(){
    if(document.getElementById('gfOfflineNotice'))return;
    const notice=el('aside','gf-offline-notice');
    notice.id='gfOfflineNotice';
    notice.setAttribute('role','status');
    const copy=el('span');
    copy.textContent='Offline mode · Some photos and other media may not load.';
    const retry=el('button');
    retry.type='button';
    retry.textContent='Try online';
    retry.onclick=()=>location.reload();
    notice.append(copy,retry);
    document.body.appendChild(notice);
  }
  function continueOffline(){
    if(offlineMode)return;
    offlineMode=true;
    document.getElementById('gfRuntimeOfflinePrompt')?.remove();
    if(pingController)pingController.abort();
    stopPhrases();
    if(currentGate?.main?.isConnected)currentGate.main.remove();
    currentGate=null;
    showOfflineNotice();
    if(resolveOfflineChoice){const finish=resolveOfflineChoice;resolveOfflineChoice=null;finish(true);}
    if(externalAbort)externalAbort.abort();
  }
  async function checkConnection(){
    if(offlineMode)return false;
    if(navigator.onLine===false){
      showOfflineChoice('No internet connection detected. Continue offline? Some photos and other media may not load.');
      return false;
    }
    const id=++pingAttempt;
    if(pingController)pingController.abort();
    const controller=new AbortController();
    pingController=controller;
    const handle=setTimeout(()=>controller.abort(),PING_MS);
    try{
      const url=new URL('./manifest.webmanifest',document.baseURI);
      url.searchParams.set('gf_probe',String(Date.now())+'-'+id);
      const response=await fetch(url.href,{cache:'no-store',credentials:'same-origin',signal:controller.signal});
      if(!response.ok)throw new Error('Health check failed');
      if(!offlineMode&&id===pingAttempt)dismissOfflineChoice();
      return true;
    }catch(error){
      if(!offlineMode&&id===pingAttempt)
        showOfflineChoice('The connection check failed or took longer than 3 seconds. Continue offline? Some photos and other media may not load.');
      return false;
    }finally{
      clearTimeout(handle);
      if(pingController===controller)pingController=null;
    }
  }
  window.addEventListener('offline',()=>{
    if(offlineMode){showOfflineNotice();return;}
    showOfflineChoice('Internet connection lost. Continue offline? Some photos and other media may not load.');
  });
  window.addEventListener('online',()=>{if(!offlineMode)checkConnection();});
  // Low-frequency health check while the app is being used. Do not ping
  // invisibly in the background, and never switch modes without permission.
  setInterval(()=>{
    if(!offlineMode&&preloaded&&document.visibilityState==='visible')checkConnection();
  },30000);
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
  async function preloadAll(onProgress,outerSignal){
    if(!window.GFExerciseThumbsV2)throw new Error('Exercise photo library did not load');
    await abortable(window.GFExerciseThumbsV2.ready,outerSignal);
    if(outerSignal.aborted)throw new Error('Offline mode selected');
    const response=await fetch(INDEX,{credentials:'same-origin',cache:'force-cache',signal:outerSignal});
    if(!response.ok)throw new Error('Exercise index unavailable');
    const rows=await response.json();
    if(!Array.isArray(rows)||rows.length!==873)throw new Error('Incomplete photo index: expected 873');
    let cache=null;
    try{if('caches' in window)cache=await caches.open(CACHE);}
    catch(error){console.warn('GainFocus cache unavailable',error);}
    for(let attempt=0;attempt<=MAX_RESTARTS;attempt++){
      if(outerSignal.aborted)throw new Error('Offline mode selected');
      const pending=rows.filter(item=>!verifiedPaths.has(item[1]));
      if(!pending.length)break;
      const controller=new AbortController();
      const cancel=()=>controller.abort();
      outerSignal.addEventListener('abort',cancel,{once:true});
      if(outerSignal.aborted)controller.abort();
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
      finally{
        active=false;clearInterval(interval);
        outerSignal.removeEventListener('abort',cancel);
        controller.abort();
      }
      if(outerSignal.aborted)throw new Error('Offline mode selected');
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
    if(preloaded||offlineMode)return Promise.resolve(true);
    if(entryPromise)return entryPromise;
    const g=showGate();
    g.action.hidden=true;
    g.main.setAttribute('aria-busy','true');
    if(phraseTimer===null)startPhrases(g);
    const controller=new AbortController();
    externalAbort=controller;
    const offlineChosen=new Promise(resolve=>{resolveOfflineChoice=resolve;});
    // This check runs independently of the photo requests, so cached photos
    // cannot mask a genuinely failed or >3 s network health check.
    checkConnection();
    const onlineLoading=(async()=>{
      try{
        const result=await preloadAll((done,total,failed,retries)=>{
          if(!currentGate||currentGate!==g||offlineMode)return;
          const percent=Math.round(done/total*100);
          g.count.textContent=percent+'% ready'+(retries?' · reconnecting':'');
          g.fill.style.width=(done/total*100).toFixed(2)+'%';
          if(retries>0){
            showOfflineChoice('Photos are loading slowly. Continue offline? Some photos and other media may not load.');
          }
        },controller.signal);
        if(offlineMode)return true;
        if(result.loaded!==result.total)throw new Error('Not all photos have loaded');
        preloaded=true;
        if(pingController)pingController.abort();
        stopPhrases();
        if(g.main.isConnected)g.main.remove();
        if(currentGate===g)currentGate=null;
        // Continue checking live connectivity even after cached media loaded.
        if(navigator.onLine===false)showRuntimeOfflineChoice(
          'No internet connection detected. Continue offline? Some photos and other media may not load.');
        else checkConnection();
        return true;
      }catch(error){
        if(offlineMode)return true;
        console.warn('GainFocus photo gate',error);
        stopPhrases();
        g.heading.textContent='Loading interrupted';
        g.info.textContent=error.message||'Unable to finish loading. Please retry.';
        g.action.hidden=false;
        g.main.setAttribute('aria-busy','false');
        showOfflineChoice('Loading could not finish. Continue offline? Some photos and other media may not load.');
        entryPromise=null;
        return false;
      }
    })();
    entryPromise=Promise.race([onlineLoading,offlineChosen]);
    g.action.onclick=()=>{entryPromise=null;beginPreload();};
    return entryPromise;
  }
  function enterWithImages(original,args,context){
    if(preloaded||offlineMode)return original.apply(context,args);
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
    const old=containerLocks.get(root);
    if(old?.overlay?.isConnected)old.overlay.remove();
    const imgs=[...root.querySelectorAll('img[data-gf-photo="v2"],img.exercise-stock')];
    if(!imgs.length)return;
    // The approved exercise tiles now own their own spinners. Do not cover the
    // workout list with an opaque card, duplicate spinner, or loading text.
    const useTileSpinners=imgs.every(img=>!!img.closest('.gf-photo-exercise'));
    const overlay=useTileSpinners?null:el('div','gf-photo-screen-loader');
    let heading=null,btn=null;
    if(overlay){
      const inner=el('div','gf-photo-small-inner');
      heading=el('div');
      heading.hidden=true;
      btn=el('button','gf-photo-btn');
      btn.type='button';btn.textContent='Retry photo';btn.hidden=true;
      inner.append(spinner(),heading,btn);
      overlay.appendChild(inner);
      root.classList.add('gf-photo-surface');
      root.appendChild(overlay);
    }
    const state={overlay,heading,btn};
    containerLocks.set(root,state);
    const check=async()=>{
      if(btn)btn.hidden=true;
      if(heading)heading.hidden=true;
      try{
        await Promise.all(imgs.map(img=>waitForImage(img)));
        if(containerLocks.get(root)===state)overlay?.remove();
      }catch(error){
        if(containerLocks.get(root)!==state)return;
        console.warn('GainFocus workout image wait',error);
        for(const img of imgs){
          const tile=img.closest('.gf-photo-loading');
          if(tile&&!img.naturalWidth){
            tile.classList.remove('gf-photo-loading');
            tile.classList.add('gf-photo-failed');
            tile.setAttribute('aria-label','Exercise photo unavailable');
          }
        }
        if(btn){
          heading.textContent='A photo could not load';
          heading.hidden=false;btn.hidden=false;
          btn.onclick=()=>{
            for(const img of imgs){
              if(!img.naturalWidth){
                const original=img.getAttribute('src');
                if(original)img.src=original;
              }
            }
            check();
          };
        }
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
    status:()=>({active:!!currentGate,loading:!!entryPromise,ready:preloaded,verified:verifiedPaths.size,offline:offlineMode}),
    checkConnection,continueOffline,
    checkWorkout:markContainerPending
  };
  // Gate immediately, before the original splash, login or main app becomes visible.
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>beginPreload(),{once:true});
  else beginPreload();
})();
