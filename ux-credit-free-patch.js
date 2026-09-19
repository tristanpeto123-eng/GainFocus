// Gain Focus · credit-free UX pass v1
(function(){
  const MARK='gf-ux-credit-free-v1';

  function installStyles(){
    if(document.getElementById(MARK))return;
    const s=document.createElement('style');
    s.id=MARK;
    s.textContent=`
      :root{--gf-ux-safe-bottom:max(12px,env(safe-area-inset-bottom))}
      body.gf-ux-polish .screen.active{padding-bottom:calc(106px + env(safe-area-inset-bottom))}
      body.gf-ux-polish .nav{padding-bottom:var(--gf-ux-safe-bottom)!important;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
      body.gf-ux-polish .nav button{min-height:54px;touch-action:manipulation}
      body.gf-ux-polish .btn,body.gf-ux-polish button,body.gf-ux-polish .exercise-preview-row{min-height:44px}
      body.gf-ux-polish .coach-home{min-height:calc(100dvh - 132px);height:auto!important;padding-bottom:calc(88px + env(safe-area-inset-bottom))!important;gap:8px}
      body.gf-ux-polish .coach-home-top{padding-top:4px!important}
      body.gf-ux-polish .coach-home-greeting{margin:6px 0 4px!important;font-size:clamp(25px,7vw,34px)!important;line-height:1.05!important}
      body.gf-ux-polish .coach-home-prompt{margin:6px auto 2px!important;max-width:36rem}
      body.gf-ux-polish .coach-portrait-button{flex:0 1 auto!important;min-height:0!important;margin:0 auto!important}
      body.gf-ux-polish .coach-portrait-shell{width:min(47vw,208px)!important;height:min(47vw,208px)!important;max-width:208px!important;max-height:208px!important}
      .gf-ux-today-panel{width:min(100%,680px);margin:2px auto 6px;padding:10px;border-radius:22px;background:linear-gradient(180deg,rgba(13,24,43,.88),rgba(8,16,30,.92));border:1px solid rgba(113,190,255,.14);box-shadow:0 14px 36px rgba(0,0,0,.16)}
      .gf-ux-next{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:4px 3px 10px}
      .gf-ux-next-copy{min-width:0}
      .gf-ux-next-copy span{display:block;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.09em;font-weight:800}
      .gf-ux-next-copy b{display:block;margin-top:3px;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .gf-ux-next .btn{flex:0 0 auto;padding:10px 13px!important;white-space:nowrap}
      .gf-ux-mini-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
      .gf-ux-mini{min-width:0;padding:9px 8px;border-radius:15px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.055);color:inherit;text-align:left}
      .gf-ux-mini span{display:block;color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.07em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .gf-ux-mini b{display:block;margin-top:4px;font-size:12px;line-height:1.2}
      .gf-ux-mini.good b{color:#84e8ca}.gf-ux-mini.due b{color:#ffd27a}
      .gf-ux-coach-fab{position:fixed;right:14px;bottom:calc(82px + env(safe-area-inset-bottom));z-index:65;display:none;align-items:center;gap:8px;min-height:46px;padding:0 14px;border-radius:999px;border:1px solid rgba(99,190,255,.24);background:linear-gradient(135deg,rgba(18,36,64,.96),rgba(8,22,39,.98));color:#eef7ff;box-shadow:0 14px 34px rgba(0,0,0,.34);font:800 11px/1 system-ui,-apple-system,sans-serif;letter-spacing:.02em}
      .gf-ux-coach-fab .star{color:#74d8ff;font-size:15px}
      body.gf-ux-polish:not(.coach-home-active) .gf-ux-coach-fab{display:flex}
      body.gf-ux-polish .progress-muscle-card{margin-top:0!important;box-shadow:0 18px 45px rgba(0,0,0,.17)!important}
      body.gf-ux-polish #progress>.progress-overview{margin-top:10px}
      body.gf-ux-polish .progress-info-card{opacity:.86}
      body.gf-ux-polish #checkin .hero{padding-top:16px!important;padding-bottom:16px!important}
      body.gf-ux-polish #checkin .hero h2{font-size:clamp(26px,7vw,34px)!important}
      body.gf-ux-polish .training-launch{margin-top:0!important}
      @media(max-width:390px){
        .gf-ux-today-panel{padding:9px;border-radius:19px}
        .gf-ux-next{align-items:flex-end}
        .gf-ux-next-copy b{font-size:14px}
        .gf-ux-mini{padding:8px 6px}.gf-ux-mini b{font-size:11px}
        body.gf-ux-polish .coach-portrait-shell{width:min(43vw,176px)!important;height:min(43vw,176px)!important}
      }
    `;
    document.head.appendChild(s);
    document.body.classList.add('gf-ux-polish');
  }

  function todayPanel(){
    let active=null,today=null,session=null;
    try{active=typeof gfActiveWorkout==='function'?gfActiveWorkout():null}catch(e){}
    try{today=typeof gfTodayWorkout==='function'?gfTodayWorkout():null}catch(e){}
    try{session=active?plan?.training?.sessions?.find(x=>x.id===active.sessionId):today}catch(e){}
    const label=active?'Resume workout':session?'Start workout':'View training';
    const title=session?.name||plan?.training?.name||'Training plan';
    const action=session?`startWorkout('${session.id}')`:`showTab('train')`;

    let totals={calories:0,protein:0};
    try{totals=typeof nutritionTotals==='function'?nutritionTotals():totals}catch(e){}
    const calTarget=Number(plan?.nutrition?.calories)||0;
    const proteinTarget=Number(plan?.nutrition?.proteinG)||0;
    const calLeft=calTarget?Math.max(0,Math.round(calTarget-(Number(totals.calories)||0))):0;
    const proteinLeft=proteinTarget?Math.max(0,Math.round(proteinTarget-(Number(totals.protein)||0))):0;
    let checkDone=false;
    try{checkDone=typeof hasThisWeekCheckin==='function'&&hasThisWeekCheckin()}catch(e){}

    return `
      <section class="gf-ux-today-panel" aria-label="Today's priorities">
        <div class="gf-ux-next">
          <div class="gf-ux-next-copy"><span>Next action</span><b>${typeof esc==='function'?esc(title):title}</b></div>
          <button class="btn primary" type="button" onclick="${action}">${label}</button>
        </div>
        <div class="gf-ux-mini-grid">
          <button class="gf-ux-mini" type="button" onclick="showTab('train')"><span>Training</span><b>${session?'Ready today':'Plan ready'}</b></button>
          <button class="gf-ux-mini" type="button" onclick="showTab('nutrition')"><span>Nutrition</span><b>${calTarget?calLeft+' kcal left':proteinLeft+' g protein'}</b></button>
          <button class="gf-ux-mini ${checkDone?'good':'due'}" type="button" onclick="showTab('checkin')"><span>Check-in</span><b>${checkDone?'Complete':'Due this week'}</b></button>
        </div>
      </section>`;
  }

  function enhanceToday(){
    const root=document.getElementById('gfCoachHome');
    if(!root||root.querySelector('.gf-ux-today-panel'))return;
    const portrait=root.querySelector('.coach-portrait-button');
    if(portrait)portrait.insertAdjacentHTML('afterend',todayPanel());
  }

  function enhanceProgress(){
    const root=document.getElementById('progress');
    if(!root)return;
    const map=root.querySelector('.progress-muscle-card');
    const overview=root.querySelector('.progress-overview');
    if(map&&overview&&map.nextElementSibling!==overview)root.insertBefore(map,overview);
  }

  function installCoachButton(){
    if(document.querySelector('.gf-ux-coach-fab'))return;
    const b=document.createElement('button');
    b.type='button';b.className='gf-ux-coach-fab';
    b.innerHTML='<span class="star">✦</span><span>Ask Hercules</span>';
    b.setAttribute('aria-label','Ask Hercules');
    b.onclick=function(){showTab('today');setTimeout(()=>document.getElementById('gfCoachInput')?.focus(),180)};
    document.body.appendChild(b);
  }

  function afterRender(){
    installStyles();installCoachButton();
    try{if(currentTab==='today')enhanceToday();if(currentTab==='progress')enhanceProgress()}catch(e){console.warn('Gain Focus UX polish skipped',e)}
  }

  function wrap(){
    if(typeof renderToday==='function'&&!renderToday.__gfUxWrapped){
      const base=renderToday;
      const wrapped=function(){base.apply(this,arguments);requestAnimationFrame(enhanceToday)};
      wrapped.__gfUxWrapped=true;renderToday=wrapped;
    }
    if(typeof renderProgress==='function'&&!renderProgress.__gfUxWrapped){
      const base=renderProgress;
      const wrapped=function(){base.apply(this,arguments);requestAnimationFrame(enhanceProgress)};
      wrapped.__gfUxWrapped=true;renderProgress=wrapped;
    }
    if(typeof showTab==='function'&&!showTab.__gfUxWrapped){
      const base=showTab;
      const wrapped=function(){base.apply(this,arguments);requestAnimationFrame(afterRender)};
      wrapped.__gfUxWrapped=true;showTab=wrapped;
    }
  }

  installStyles();installCoachButton();wrap();setTimeout(afterRender,0);
})();
