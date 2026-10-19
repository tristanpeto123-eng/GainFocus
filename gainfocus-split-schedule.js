(function gf74SplitSchedule(){
  'use strict';
  const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const PPL=['push','pull','legs'];
  const copy=x=>{try{return structuredClone(x)}catch{return JSON.parse(JSON.stringify(x))}};
  const label=g=>({push:'Push',pull:'Pull',legs:'Legs'})[g]||'Workout';
  const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const numDay=x=>x===null||x===undefined||x===''?null:Number.isInteger(Number(x))&&Number(x)>=0&&Number(x)<=6?Number(x):null;
  const uniq=a=>[...new Set((a||[]).map(numDay).filter(x=>x!==null))].sort((a,b)=>((a+6)%7)-((b+6)%7));
  const splitMode=()=>plan?.training?.muscleSplit==='ppl'||plan?.client?.trainingSplit==='ppl'?'ppl':'flexible';
  const role=s=>PPL.includes(s?.splitGroup)?s.splitGroup:PPL.includes(s?.gf74Group)?s.gf74Group:/\bpush\b/i.test(s?.name||'')?'push':/\bpull\b/i.test(s?.name||'')?'pull':/\blegs?\b|\blower\b/i.test(s?.name||'')?'legs':null;
  function classify(e,from){
    const n=String(e?.name||'').toLowerCase(),f=String(e?.focus||'').toLowerCase();
    const rx=(r,v)=>r.test(v);
    if(rx(/\b(rear.?delt|face.?pull|pull.?apart|reverse.?fly|rows?)\b/,n))return'pull';
    if(rx(/\b(quads?|hamstrings?|glutes?|calves?|legs?|hip|adductors?|abductors?)\b/,f))return'legs';
    if(rx(/\b(back|lats?|biceps?|traps?|rear delts?)\b/,f))return'pull';
    if(rx(/\b(chest|pecs?|triceps?|front delts?|side delts?|shoulders?)\b/,f))return'push';
    if(rx(/\b(core|abs?|plank|crunch|mobility|warm.?up|stretch)\b/,n+' '+f))return'neutral';
    if(rx(/\b(squat|lunge|leg |calf |hamstring|quad |hip thrust|glute|deadlift|rdl|romanian|step.?up)\b/,n))return'legs';
    if(rx(/\b(row|pulldown|pull.?up|chin.?up|lat |curl|face.?pull|rear.?delt|reverse fly|shrug)\b/,n))return'pull';
    if(rx(/\b(press|bench|chest|push.?up|dip|fly|lateral raise|front raise|tricep|shoulder)\b/,n))return'push';
    return from||null;
  }
  function dflt(count){return ({1:[1],2:[1,4],3:[1,3,5],4:[1,2,4,5],5:[1,2,3,4,5],6:[1,2,3,4,5,6],7:[0,1,2,3,4,5,6]})[count]||[1,3,5]}
  function assigned(sessions,preferred){
    const days=uniq(preferred||[]);
    return (sessions||[]).map((s,i)=>numDay(s.weekdayIndex)??days[i]??dflt(Math.min(7,sessions.length))[i]??i%7)
  }
  function reshape(input,days){
    if(!Array.isArray(input)||days.length<3)return copy(input||[]);
    const original=copy(input),pool=[],dest=days.map((d,i)=>{
      const g=PPL[i%3],candidate=original[i]||{};
      return {...candidate,id:role(candidate)===g&&candidate.id?candidate.id:`gf74-${g}-${i}-${String(candidate.id||'new').replace(/[^a-zA-Z0-9-]/g,'').slice(0,24)}`,name:label(g),subtitle:g==='push'?'Chest · Shoulders · Triceps':g==='pull'?'Back · Biceps · Rear delts':'Quads · Hamstrings · Glutes · Calves',dayLabel:DAYS[d],weekdayIndex:d,splitGroup:g,scheduleOrder:i,exercises:[]};
    });
    for(const s of original){
      const prior=role(s);
      for(const e of s.exercises||[]){
        const g=classify(e,prior);
        pool.push({exercise:e,group:g,fromSession:s.id})
      }
    }
    const countByGroup={push:0,pull:0,legs:0};
    for(const item of pool){
      const g=PPL.includes(item.group)?item.group:(role(original.find(s=>s.id===item.fromSession))||PPL[pool.indexOf(item)%3]),targets=dest.filter(s=>s.splitGroup===g);
      if(!targets.length)continue;
      const orig=targets.find(s=>s.id===item.fromSession);
      const target=targets.length===1?(orig||targets[0]):targets[countByGroup[g]++%targets.length];
      target.exercises.push(item.exercise)
    }
    return dest;
  }
  function normalizeDraft(q){
    if(!q||q.gf74Split!=='ppl')return;
    if(q.available?.length<3||q.workoutCount<3)return;
    q.strategy='flex';
    const primary=uniq(q.primary);
    if(primary.length!==q.workoutCount)return;
    const existing=(q.draft||[]).filter(s=>!s._overflow);
    const rolesReady=existing.length===primary.length&&existing.every((s,i)=>PPL.includes(s.splitGroup)&&s.splitGroup===PPL[i%3]);
    if(rolesReady){
      const wrong=existing.some(s=>(s.exercises||[]).some(e=>!['neutral',role(s)].includes(classify(e,role(s)))));
      if(!wrong){q.draft=existing;return}
    }
    q.draft=reshape(q.draft||[],primary);
    q.overflowDay=null;
  }
  function validate(q){
    if(q.gf74Split!=='ppl')return true;
    if((q.available||[]).length<3||q.workoutCount<3){toast('Push / Pull / Legs needs at least three training days');return false}
    normalizeDraft(q);
    const ss=q.draft||[];
    if(ss.length!==q.workoutCount||ss.some(s=>!s.exercises?.length)){
      toast('Each split day needs at least one exercise. Review the plan first.');return false
    }
    if(ss.some(s=>(s.exercises||[]).some(e=>!classify(e,null)))){toast('Assign a muscle focus to any unclassified exercises');return false}
    if(ss.some(s=>(s.exercises||[]).some(e=>{const g=classify(e,role(s));return g!=='neutral'&&g!==role(s)}))){
      toast('Some exercises belong to a different muscle group');return false
    }
    return true
  }
  function sessionWeekday(s,i,total){
    return numDay(s?.weekdayIndex)??assigned(Array.from({length:total},(_,j)=>j===i?s:{}),plan?.training?.primaryWeekdays||plan?.training?.selectedWeekdays)[i]
  }
  function scheduleHTML(sessions,context){
    const arr=(sessions||[]).filter(s=>!s._overflow&&Array.isArray(s.exercises)&&s.exercises.length);
    const preferred=context==='edit'?window.gf59PlannerState?.primary:plan?.training?.primaryWeekdays||plan?.training?.selectedWeekdays;
    const weekdays=assigned(arr,preferred);
    const boxes=[1,2,3,4,5,6,0].map(d=>{
      const matches=arr.filter((s,i)=>weekdays[i]===d);
      return `<div class="gf74-day" data-day="${d}"><strong>${DAYS[d].slice(0,3)}</strong>${matches.length?matches.map(s=>{
        const id=safe(s.id);
        return `<div class="gf74-session ${safe(role(s)||'general')}" data-id="${id}"><div class="gf74-session-top"><span>${safe(s.name)}</span><button type="button" class="gf74-handle" data-context="${context}" data-id="${id}" title="Drag workout" aria-label="Drag ${safe(s.name)} to another day">⠿</button></div><small>${safe(role(s)?label(role(s))+' day':String(s.exercises.length)+' exercises')}</small><select class="gf74-move-select" data-context="${context}" data-id="${id}" aria-label="Move ${safe(s.name)}"><option value="">Move to…</option>${[1,2,3,4,5,6,0].filter(x=>x!==d).map(x=>`<option value="${x}">${DAYS[x]}</option>`).join('')}</select></div>`
      }).join(''):'<span class="gf74-rest">Rest day</span>'}</div>`
    }).join('');
    return `<section class="gf74-board" data-context="${context}"><div class="gf74-board-head"><div><b>Weekly workout days</b><p>Drag a session onto another day to move or swap it. You can also use “Move to”.</p></div><span>${arr.length} workouts</span></div><div class="gf74-days">${boxes}</div></section>`
  }
  function move(id,to,context){
    const weekday=numDay(to);
    if(weekday===null)return;
    const q=window.gf59PlannerState;
    const sessions=context==='edit'?q?.draft:plan?.training?.sessions;
    if(!Array.isArray(sessions))return;
    const a=sessions.find(x=>String(x.id)===String(id));
    if(!a){toast('Workout not found');return}
    const prior=numDay(a.weekdayIndex);
    if(prior===weekday)return;
    const target=sessions.find(x=>x!==a&&numDay(x.weekdayIndex)===weekday&&!x._overflow);
    a.weekdayIndex=weekday;a.dayLabel=DAYS[weekday];
    if(target&&prior!==null){target.weekdayIndex=prior;target.dayLabel=DAYS[prior]}
    if(context==='edit'){
      const days=uniq(sessions.filter(s=>!s._overflow&&s.exercises?.length).map(s=>s.weekdayIndex));
      q.available=uniq([...(q.available||[]),weekday]);q.primary=days;
      q.workoutCount=days.length;
      renderPlanner();
    }else{
      if(!plan?.training)return;
      const days=uniq(sessions.map(s=>numDay(s.weekdayIndex)).filter(x=>x!==null));
      plan.training.selectedWeekdays=days;
      plan.training.primaryWeekdays=days;
      plan.training.availableWeekdays=uniq([...(plan.training.availableWeekdays||[]),...days]);
      if(progress){ensureProgressExtras();progress.settings.trainingWeekdays=[...days];progress.settings.primaryWeekdays=[...days];progress.settings.availableWeekdays=[...plan.training.availableWeekdays]}
      plan.training.revisionHistory=plan.training.revisionHistory||[];
      plan.training.revisionHistory.push({at:new Date().toISOString(),type:'workout-day-drag',sessionId:a.id,from:prior,to:weekday,swappedWith:target?.id||null});
      write();renderTrain();toast('Workout day updated')
    }
  }
  window.gf74MoveSession=move;
  let dragging=null;
  document.addEventListener('change',e=>{
    const select=e.target?.closest?.('.gf74-move-select');
    if(select&&select.value!==''){move(select.dataset.id,select.value,select.dataset.context)}
  });
  document.addEventListener('pointerdown',e=>{
    const handle=e.target?.closest?.('.gf74-handle');if(!handle)return;
    if(e.button!=null&&e.button!==0)return;
    e.preventDefault();
    const source=handle.closest('.gf74-session'),r=source?.getBoundingClientRect();
    if(!r)return;
    const ghost=document.createElement('div');
    ghost.className='gf74-drag-ghost';ghost.textContent=source.querySelector('.gf74-session-top span')?.textContent||'Workout';
    document.body.appendChild(ghost);ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
    dragging={pointerId:e.pointerId,id:handle.dataset.id,context:handle.dataset.context,ghost};
    handle.setPointerCapture?.(e.pointerId);
  });
  document.addEventListener('pointermove',e=>{
    if(!dragging||e.pointerId!==dragging.pointerId)return;
    dragging.ghost.style.left=e.clientX+'px';dragging.ghost.style.top=e.clientY+'px';
    document.querySelectorAll('.gf74-day.is-drop').forEach(el=>el.classList.remove('is-drop'));
    const day=document.elementFromPoint(e.clientX,e.clientY)?.closest('.gf74-day');
    if(day)day.classList.add('is-drop')
  });
  function endDrag(e){
    if(!dragging||e.pointerId!==dragging.pointerId)return;
    const day=document.elementFromPoint(e.clientX,e.clientY)?.closest('.gf74-day');
    const {id,context,ghost}=dragging;ghost.remove();dragging=null;
    document.querySelectorAll('.gf74-day.is-drop').forEach(el=>el.classList.remove('is-drop'));
    if(e.type==='pointerup'&&day)move(id,day.dataset.day,context)
  }
  document.addEventListener('pointerup',endDrag);
  document.addEventListener('pointercancel',endDrag);
  function addStyle(){
    if(document.getElementById('gf74-style'))return;
    const st=document.createElement('style');st.id='gf74-style';st.textContent=`
.gf74-board{margin:12px 0 20px;padding:16px;border:1px solid var(--line,#364557);border-radius:18px;background:rgba(16,28,46,.83);color:#f1f7ff}
.gf74-board-head{display:flex;justify-content:space-between;gap:10px;align-items:start;margin-bottom:12px}
.gf74-board-head b{font-size:16px}.gf74-board-head p{font-size:12px;opacity:.75;margin:4px 0}
.gf74-board-head>span{font-size:11px;opacity:.7;white-space:nowrap}
.gf74-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}
.gf74-day{min-height:105px;min-width:0;padding:8px 5px;border:1px dashed rgba(155,183,212,.3);border-radius:10px;background:rgba(255,255,255,.035);transition:background .15s,border-color .15s}
.gf74-day>strong{font-size:11px;display:block;margin:0 3px 10px;color:#c5d8e8}
.gf74-rest{font-size:10px;opacity:.6;margin-left:4px}
.gf74-session{padding:7px;border:1px solid #547ca4;border-radius:9px;background:#213956;margin-bottom:5px;min-width:0}
.gf74-session.push{border-color:#709eda}.gf74-session.pull{border-color:#53a6ac}.gf74-session.legs{border-color:#b69a65}
.gf74-session-top{display:flex;gap:2px;justify-content:space-between;align-items:center}
.gf74-session-top span{font-size:12px;line-height:1.15;font-weight:700;overflow-wrap:anywhere}
.gf74-handle{border:0;background:transparent;color:#e0edff;font-size:20px;cursor:grab;padding:2px 4px;touch-action:none;user-select:none}
.gf74-session small{display:block;font-size:10px;opacity:.75;margin:3px 0}
.gf74-move-select{width:100%;min-width:0;color:#eef7ff;background:#142438;border:1px solid #54708d;border-radius:6px;font-size:10px;padding:5px 1px}
.gf74-day.is-drop{border-color:#65b5ee;background:rgba(73,152,219,.23)}
.gf74-drag-ghost{position:fixed;transform:translate(-50%,-50%);z-index:2147483600;pointer-events:none;padding:10px 18px;border:2px solid #69c6ff;border-radius:12px;background:#1b3855;color:#fff;font-weight:700;box-shadow:0 8px 32px #0009}
.gf74-preference{padding:12px;border:1px solid var(--line,#43566c);border-radius:12px;margin:12px 0;background:rgba(255,255,255,.035)}
.gf74-preference label{display:block;font-weight:700;font-size:13px;margin-bottom:8px}
.gf74-preference select{width:100%;padding:10px;border-radius:9px;background:#152c42;color:#fff;border:1px solid #6b829a}
.gf74-preference small{display:block;opacity:.7;margin-top:8px;font-size:11px}
@media(max-width:800px){.gf74-days{grid-template-columns:repeat(2,minmax(0,1fr))}.gf74-day{min-height:90px;padding:10px}.gf74-session-top span{font-size:14px}.gf74-rest{font-size:12px}.gf74-move-select{font-size:12px;padding:8px 4px}}
`;document.head.appendChild(st)
  }
  addStyle();
  function plannerPreference(q){
    return `<div class="gf74-preference"><label for="gf74-plan-split">Muscle-group split</label><select id="gf74-plan-split" onchange="gf74SetPlannerSplit(this.value)"><option value="flexible" ${q.gf74Split!=='ppl'?'selected':''}>Flexible / mixed days</option><option value="ppl" ${q.gf74Split==='ppl'?'selected':''}>Push · Pull · Legs (strict)</option></select><small>${q.gf74Split==='ppl'?'Push, Pull and Legs stay separate, including when regenerating after edits. Requires three or more workout days.':'Original planner behaviour, including mixed training days.'}</small></div>`
  }
  const oldPlannerRender=window.gf59RenderPlanner;
  function renderPlanner(){
    const q=window.gf59PlannerState;
    if(q?.gf74Split==='ppl')normalizeDraft(q);
    oldPlannerRender?.();
    const sheet=document.getElementById('sessionSheet');if(!sheet||!q)return;
    const flow=sheet.querySelector('.gf51-flow');
    if(!flow)return;
    if(q.step===0)flow.insertAdjacentHTML('afterbegin',plannerPreference(q));
    if(q.step===1)flow.insertAdjacentHTML('afterbegin',scheduleHTML(q.draft,'edit'));
    if(q.step===2&&q.gf74Split==='ppl')flow.insertAdjacentHTML('afterbegin','<p class="gf74-preference">Strict Push / Pull / Legs mode: no mixed muscle-group days.</p>')
  }
  window.gf59RenderPlanner=renderPlanner;
  const oldOpen=window.gf59OpenPlanBuilder;
  window.gf59OpenPlanBuilder=function(...args){
    oldOpen?.(...args);
    const q=window.gf59PlannerState;
    if(q){q.gf74Split=splitMode();if(q.gf74Split==='ppl')q.strategy='flex'}
    renderPlanner()
  };
  window.gf58OpenPlanBuilder=window.gf59OpenPlanBuilder;
  window.gf51OpenPlanBuilder=window.gf59OpenPlanBuilder;
  window.gf74SetPlannerSplit=function(value){
    const q=window.gf59PlannerState;if(!q)return;
    q.gf74Split=value==='ppl'?'ppl':'flexible';
    if(q.gf74Split==='ppl'){q.strategy='flex';q.overflowDay=null}
    renderPlanner()
  };
  const oldGoEdit=window.gf59GoEdit;
  window.gf59GoEdit=function(){
    const q=window.gf59PlannerState;
    if(q?.gf74Split==='ppl'&&(q.workoutCount<3||q.available?.length<3)){toast('Choose at least three available workout days for Push / Pull / Legs');return}
    oldGoEdit?.()
  };
  const oldCommitMove=window.gf59CommitMove;
  window.gf59CommitMove=function(si,ei,di){
    const q=window.gf59PlannerState;
    if(q?.gf74Split==='ppl'){
      const from=q.draft?.[si],to=q.draft?.[di],e=from?.exercises?.[ei];
      if(e&&to&&!['neutral',role(to)].includes(classify(e,role(from)))){toast('Move exercises only within their Push, Pull or Legs group');return}
    }
    oldCommitMove?.(si,ei,di)
  };
  const oldApply=window.gf59Apply;
  window.gf59Apply=function(){
    const q=window.gf59PlannerState;if(!q||!validate(q))return;
    const mode=q.gf74Split==='ppl'?'ppl':'flexible';
    oldApply?.();
    if(plan?.training){plan.training.muscleSplit=mode;if(plan.client)plan.client.trainingSplit=mode;write();renderTrain()}
  };
  const oldOnboardRender=window.renderCanonicalOnboarding;
  function onboardField(){
    const s=document.getElementById('canSessions'),wrap=s?.closest('.canon-field');
    if(!wrap||document.getElementById('gf74-onboard-split'))return;
    const selected=canonicalOnboarding?.profile?.muscleSplit||splitMode();
    wrap.insertAdjacentHTML('afterend',`<div class="canon-field wide gf74-preference"><label for="gf74-onboard-split">Muscle group split</label><select id="gf74-onboard-split" class="input"><option value="flexible" ${selected!=='ppl'?'selected':''}>Flexible / mixed days</option><option value="ppl" ${selected==='ppl'?'selected':''}>Push · Pull · Legs</option></select><small>Keep these muscle groups separate when a training plan is generated or edited.</small></div>`)
  }
  if(typeof oldOnboardRender==='function'){
    window.renderCanonicalOnboarding=function(...args){const result=oldOnboardRender.apply(this,args);onboardField();return result}
  }
  const oldSaveOnboard=window.canonicalSaveProfile;
  if(typeof oldSaveOnboard==='function'){
    window.canonicalSaveProfile=function(...args){
      const mode=document.getElementById('gf74-onboard-split')?.value||'flexible';
      const days=Number(document.getElementById('canSessions')?.value||3);
      if(mode==='ppl'&&days<3){toast('Select at least three sessions per week for Push / Pull / Legs');return}
      if(canonicalOnboarding?.profile)canonicalOnboarding.profile.muscleSplit=mode;
      return oldSaveOnboard.apply(this,args)
    }
  }
  const oldCanonicalSessions=window.canonicalSessions;
  if(typeof oldCanonicalSessions==='function'){
    window.canonicalSessions=function(...args){
      const ss=oldCanonicalSessions.apply(this,args),p=canonicalOnboarding?.profile;
      return p?.muscleSplit==='ppl'?reshape(ss,uniq(p.weekdays||dflt(p.sessions||3))):ss
    }
  }
  const oldPreview=window.canonicalPlanPreview;
  if(typeof oldPreview==='function'){
    window.canonicalPlanPreview=function(...args){
      const result=oldPreview.apply(this,args);
      const p=canonicalOnboarding?.profile;
      if(result?.training&&p){
        result.training.muscleSplit=p.muscleSplit==='ppl'?'ppl':'flexible';
        result.client.trainingSplit=result.training.muscleSplit;
        const days=uniq(p.weekdays||dflt(p.sessions||3));
        result.training.primaryWeekdays=[...days];
        result.training.selectedWeekdays=[...days];
        result.training.availableWeekdays=[...days];
        result.training.sessions=(result.training.sessions||[]).map((s,i)=>({...s,weekdayIndex:days[i]??numDay(s.weekdayIndex),dayLabel:DAYS[days[i]??numDay(s.weekdayIndex)??1]}))
      }
      return result
    }
  }
  const oldProfileOpen=window.openProfileEditor;
  if(typeof oldProfileOpen==='function'){
    window.openProfileEditor=function(...args){
      const result=oldProfileOpen.apply(this,args),grid=document.querySelector('#sessionSheet .profile-editor-grid');
      if(grid&&!document.getElementById('gf74-profile-split'))grid.insertAdjacentHTML('beforeend',`<div class="wide gf74-preference"><label for="gf74-profile-split">Muscle group split</label><select id="gf74-profile-split"><option value="flexible" ${splitMode()!=='ppl'?'selected':''}>Flexible / mixed days</option><option value="ppl" ${splitMode()==='ppl'?'selected':''}>Push · Pull · Legs</option></select><small>Saved with the account and used whenever the workout planner regenerates sessions. Existing sessions stay unchanged until you apply a reviewed plan.</small></div>`);
      return result
    }
  }
  const oldProfileSave=window.saveProfileEdits;
  if(typeof oldProfileSave==='function'){
    window.saveProfileEdits=function(...args){
      const mode=document.getElementById('gf74-profile-split')?.value;
      if(mode&&plan?.training){plan.training.muscleSplit=mode;plan.client.trainingSplit=mode}
      return oldProfileSave.apply(this,args)
    }
  }
  const oldSessionForDate=window.sessionForDate;
  if(typeof oldSessionForDate==='function'){
    window.sessionForDate=function(d){
      if(plan?.training?.sessions?.some(s=>numDay(s.weekdayIndex)!==null)&&isTrainingDate(d)){
        const s=plan.training.sessions.find(x=>numDay(x.weekdayIndex)===d.getDay());
        if(s)return s
      }
      return oldSessionForDate(d)
    }
  }
  const oldRenderTrain=window.renderTrain;
  if(typeof oldRenderTrain==='function'){
    window.renderTrain=function(...args){
      const result=oldRenderTrain.apply(this,args),root=document.getElementById('train');
      if(root&&plan?.training?.sessions?.length&&!root.querySelector('.gf74-board[data-context="live"]')){
        const node=root.querySelector('.gf-calendar-widget')||root.firstElementChild;
        if(node)node.insertAdjacentHTML('afterend',scheduleHTML(plan.training.sessions,'live'))
      }
      return result
    }
  }
  window.gf74TestHelpers={classify,reshape,assigned,validate};
})();
