(function gainFocusPPL(w){
  'use strict';
  const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const ORDER=[1,2,3,4,5,6,0];
  const LABEL={push:'Push',pull:'Pull',legs:'Legs'};
  const clone=x=>JSON.parse(JSON.stringify(x));
  const uniq=a=>[...new Set((a||[]).map(Number).filter(n=>Number.isInteger(n)&&n>=0&&n<=6))];
  const sorted=a=>uniq(a).sort((a,b)=>ORDER.indexOf(a)-ORDER.indexOf(b));
  const html=s=>String(s==null?'':s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const group=e=>{
    if(['push','pull','legs'].includes(e?.splitGroup))return e.splitGroup;
    const s=(String(e?.name||'')+' '+String(e?.focus||'')+' '+String(e?.targetMuscles||'')).toLowerCase();
    if(/leg press|leg curl|leg extension|calf|squat|lunge|hamstring|glute|quadricep|quad\b|deadlift|romanian|hip thrust|hip abduc|hip adduc|good morning|step.up|split squat|hack squat|goblet/.test(s))return 'legs';
    if(/face pull|rear delt|reverse fly|back|lat\b|lats\b|row|pulldown|pull.up|chin.up|bicep|hammer curl|preacher|curl|shrug|rhomboid|trap\b/.test(s))return 'pull';
    if(/chest|bench|pec|tricep|push.up|pushdown|dip\b|overhead press|shoulder press|incline press|lateral raise|front raise|side delt|anterior delt|press/.test(s))return 'push';
    return null;
  };
  const role=s=>{
    if(['push','pull','legs'].includes(s?.splitGroup))return s.splitGroup;
    const t=String(s?.name||'').toLowerCase();
    return /^push\b/.test(t)?'push':/^pull\b/.test(t)?'pull':/^legs?\b/.test(t)?'legs':null;
  };
  function rebuild(input,count,weekdays){
    const source=Array.isArray(input)?input.filter(Boolean):[];
    count=Math.round(Number(count)||0);
    if(count<3||count>7)return {ok:false,errors:['Push / Pull / Legs needs 3–7 workout days.']};
    const pool={push:[],pull:[],legs:[]},unknown=[];
    for(const s of source)for(const e of s.exercises||[]){
      const k=group(e);
      if(!k){unknown.push(e.name||'Unnamed exercise');continue;}
      pool[k].push(clone(e));
    }
    if(unknown.length)return {ok:false,errors:['Assign a muscle group to: '+[...new Set(unknown)].join(', ')],unknown};
    const labels=sorted(weekdays);
    if(labels.length<count)return {ok:false,errors:['Select '+count+' unique workout days first.']};
    const slots=Array.from({length:count},(_,i)=>['push','pull','legs'][i%3]);
    for(const k of ['push','pull','legs']){
      const n=slots.filter(v=>v===k).length;
      if(pool[k].length<n)return {ok:false,errors:['Not enough '+LABEL[k]+' exercises for '+n+' '+LABEL[k]+' days; keep the workout count lower or add exercises.']};
    }
    const used=new Set(),newSessions=slots.map((k,i)=>{
      const candidates=source.filter(s=>role(s)===k && !used.has(s.id));
      const match=candidates.find(s=>(s.exercises||[]).every(e=>group(e)===k))||candidates[0];
      if(match)used.add(match.id);
      const base=match?clone(match):{};
      const suffix=slots.filter(x=>x===k).length>1?' '+String.fromCharCode(65+slots.slice(0,i+1).filter(x=>x===k).length-1):'';
      return {...base,id:match?.id||'gf74-'+k+'-'+(i+1),name:LABEL[k]+suffix,
        splitGroup:k,weekdayIndex:labels[i],dayLabel:DAYS[labels[i]],
        scheduleOrder:i,subtitle:({push:'Chest · Shoulders · Triceps',pull:'Back · Rear delts · Biceps',legs:'Quads · Glutes · Hamstrings · Calves'})[k],
        exercises:[]};
    });
    for(const k of ['push','pull','legs']){
      const targets=newSessions.filter(s=>s.splitGroup===k);
      pool[k].forEach((e,i)=>targets[i%targets.length].exercises.push(e));
    }
    return {ok:true,sessions:newSessions,errors:[]};
  }
  const sameSplit=ss=>Array.isArray(ss)&&ss.length>=3&&ss.every(s=>{
    const k=role(s);
    return k && (s.exercises||[]).length>0 && (s.exercises||[]).every(e=>group(e)===k);
  });
  const assign=(sessions,sessionId,toDay)=>{
    const copy=clone(sessions||[]),target=copy.find(s=>String(s.id)===String(sessionId)),day=Number(toDay);
    if(!target||!Number.isInteger(day)||day<0||day>6)return {ok:false,error:'Invalid workout or day.'};
    const old=Number(target.weekdayIndex);
    const other=copy.find(s=>s!==target&&Number(s.weekdayIndex)===day);
    if(other && (!Number.isInteger(old)||old<0||old>6))return {ok:false,error:'Source day not set; assign the original day first.'};
    if(other){other.weekdayIndex=old;other.dayLabel=DAYS[old];}
    target.weekdayIndex=day;target.dayLabel=DAYS[day];
    copy.sort((a,b)=>ORDER.indexOf(a.weekdayIndex)-ORDER.indexOf(b.weekdayIndex))
      .forEach((s,i)=>{s.scheduleOrder=i;});
    return {ok:true,sessions:copy,swapped:!!other};
  };
  w.GF74={version:'4.0.74',core:{group,role,rebuild,assign,sameSplit,sorted}};
  if(!w.document)return;
  const getPlan=()=>typeof plan!=='undefined'?plan:null;
  const getProgress=()=>typeof progress!=='undefined'?progress:null;
  const preference=()=>{
    const p=getPlan(),pr=getProgress();
    return p?.training?.splitPreference||pr?.settings?.trainingSplit||'auto';
  };
  const ppl=()=>preference()==='ppl';
  const daysFor=(ss,preferred)=>{
    const n=(ss||[]).length,a=sorted(preferred||[]);
    if(a.length>=n)return a.slice(0,n);
    const explicit=sorted((ss||[]).map(s=>Number(s.weekdayIndex)).filter(Number.isInteger));
    if(explicit.length===n)return explicit;
    return sorted([1,3,5,2,4,6,0]).slice(0,n);
  };
  function syncSchedule(p){
    if(!p?.training)return;
    const ss=p.training.sessions||[],days=sorted(ss.map(s=>s.weekdayIndex));
    p.training.sessionsPerWeek=ss.length;
    p.training.selectedWeekdays=days;
    p.training.primaryWeekdays=days;
    p.training.normalSessionsPerWeek=ss.length;
    p.training.availableWeekdays=sorted([...(p.training.availableWeekdays||[]),...days]);
    const pr=getProgress();
    if(pr){pr.settings||(pr.settings={});pr.settings.trainingWeekdays=days;pr.settings.primaryWeekdays=days;
      pr.settings.availableWeekdays=sorted([...(pr.settings.availableWeekdays||[]),...days]);}
  }
  function syncTemplates(p){
    const live=p?.training?.sessions||[];
    const match=s=>live.find(a=>a.id===s.id)||live.find(a=>role(a)===role(s));
    for(const obj of [p?.training?.startingPlan,p?.training?.targetPlan]){
      if(!Array.isArray(obj?.sessions))continue;
      const transformed=rebuild(obj.sessions,live.length,daysFor(live));
      if(transformed.ok)obj.sessions=transformed.sessions.map(s=>{
        const original=match(s);
        return original?{...s,id:original.id,weekdayIndex:original.weekdayIndex,dayLabel:original.dayLabel,scheduleOrder:original.scheduleOrder}:s;
      });
    }
  }
  function savePref(value){
    const p=getPlan();if(!p?.training)return;
    p.training.splitPreference=value==='ppl'?'ppl':'auto';
    const pr=getProgress();if(pr){pr.settings||(pr.settings={});pr.settings.trainingSplit=p.training.splitPreference;}
    try{write();renderAll?.();}catch(err){console.warn('Split preference save',err);}
  }
  w.gf74SetPreference=function(value){
    savePref(value);
    if(value==='ppl' && !sameSplit(getPlan()?.training?.sessions))toast('PPL selected. Review conversion in the Train tab before replacing your existing sessions.');
    else toast('Workout split saved');
    try{w.gfRenderSocialHub?.();}catch{}
  };
  w.gf74Convert=function(){
    const p=getPlan(),ss=p?.training?.sessions||[];
    if(!p?.training||!ppl())return;
    const result=rebuild(ss,ss.length,daysFor(ss,p.training.primaryWeekdays));
    if(!result.ok){toast(result.errors.join(' '));return;}
    if(!w.confirm('Convert the current programme into Push / Pull / Legs? Exercise assignments will change; completed workout history is retained.'))return;
    p.training.splitMigrationBackup={at:new Date().toISOString(),sessions:clone(ss)};
    p.training.sessions=result.sessions;syncSchedule(p);syncTemplates(p);write();renderAll();toast('Push / Pull / Legs programme applied');
  };
  w.gf74MoveSession=function(sessionId,day,context){
    const p=getPlan(),q=w.gf59PlannerState,isDraft=context==='planner';
    const src=isDraft?q?.draft:p?.training?.sessions;
    const result=assign(src,sessionId,day);
    if(!result.ok){toast(result.error);return;}
    if(isDraft){
      q.draft=result.sessions;q.primary=sorted(result.sessions.map(s=>s.weekdayIndex));
      q.available=sorted([...q.available,...q.primary]);q.workoutCount=q.primary.length;
      q.overflowDay=null;q.strategy='flex';w.gf59RenderPlanner();
    }else{
      p.training.sessions=result.sessions;syncSchedule(p);
      // Keep the phase templates in agreement so the ramp cannot undo a weekly-day move.
      for(const obj of [p.training.targetPlan,p.training.startingPlan]){
        if(!Array.isArray(obj?.sessions))continue;
        for(const s of obj.sessions){
          const match=result.sessions.find(a=>a.id===s.id);
          if(match){s.weekdayIndex=match.weekdayIndex;s.dayLabel=match.dayLabel;s.scheduleOrder=match.scheduleOrder;}
        }
      }
      write();renderAll();
    }
  };
  function weekHTML(sessions,context){
    const ss=Array.isArray(sessions)?sessions:[],byDay=new Map();
    for(const s of ss)if(Number.isInteger(Number(s.weekdayIndex)))byDay.set(Number(s.weekdayIndex),s);
    return '<div class="gf74-head"><div><div class="eyebrow">Weekly workout schedule</div><h3>Move your workout days</h3><p>Drag the grip onto another day, or use the day selector. Occupied days swap workouts.</p></div></div>'+
      '<div class="gf74-week" role="group" aria-label="Rearrange workouts by weekday">'+ORDER.map(day=>{
        const s=byDay.get(day),name=s?(s.name||'Workout'):'Rest';
        return '<div class="gf74-day '+(s?'filled':'')+'" data-gf74-day="'+day+'">'+
          '<span class="gf74-dow">'+DAYS[day].slice(0,3)+'</span>'+
          (s?'<div class="gf74-session" data-gf74-sid="'+html(s.id)+'">'+
             '<button type="button" class="gf74-handle" data-gf74-context="'+context+'" data-gf74-id="'+html(s.id)+'" aria-label="Drag '+html(s.name)+' to another weekday">⠿</button>'+
             '<strong>'+html(s.name)+'</strong><select class="gf74-select" aria-label="Move '+html(s.name)+' to day" onchange="gf74MoveSession(this.closest(\'[data-gf74-sid]\').dataset.gf74Sid,this.value,\''+context+'\')">'+
             ORDER.map(d=>'<option value="'+d+'" '+(d===day?'selected':'')+'>'+DAYS[d].slice(0,3)+'</option>').join('')+
             '</select></div>':'<span class="gf74-rest">Rest</span>')+'</div>';
      }).join('')+'</div>';
  }
  function renderWeek(){
    const root=w.document.getElementById('train'),p=getPlan();
    if(!root||!p?.training)return;
    root.querySelector('#gf74WeeklyPlanner')?.remove();
    const container=w.document.createElement('section');
    container.id='gf74WeeklyPlanner';container.className='card glass gf74-panel';
    const ss=p.training.sessions||[];
    let note='';
    if(ppl()&&!sameSplit(ss))note='<div class="gf74-warning">This programme still has mixed workout days. Your PPL preference is saved; convert it before editing the programme.'+
      '<button type="button" class="btn primary" onclick="gf74Convert()">Review & apply PPL</button></div>';
    container.innerHTML=weekHTML(ss,'live')+note;
    const spot=root.querySelector('#gfProgrammeList')||root.querySelector('.gf-calendar-widget');
    if(spot)spot.insertAdjacentElement('beforebegin',container);else root.prepend(container);
  }
  function plannerNormalize(){
    const q=w.gf59PlannerState;
    if(!q||!ppl())return;
    q.strategy='flex';q.overflowDay=null;
    if(!Array.isArray(q.draft)||q.draft.length<3){q.gf74Errors=['Select at least 3 workouts.'];return;}
    const assigned=sorted(q.draft.map(s=>s.weekdayIndex));
    if(q.draft.length===q.workoutCount&&assigned.length===q.draft.length&&sameSplit(q.draft)){
      // Preserve an explicitly dragged/sorted PPL week, not a forced Push-first order.
      q.gf74Errors=[];q.primary=assigned;q.available=sorted([...q.available,...assigned]);return;
    }
    const d=daysFor(q.draft,q.primary);
    const result=rebuild(q.draft,q.workoutCount,d);
    q.gf74Errors=result.errors;
    if(result.ok){
      // Preserve explicit weekdays and workout slots without sacrificing exercises or sets.
      q.draft=result.sessions;
      q.primary=sorted(result.sessions.map(s=>s.weekdayIndex));
      q.available=sorted([...q.available,...q.primary]);
    }
  }
  function plannerDecorate(){
    const q=w.gf59PlannerState,sh=w.document.getElementById('sessionSheet');
    if(!q||!sh||!ppl())return;
    sh.querySelector('.gf74-plan-note')?.remove();
    const note=w.document.createElement('div');note.className='gf74-plan-note';
    const errors=q.gf74Errors||[];
    note.innerHTML='<b>PPL split lock enabled</b><p>Planning keeps chest/shoulders/triceps on Push, back/biceps on Pull and lower body on Legs. Time adjustments will not mix muscle groups.</p>'+
      (errors.length?'<p class="gf74-error">'+errors.map(html).join(' ')+'</p>':'');
    const flow=sh.querySelector('.gf51-flow');
    if(flow)flow.prepend(note);else sh.querySelector('.gf51-stepbar')?.insertAdjacentElement('afterend',note);
    if(q.step===1){
      const section=w.document.createElement('div');section.className='gf74-planner-week';
      section.innerHTML=weekHTML(q.draft,'planner');
      const edit=sh.querySelector('.gf51-flow');edit?.insertAdjacentElement('afterbegin',section);
      // Unknown exercises remain visible; explicit assignment is required, not guessed.
      sh.querySelectorAll('.gf51-session').forEach((node,si)=>{
        node.querySelectorAll('.gf51-ex').forEach((row,ei)=>{
          const e=q.draft?.[si]?.exercises?.[ei];
          if(e&&!group(e)){
            const field=w.document.createElement('select');field.className='gf74-unassigned';field.setAttribute('aria-label','Assign muscle group for '+e.name);
            field.innerHTML='<option value="">Assign group</option><option value="push">Push</option><option value="pull">Pull</option><option value="legs">Legs</option>';
            field.addEventListener('change',ev=>{e.splitGroup=ev.target.value;w.gf59RenderPlanner();});
            row.appendChild(field);
          }
        });
      });
    }
  }
  // Intercept all planner entry points, including older aliases.
  const baseOpen=w.gf59OpenPlanBuilder;
  if(typeof baseOpen==='function'){
    w.gf59OpenPlanBuilder=function(){
      const r=baseOpen.apply(this,arguments),q=w.gf59PlannerState;
      if(ppl()&&q){
        const fixed=rebuild(q.baseline,q.workoutCount,daysFor(q.baseline,q.primary));
        if(fixed.ok)q.baseline=fixed.sessions;
        q.strategy='flex';q.overflowDay=null;
        plannerNormalize();w.gf59RenderPlanner();
      }
      return r;
    };
    w.gf51OpenPlanBuilder=w.gf59OpenPlanBuilder;
    w.gf58OpenPlanBuilder=w.gf59OpenPlanBuilder;
  }
  const basePlanner=w.gf59RenderPlanner;
  if(typeof basePlanner==='function')w.gf59RenderPlanner=function(){
    if(ppl())plannerNormalize();
    const r=basePlanner.apply(this,arguments);
    if(ppl())plannerDecorate();
    return r;
  };
  const baseApply=w.gf59Apply;
  if(typeof baseApply==='function')w.gf59Apply=function(){
    const q=w.gf59PlannerState;
    if(ppl()){
      plannerNormalize();
      if(q?.gf74Errors?.length){toast(q.gf74Errors.join(' '));w.gf59RenderPlanner();return;}
      if(!sameSplit(q?.draft)){toast('Resolve every PPL day before applying.');return;}
    }
    const r=baseApply.apply(this,arguments);
    if(ppl()&&getPlan()?.training){getPlan().training.splitPreference='ppl';syncSchedule(getPlan());syncTemplates(getPlan());write();}
    return r;
  };
  const baseStrategy=w.gf59SetStrategy;
  if(typeof baseStrategy==='function')w.gf59SetStrategy=function(value){
    if(ppl()&&value==='spread'){toast('PPL lock uses dedicated workout days, not mixed spread scheduling.');return;}
    return baseStrategy.apply(this,arguments);
  };
  const baseProfile=w.openProfileEditor;
  if(typeof baseProfile==='function')w.openProfileEditor=function(){
    const r=baseProfile.apply(this,arguments);
    const grid=w.document.querySelector('#sessionSheet .profile-editor-grid');
    if(grid&&!grid.querySelector('#gf74ProfileSplit')){
      grid.insertAdjacentHTML('beforeend','<div class="wide"><label>Workout split</label><select id="gf74ProfileSplit" class="input">'+
        '<option value="auto" '+(!ppl()?'selected':'')+'>Automatic / custom</option>'+
        '<option value="ppl" '+(ppl()?'selected':'')+'>Push / Pull / Legs (locked)</option></select>'+
        '<span class="create-help">Keeps muscle groups separate in future planner edits. Review conversion on Train for existing mixed workouts.</span></div>');
    }
    return r;
  };
  const baseSave=w.saveProfileEdits;
  if(typeof baseSave==='function')w.saveProfileEdits=function(){
    const value=w.document.getElementById('gf74ProfileSplit')?.value;
    if(value)getPlan().training.splitPreference=value;
    const r=baseSave.apply(this,arguments);
    if(value){const pr=getProgress();if(pr){pr.settings||(pr.settings={});pr.settings.trainingSplit=value;}write();}
    return r;
  };
  const baseSettings=w.gfSettingsViewHTML;
  if(typeof baseSettings==='function')w.gfSettingsViewHTML=function(){
    const s=baseSettings.apply(this,arguments);
    return s.replace('<div class="gf-settings-stack">','<div class="gf-settings-stack"><div class="gf74-settings"><label>Workout split</label>'+
      '<select class="input" aria-label="Workout split preference" onchange="gf74SetPreference(this.value)">'+
      '<option value="auto" '+(!ppl()?'selected':'')+'>Automatic / custom</option>'+
      '<option value="ppl" '+(ppl()?'selected':'')+'>Push / Pull / Legs (locked)</option></select>'+
      '<small>Saved to your client plan and exported JSON.</small></div>');
  };
  const baseOnboardRender=w.renderCanonicalOnboarding;
  if(typeof baseOnboardRender==='function')w.renderCanonicalOnboarding=function(){
    const r=baseOnboardRender.apply(this,arguments);
    if(typeof canonicalOnboardingStep!=='undefined' && canonicalOnboardingStep===0){
      const grid=w.document.querySelector('#tourCard .canon-grid'),p=canonicalOnboarding?.profile;
      if(grid&&!grid.querySelector('#gf74OnboardSplit')){
        grid.insertAdjacentHTML('beforeend','<div class="canon-field wide"><label>Workout split</label><select id="gf74OnboardSplit" class="input" onchange="canonicalOnboarding.profile.splitPreference=this.value">'+
          '<option value="auto" '+(p?.splitPreference!=='ppl'?'selected':'')+'>Automatic / custom</option>'+
          '<option value="ppl" '+(p?.splitPreference==='ppl'?'selected':'')+'>Push / Pull / Legs</option></select>'+
          '<span class="create-help">PPL needs at least 3 sessions per week and keeps the exercise groups separate.</span></div>');
      }
    }
    return r;
  };
  const baseSaveCanonical=w.canonicalSaveProfile;
  if(typeof baseSaveCanonical==='function')w.canonicalSaveProfile=function(){
    const p=canonicalOnboarding?.profile,choice=w.document.getElementById('gf74OnboardSplit')?.value||p?.splitPreference||'auto';
    if(choice==='ppl'&&Number(w.document.getElementById('canSessions')?.value||p?.sessions)<3){
      toast('Choose at least 3 weekly sessions for Push / Pull / Legs.');return;
    }
    if(p)p.splitPreference=choice;
    return baseSaveCanonical.apply(this,arguments);
  };
  const basePreview=w.canonicalPlanPreview;
  if(typeof basePreview==='function')w.canonicalPlanPreview=function(){
    const p=basePreview.apply(this,arguments),mode=canonicalOnboarding?.profile?.splitPreference||'auto';
    p.training.splitPreference=mode;p.onboarding.splitPreference=mode;
    if(mode==='ppl'){
      const n=p.training.sessions.length,days=daysFor(p.training.sessions,canonicalOnboarding?.profile?.weekdays);
      const proposed=rebuild(p.training.sessions,n,days);
      if(proposed.ok){
        p.training.sessions=proposed.sessions;
        p.training.primaryWeekdays=sorted(days);p.training.selectedWeekdays=sorted(days);
        for(const t of [p.training.startingPlan,p.training.targetPlan]){
          if(Array.isArray(t?.sessions)){const x=rebuild(t.sessions,n,days);if(x.ok)t.sessions=x.sessions;}
        }
      }else console.warn('PPL onboarding conversion requires review:',proposed.errors);
    }
    return p;
  };
  const baseComplete=w.completeCanonicalOnboarding;
  if(typeof baseComplete==='function')w.completeCanonicalOnboarding=async function(){
    const r=await baseComplete.apply(this,arguments),pr=getProgress();
    if(pr){pr.settings||(pr.settings={});pr.settings.trainingSplit=preference();write();}
    return r;
  };
  const oldSession=w.sessionForDate;
  if(typeof oldSession==='function')w.sessionForDate=function(date){
    const ss=getPlan()?.training?.sessions||[];
    const day=date?.getDay?.();
    const hit=ss.find(s=>Number(s.weekdayIndex)===day);
    if(hit&&typeof isTrainingDate==='function'&&isTrainingDate(date))return hit;
    return oldSession.apply(this,arguments);
  };
  const baseTrain=w.renderTrain;
  if(typeof baseTrain==='function')w.renderTrain=function(){
    const r=baseTrain.apply(this,arguments);
    try{renderWeek();}catch(e){console.warn('PPL weekly schedule render',e);}
    return r;
  };
  if(w.document.readyState!=='loading')setTimeout(()=>{try{renderWeek()}catch{}},0);
  else w.document.addEventListener('DOMContentLoaded',()=>{try{renderWeek()}catch{}},{once:true});
  let drag=null;
  w.document.addEventListener('pointerdown',ev=>{
    const handle=ev.target.closest?.('.gf74-handle');
    if(!handle)return;
    ev.preventDefault();
    drag={id:handle.dataset.gf74Id,context:handle.dataset.gf74Context,pointer:ev.pointerId};
    handle.classList.add('gf74-dragging');
    handle.setPointerCapture?.(ev.pointerId);
  });
  w.document.addEventListener('pointermove',ev=>{
    if(!drag||ev.pointerId!==drag.pointer)return;
    ev.preventDefault();
    w.document.querySelectorAll('.gf74-day.gf74-target').forEach(e=>e.classList.remove('gf74-target'));
    const slot=w.document.elementFromPoint(ev.clientX,ev.clientY)?.closest?.('.gf74-day[data-gf74-day]');
    if(slot)slot.classList.add('gf74-target');
  },{passive:false});
  w.document.addEventListener('pointerup',ev=>{
    if(!drag||ev.pointerId!==drag.pointer)return;
    const slot=w.document.elementFromPoint(ev.clientX,ev.clientY)?.closest?.('.gf74-day[data-gf74-day]');
    const d=drag;drag=null;
    w.document.querySelectorAll('.gf74-target,.gf74-dragging').forEach(el=>el.classList.remove('gf74-target','gf74-dragging'));
    if(slot)w.gf74MoveSession(d.id,slot.dataset.gf74Day,d.context);
  });
  w.document.addEventListener('pointercancel',()=>{drag=null;w.document.querySelectorAll('.gf74-target,.gf74-dragging').forEach(el=>el.classList.remove('gf74-target','gf74-dragging'));});
})(window);
