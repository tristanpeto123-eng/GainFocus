/* Gain Focus 4.0.74: muscle-split preference + draggable weekly sessions. */
(function () {
'use strict';
const D=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const G=['Push','Pull','Legs'];
const clone=x=>JSON.parse(JSON.stringify(x));
const escapeText=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const unique=a=>[...new Set((a||[]).map(Number).filter(x=>Number.isInteger(x)&&x>=0&&x<7))].sort((a,b)=>a-b);
const group=s=>/push/i.test(s?.splitGroup||s?.name||'')?'Push':/pull/i.test(s?.splitGroup||s?.name||'')?'Pull':/legs/i.test(s?.splitGroup||s?.name||'')?'Legs':null;
const classify=e=>{
  const s=String(e?.name||'')+' '+String(e?.focus||''); 
  if(/squat|deadlift|romanian|rdl|leg |quad|hamstring|glute|calf|lunge|hip thrust/i.test(s))return'Legs';
  if(/row|pulldown|pull.up|chin.up|lat |back|bicep|curl|face pull|rear delt|shrug/i.test(s))return'Pull';
  if(/press|chest|pec|tricep|pushdown|push.up|fly|shoulder|lateral|front delt|dip/i.test(s))return'Push';
  return null;
};
const state=()=>window.gf59PlannerState;
const pref=()=>({mode:plan?.training?.splitMode==='ppl'?'ppl':'adaptive',lock:plan?.training?.splitMode==='ppl'&&plan?.training?.splitLocked!==false});
const locked=()=>state()?.splitMode==='ppl'&&state()?.splitLocked===true;
function build(q){
  if(!q||q.workoutCount<3||q.primary.length!==q.workoutCount)return false;
  const days=unique(q.primary);
  if(days.length!==q.workoutCount||days.some(d=>!q.available.includes(d)))return false;
  const pool={Push:[],Pull:[],Legs:[]},seen={Push:new Set(),Pull:new Set(),Legs:new Set()};
  for(const s of q.baseline||[])for(const e of s.exercises||[]){
    const g=classify(e)||group(s);if(!g)continue;
    const key=String(e.id||e.name||'').toLowerCase();if(seen[g].has(key))continue;
    seen[g].add(key);pool[g].push(clone(e));
  }
  for(const s of starterSessions(3))if(!pool[group(s)].length)pool[group(s)]=clone(s.exercises);
  const pattern=Array.from({length:q.workoutCount},(_,i)=>G[i%3]);
  const counts=Object.fromEntries(G.map(g=>[g,pattern.filter(x=>x===g).length]));
  const used={Push:0,Pull:0,Legs:0};
  q.draft=pattern.map((g,i)=>{
    const n=used[g]++,div=counts[g];
    let exercises=pool[g].filter((_,j)=>j%div===n).map(clone);
    if(!exercises.length)exercises=[clone(pool[g][n%pool[g].length])];
    return {id:'ppl-'+g.toLowerCase()+'-'+(n+1),splitGroup:g,name:div>1?g+' '+(n+1):g,
      subtitle:({Push:'Chest · Shoulders · Triceps',Pull:'Back · Biceps',Legs:'Quads · Hamstrings · Calves'})[g],
      weekdayIndex:days[i],dayLabel:D[days[i]],scheduleOrder:i,exercises};
  }).sort((a,b)=>a.weekdayIndex-b.weekdayIndex);
  q.strategy='flex';q.overflowDay=null;
  return true;
}
function controls(mode,lock,handler){
  return '<div class="gf74-control"><label for="gf74Split">Training split</label><select id="gf74Split" onchange="'+handler+'(this.value)">'+
  '<option value="adaptive" '+(mode==='adaptive'?'selected':'')+'>Adaptive / mixed</option>'+
  '<option value="ppl" '+(mode==='ppl'?'selected':'')+'>Push / Pull / Legs</option></select>'+
  '<label class="gf74-check"><input id="gf74Lock" type="checkbox" '+(lock?'checked':'')+' '+(mode==='ppl'?'':'disabled')+
  ' onchange="'+handler+'(document.getElementById(\'gf74Split\').value)"> Lock muscle groups during edits</label>'+
  '<small>Move complete workouts to another day without mixing the muscle groups.</small></div>';
}
const style=document.createElement('style');style.id='gf74-style';style.textContent=[
 '.gf74-control{padding:12px;border:1px solid rgba(120,190,255,.2);border-radius:14px;background:rgba(80,150,245,.055);grid-column:1/-1;margin:8px 0}',
 '.gf74-control label{display:block;font-size:11px;font-weight:800;margin-bottom:7px;color:#e5f3ff}',
 '.gf74-control select{display:block;width:100%;min-height:38px;background:#1b2a42;color:#f3faff;border:1px solid #45607c;border-radius:8px;padding:7px}',
 '.gf74-control .gf74-check{display:flex;align-items:center;gap:8px;margin-top:9px}',
 '.gf74-control .gf74-check input{width:16px;height:16px;accent-color:#7bd4f8}',
 '.gf74-control small{display:block;color:#a6bbd4;font-size:10px;line-height:1.45}',
 '.gf74-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;margin:10px 0 14px}',
 '.gf74-day{min-width:0;min-height:100px;border:1px dashed #566a82;border-radius:10px;text-align:center;padding:6px 2px;background:rgba(94,152,222,.04)}',
 '.gf74-day strong{font-size:9px;color:#b8cbe5}.gf74-day.disabled{opacity:.28}',
 '.gf74-day.over{background:rgba(66,204,229,.22);border-color:#6cdaee}',
 '.gf74-chip{touch-action:none;cursor:grab;user-select:none;min-height:50px;border-radius:7px;padding:8px 2px;margin-top:5px;background:#234562;border:1px solid #487aa1;color:#e9faff;font-weight:800;font-size:9px;overflow-wrap:anywhere}',
 '.gf74-week-label{font-size:11px;font-weight:800;margin-top:10px}',
 '.gf74-picker{display:flex;align-items:center;gap:8px;margin:6px 0;font-size:11px}',
 '.gf74-picker span{flex:1}.gf74-picker select{color:#f3faff;background:#1b2a42;border:1px solid #45607c;border-radius:8px;padding:7px;max-width:125px}',
 '.gf74-help{font-size:10px;color:#aebed3;line-height:1.5;margin:6px 0 12px}',
 '.gf74-warning{font-size:10px;color:#e7bf81;line-height:1.4}'
].join('\n');document.head.appendChild(style);
function store(mode,lock){
  if(!plan)return;
  plan.training ||= {};
  plan.training.splitMode=mode==='ppl'?'ppl':'adaptive';
  plan.training.splitLocked=mode==='ppl'&&!!lock;
  write();
}
// New-client onboarding: store the mode and generate PPL-specific starter sessions.
const renderOnboard=window.renderCanonicalOnboarding;
if(typeof renderOnboard==='function')window.renderCanonicalOnboarding=function(){
 const r=renderOnboard.apply(this,arguments),p=canonicalOnboarding?.profile;
 if(canonicalOnboardingStep===0&&p){
   const anchor=document.getElementById('canSessions')?.closest('.canon-field');
   if(anchor&&!document.getElementById('gf74Split'))anchor.insertAdjacentHTML('afterend',controls(p.splitMode||'adaptive',p.splitMode==='ppl'&&p.splitLocked!==false,'gf74OnboardMode'));
 }
 return r;
};
window.gf74OnboardMode=function(mode){
 if(!canonicalOnboarding?.profile)return;
 canonicalOnboarding.profile.splitMode=mode;
 canonicalOnboarding.profile.splitLocked=mode==='ppl'&&document.getElementById('gf74Lock')?.checked!==false;
 const l=document.getElementById('gf74Lock');if(l)l.disabled=mode!=='ppl';
};
const saveOnboard=window.canonicalSaveProfile;
if(typeof saveOnboard==='function')window.canonicalSaveProfile=function(){
 const p=canonicalOnboarding?.profile;
 if(p?.splitMode==='ppl'&&Number(document.getElementById('canSessions')?.value)<3){toast('Push / Pull / Legs needs at least three weekly workouts');return}
 return saveOnboard.apply(this,arguments);
};
const preview=window.canonicalPlanPreview;
if(typeof preview==='function')window.canonicalPlanPreview=function(){
 const r=preview.apply(this,arguments),p=canonicalOnboarding?.profile||{},mode=p.splitMode||'adaptive';
 r.training.splitMode=mode;r.training.splitLocked=mode==='ppl'&&p.splitLocked!==false;
 if(r.training.splitLocked){
   const days=unique(p.weekdays),n=Number(p.sessions)||3;
   const q={baseline:starterSessions(3),available:days,primary:days,workoutCount:n,draft:[]};
   if(build(q)){r.training.sessions=q.draft;r.training.sessionsPerWeek=n;r.training.normalSessionsPerWeek=n;r.training.primaryWeekdays=days;r.training.selectedWeekdays=days;r.training.availableWeekdays=unique(p.availableWeekdays||days)}
 }
 return r;
};
// Existing-client account details: preference does not alter workouts until plan review.
const editProfile=window.openProfileEditor;
if(typeof editProfile==='function')window.openProfileEditor=function(){
 const r=editProfile.apply(this,arguments),anchor=document.getElementById('profileEditSessions'),p=pref();
 if(anchor&&!document.getElementById('gf74Split'))anchor.closest('div')?.insertAdjacentHTML('afterend',controls(p.mode,p.lock,'gf74AccountMode'));
 return r;
};
window.gf74AccountMode=function(mode){
 const l=document.getElementById('gf74Lock');if(!l)return;
 l.disabled=mode!=='ppl';if(mode==='ppl')l.checked=true;
};
const saveProfile=window.saveProfileEdits;
if(typeof saveProfile==='function')window.saveProfileEdits=function(){
 const mode=document.getElementById('gf74Split')?.value||pref().mode,
       lock=mode==='ppl'&&document.getElementById('gf74Lock')?.checked===true,
       n=Number(document.getElementById('profileEditSessions')?.value);
 if(lock&&n<3){toast('Push / Pull / Legs needs three or more weekly workouts');return}
 const r=saveProfile.apply(this,arguments);
 if(!document.getElementById('sessionModal')?.classList.contains('open'))store(mode,lock);
 return r;
};
// Planner option plus locked regeneration (do not use time-based redistribution).
const openPlan=window.gf59OpenPlanBuilder;
if(typeof openPlan==='function')window.gf59OpenPlanBuilder=function(){
 const r=openPlan.apply(this,arguments),q=state(),p=pref();
 if(q){q.splitMode=p.mode;q.splitLocked=p.lock;if(locked())build(q);gf59RenderPlanner()}
 return r;
};
window.gf58OpenPlanBuilder=window.gf59OpenPlanBuilder;window.gf51OpenPlanBuilder=window.gf59OpenPlanBuilder;
window.gf74PlannerMode=function(mode){
 const q=state();if(!q)return;
 if(mode==='ppl'&&q.workoutCount<3){toast('Choose 3 or more weekly workouts first');gf59RenderPlanner();return}
 q.splitMode=mode;q.splitLocked=mode==='ppl';
 if(locked())build(q);
 else q.draft=clone(q.baseline).map((s,i)=>({...s,weekdayIndex:q.primary[i]??q.available[i],dayLabel:D[q.primary[i]??q.available[i]]}));
 gf59RenderPlanner();
};
window.gf74PlannerLock=function(on){
 const q=state();if(!q)return;
 if(on&&q.workoutCount<3){toast('Choose 3 or more weekly workouts first');gf59RenderPlanner();return}
 q.splitLocked=!!on;if(locked())build(q);gf59RenderPlanner();
};
const editPlan=window.gf59GoEdit;
if(typeof editPlan==='function')window.gf59GoEdit=function(){
 const q=state();
 if(locked()){
   if(!build(q)){toast('Select at least three valid primary days');return}
   q.step=1;gf59RenderPlanner();return;
 }
 return editPlan.apply(this,arguments);
};
for(const name of ['gf59SetMinutes','gf59SetAvailableCount','gf59ToggleAvailable','gf59SetWorkoutCount','gf59TogglePrimary','gf59SetOverflow']){
 const fn=window[name];if(typeof fn!=='function')continue;
 window[name]=function(){const r=fn.apply(this,arguments);if(locked())build(state());gf59RenderPlanner();return r};
}
const strategy=window.gf59SetStrategy;
if(typeof strategy==='function')window.gf59SetStrategy=function(v){
 if(locked()&&v==='spread'){toast('Split lock prevents mixing workouts across days');return}
 return strategy.apply(this,arguments);
};
const moveExercise=window.gf59CommitMove;
if(typeof moveExercise==='function')window.gf59CommitMove=function(si,ei,di){
 const q=state(),e=q?.draft?.[si]?.exercises?.[ei],target=q?.draft?.[di];
 if(locked()&&e&&target&&classify(e)!==group(target)){toast('Move the whole workout instead, to keep muscle groups separate');return}
 return moveExercise.apply(this,arguments);
};
for(const name of ['gf59AddExercise','gf59SwapExercise']){
 const fn=window[name];if(typeof fn!=='function')continue;
 window[name]=function(si){
   const q=state(),old=locked()?clone(q.draft[si]):null,r=fn.apply(this,arguments);
   if(old&&q.draft[si]?.exercises.some(e=>classify(e)!==group(q.draft[si]))){
     q.draft[si]=old;toast('That exercise does not belong to this locked split day');gf59RenderPlanner();
   }
   return r;
 };
}
window.gf74MoveWorkout=function(index,day){
 const q=state();index=Number(index);day=Number(day);
 if(!q||q.step!==1||!Number.isInteger(index)||!Number.isInteger(day))return;
 if(!q.available.includes(day)){toast('Make this weekday available in Capacity first');return}
 const s=q.draft[index];if(!s||s._overflow)return;
 const original=s.weekdayIndex,other=q.draft.find(x=>x!==s&&x.weekdayIndex===day);
 if(other)other.weekdayIndex=original;
 s.weekdayIndex=day;
 q.draft.sort((a,b)=>a.weekdayIndex-b.weekdayIndex);
 q.draft.forEach((x,i)=>{x.dayLabel=D[x.weekdayIndex];x.scheduleOrder=i});
 q.primary=unique(q.draft.filter(x=>!x._overflow).map(x=>x.weekdayIndex));
 q.workoutCount=q.primary.length;
 gf59RenderPlanner();
};
function weekHTML(q){
 return '<div class="gf74-week-label">Weekly workout days · drag to reposition</div>'+
 '<div class="gf74-week" id="gf74Week">'+D.map((d,day)=>{
   const s=q.draft.find(x=>x.weekdayIndex===day&&!x._overflow),i=s?q.draft.indexOf(s):-1;
   return '<div class="gf74-day '+(q.available.includes(day)?'':'disabled')+'" data-day="'+day+'"><strong>'+d+'</strong>'+
   (s?'<div class="gf74-chip" data-index="'+i+'" draggable="true" aria-label="Drag '+escapeText(s.name)+'">⠿ '+escapeText(s.name)+'</div>':
      '<div style="margin-top:16px;font-size:8px;color:#8fa6bd">'+(q.available.includes(day)?'Drop here':'Unavailable')+'</div>')+'</div>';
 }).join('')+'</div>'+
 '<p class="gf74-help">Drop onto another workout to swap their days. On a phone, drag the handle or choose a weekday below. Exercise contents remain unchanged.</p>'+
 q.draft.filter(x=>!x._overflow).map(s=>{
  const i=q.draft.indexOf(s);
  return '<label class="gf74-picker"><span>'+escapeText(s.name)+'</span><select aria-label="Workout day for '+escapeText(s.name)+'" onchange="gf74MoveWorkout('+i+',this.value)">'+
   q.available.map(d=>'<option value="'+d+'" '+(s.weekdayIndex===d?'selected':'')+'>'+D[d]+'</option>').join('')+'</select></label>';
 }).join('');
}
function bindWeek(){
 const root=document.getElementById('gf74Week');if(!root)return;
 let dragging=-1;
 const clear=()=>root.querySelectorAll('.over').forEach(x=>x.classList.remove('over'));
 root.querySelectorAll('.gf74-chip').forEach(el=>{
   el.addEventListener('dragstart',e=>{dragging=Number(el.dataset.index);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(dragging))});
   el.addEventListener('dragend',()=>{dragging=-1;clear()});
   el.addEventListener('pointerdown',e=>{
     if(e.pointerType==='mouse')return;
     e.preventDefault();
     const source=Number(el.dataset.index),id=e.pointerId;let target=null;
     function move(ev){
       if(ev.pointerId!==id)return;
       const cell=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.gf74-day');clear();
       target=cell?Number(cell.dataset.day):null;
       if(cell&&state().available.includes(target))cell.classList.add('over');
     }
     function end(ev){
       if(ev.pointerId!==id)return;
       document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',end);document.removeEventListener('pointercancel',end);
       clear();if(target!=null)gf74MoveWorkout(source,target);
     }
     document.addEventListener('pointermove',move);document.addEventListener('pointerup',end);document.addEventListener('pointercancel',end);
   });
 });
 root.querySelectorAll('.gf74-day').forEach(el=>{
   el.addEventListener('dragover',e=>{if(dragging<0)return;e.preventDefault();el.classList.add('over')});
   el.addEventListener('dragleave',()=>el.classList.remove('over'));
   el.addEventListener('drop',e=>{e.preventDefault();const i=dragging>=0?dragging:Number(e.dataTransfer.getData('text/plain'));dragging=-1;gf74MoveWorkout(i,Number(el.dataset.day))});
 });
}
const renderPlanner=window.gf59RenderPlanner;
if(typeof renderPlanner==='function')window.gf59RenderPlanner=function(){
 const result=renderPlanner.apply(this,arguments),q=state(),sheet=document.getElementById('sessionSheet');
 if(!q||!sheet)return result;
 if(q.step===0){
  const anchor=sheet.querySelector('.gf59-primary-box');
  if(anchor){
    anchor.insertAdjacentHTML('beforebegin',controls(q.splitMode||'adaptive',!!q.splitLocked,'gf74PlannerMode'));
    const box=sheet.querySelector('#gf74Lock');if(box)box.setAttribute('onchange','gf74PlannerLock(this.checked)');
    if(locked())sheet.querySelector('.gf58-strategy')?.insertAdjacentHTML('afterend','<p class="gf74-warning">Spread over available days is disabled with split lock, because it mixes muscle groups.</p>');
  }
 }else if(q.step===1){
  const note=sheet.querySelector('.gf51-editor-note');
  if(note){note.insertAdjacentHTML('afterend',weekHTML(q));bindWeek()}
 }
 return result;
};
const apply=window.gf59Apply;
if(typeof apply==='function')window.gf59Apply=function(){
 const q=state();if(!q)return;
 if(locked()&&q.draft.some(s=>s.exercises.some(e=>classify(e)!==group(s)))){
   toast('Resolve exercises outside their locked muscle groups');return;
 }
 if(locked()){q.strategy='flex';q.overflowDay=null;q.draft.sort((a,b)=>a.weekdayIndex-b.weekdayIndex)}
 const r=apply.apply(this,arguments);
 if(q?.draft?.some(s=>s.exercises.length)&&plan?.training){
   store(q.splitMode||'adaptive',!!q.splitLocked);
   if(locked()){progress.settings.trainingWeekdays=unique(q.draft.filter(s=>s.exercises.length).map(s=>s.weekdayIndex));write()}
 }
 return r;
};
})();