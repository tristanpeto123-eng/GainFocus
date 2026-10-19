/* Gain Focus workout recovery v1
 * A user-controlled escape hatch for unfinished/orphaned workout records.
 * Completed history is never removed. No migration or automatic deletion.
 */
(function(root){
  'use strict';
  function pending(logs){
    return (Array.isArray(logs)?logs:[]).filter(function(w){return w && w.completed===false;});
  }
  function totalSets(w){
    if(Array.isArray(w?.setEntries)&&w.setEntries.length)return w.setEntries.length;
    return (w?.exercises||[]).reduce(function(n,e){return n+Math.max(0,Number(e?.sets)||0);},0);
  }
  function discard(logs,id){
    return (Array.isArray(logs)?logs:[]).filter(function(w){
      return !(w && w.completed===false && String(w.id)===String(id));
    });
  }
  function asCompleted(logs,id,completedAt){
    return (Array.isArray(logs)?logs:[]).map(function(w){
      if(!w||w.completed!==false||String(w.id)!==String(id))return w;
      if(totalSets(w)<=0)return w;
      var groups={},existing=Array.isArray(w.exercises)?w.exercises:[];
      if(Array.isArray(w.setEntries)&&w.setEntries.length){
        w.setEntries.forEach(function(e){
          var key=String(e.exerciseKey||e.exerciseName||'exercise');
          if(!groups[key])groups[key]={id:key,name:e.exerciseName||key,focus:e.focus||'',sets:0};
          groups[key].sets++;
        });
      }
      return Object.assign({},w,{
        completed:true,
        completedAt:completedAt||new Date().toISOString(),
        exercises:Object.keys(groups).length?Object.values(groups):existing.slice(),
        partialWorkout:true
      });
    });
  }
  var api={pending:pending,totalSets:totalSets,discard:discard,asCompleted:asCompleted};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document==='undefined')return;

  function ready(){return typeof progress!=='undefined'&&progress&&Array.isArray(progress.workoutLogs)&&typeof write==='function';}
  function unfinished(){return ready()?pending(progress.workoutLogs).slice().sort(function(a,b){return String(b.startedAt||b.date||'').localeCompare(String(a.startedAt||a.date||''));}):[];}
  function label(w){return String(w.sessionName||w.sessionId||'Workout');}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];});}
  function currentRecord(){
    var arr=unfinished();
    var selected=typeof canonicalWorkout!=='undefined'&&canonicalWorkout&&canonicalWorkout.workoutId;
    return arr.find(function(w){return String(w.id)===String(selected);})||arr[0]||null;
  }
  function canResume(w){
    return typeof plan!=='undefined'&&plan?.training?.sessions?.some(function(s){return String(s.id)===String(w.sessionId);});
  }
  function resetCurrent(id){
    var active=typeof canonicalWorkout!=='undefined'&&canonicalWorkout&&canonicalWorkout.workoutId;
    if(active!=null&&String(active)!==String(id))return;
    if(typeof skipCanonicalRest==='function')skipCanonicalRest();
    if(typeof canonicalWorkout!=='undefined')canonicalWorkout=null;
    if(typeof editingWorkoutId!=='undefined')editingWorkoutId=null;
    if(typeof closeSession==='function')closeSession();
    else {document.getElementById('sessionModal')?.classList.remove('open');document.getElementById('sessionSheet')?.classList.remove('workout-sheet');}
  }
  function redraw(){
    try{if(typeof renderAll==='function')renderAll();else if(typeof renderTrain==='function')renderTrain();}
    catch(err){console.warn('Gain Focus workout recovery render',err);try{if(typeof renderTrain==='function')renderTrain();}catch(_){}}
    renderRecovery();
  }
  function changeRecord(id,operation){
    if(!ready())return false;
    var w=unfinished().find(function(x){return String(x.id)===String(id);});
    if(!w)return false;
    var sets=totalSets(w);
    if(operation==='finish'&&!sets){root.alert('No sets logged in this workout. Choose Discard unfinished instead.');return false;}
    var action=operation==='finish'?'Save '+sets+' logged set(s) as a completed partial workout':'Discard this unfinished workout';
    var detail=operation==='finish'?'Your existing sets and previous completed workouts will be kept.':sets+' unsaved session set(s) will be removed. Completed workouts, nutrition and progress will stay unchanged.';
    if(!root.confirm(action+'?\n\n'+label(w)+'\n'+detail))return false;
    var previous=progress.workoutLogs;
    var next=operation==='finish'?asCompleted(previous,id,new Date().toISOString()):discard(previous,id);
    if(next.length===previous.length&&operation==='discard')return false;
    progress.workoutLogs=next;
    try{write();}
    catch(err){progress.workoutLogs=previous;console.warn('Gain Focus workout recovery save',err);root.alert('Could not save the change. Your workout data has been restored in memory.');return false;}
    resetCurrent(id);
    redraw();
    if(typeof toast==='function')toast(operation==='finish'?'Partial workout saved':'Unfinished workout discarded');
    return true;
  }
  api.discardActive=function(id){return changeRecord(id||currentRecord()?.id,'discard');};
  api.finishPartial=function(id){return changeRecord(id||currentRecord()?.id,'finish');};
  api.active=unfinished;
  function actionButtons(w){
    var id=esc(encodeURIComponent(String(w.id)));
    return '<button type="button" class="gf-wr-button gf-wr-discard" data-gf-wr-action="discard" data-gf-wr-id="'+id+'">Discard unfinished</button>'+
      (totalSets(w)>0?'<button type="button" class="gf-wr-button" data-gf-wr-action="finish" data-gf-wr-id="'+id+'">Save '+totalSets(w)+' sets &amp; end</button>':'');
  }
  function drawBanner(arr){
    var train=document.getElementById('train');
    if(!train)return;
    var box=document.getElementById('gfWorkoutRecoveryBanner');
    if(!arr.length){box?.remove();return;}
    if(!box){box=document.createElement('section');box.id='gfWorkoutRecoveryBanner';box.className='gf-wr-banner card glass';train.insertAdjacentElement('afterbegin',box);}
    var fingerprint=arr.map(function(w){return [String(w.id),totalSets(w),canResume(w)].join(':');}).join('|');
    if(box.dataset.fingerprint===fingerprint)return;
    box.dataset.fingerprint=fingerprint;
    box.innerHTML='<h3>Unfinished workout recovery</h3><p>Leave the resume loop here. Only unfinished sessions are affected.</p>'+
      arr.map(function(w){
        var orphan=!canResume(w);
        return '<div class="gf-wr-row"><div><b>'+esc(label(w))+'</b><small>'+totalSets(w)+' sets logged'+(orphan?' · Previous plan changed':'')+'</small></div><div class="gf-wr-actions">'+actionButtons(w)+'</div></div>';
      }).join('');
  }
  function drawModal(arr){
    var sheet=document.getElementById('sessionSheet'),modal=document.getElementById('sessionModal');
    if(!sheet||!modal||!modal.classList.contains('open'))return;
    var current=currentRecord(),existing=document.getElementById('gfWorkoutRecoveryModal');
    if(!current||!arr.length){existing?.remove();return;}
    if(sheet.querySelector('.workout-shell')){
      if(existing?.dataset.workoutId===String(current.id))return;
      existing?.remove();
      var box=document.createElement('div');
      box.id='gfWorkoutRecoveryModal';box.dataset.workoutId=String(current.id);box.className='gf-wr-in-session';
      box.innerHTML='<b>Need to stop this workout?</b><div class="gf-wr-actions">'+actionButtons(current)+'</div><small>“End later” only pauses; discard ends the session permanently.</small>';
      (sheet.querySelector('.workout-dock')||sheet.querySelector('.workout-shell')).insertAdjacentElement('beforebegin',box);
    }
  }
  function drawEscape(arr){
    var btn=document.getElementById('gfWorkoutRecoveryEscape');
    if(!arr.length){btn?.remove();return;}
    if(!btn){
      btn=document.createElement('button');btn.id='gfWorkoutRecoveryEscape';btn.type='button';
      btn.className='gf-wr-float';btn.textContent='Exit stuck workout';
      btn.setAttribute('data-gf-wr-action','discard-current');
      document.body.appendChild(btn);
    }
    var m=document.getElementById('sessionModal');
    btn.hidden=!(m?.classList.contains('open'));
  }
  function renderRecovery(){
    var arr=unfinished();
    drawBanner(arr);drawModal(arr);drawEscape(arr);
  }
  function installStyles(){
    if(document.getElementById('gfWorkoutRecoveryStyle'))return;
    var style=document.createElement('style');style.id='gfWorkoutRecoveryStyle';
    style.textContent=[
      '.gf-wr-banner{margin:12px 0 18px;padding:16px;border:1px solid rgba(255,173,108,.45)!important}',
      '.gf-wr-banner h3{font-size:18px;margin:0 0 6px}.gf-wr-banner p{font-size:12px;opacity:.8;margin:0 0 12px}',
      '.gf-wr-row{display:flex;flex-direction:column;gap:9px;padding:11px 0;border-top:1px solid rgba(255,255,255,.13)}',
      '.gf-wr-row b,.gf-wr-row small{display:block}.gf-wr-row small{font-size:11px;opacity:.8;margin-top:4px}',
      '.gf-wr-actions{display:flex;flex-wrap:wrap;gap:8px}',
      '.gf-wr-button{min-height:44px;border-radius:11px;padding:9px 12px;border:1px solid rgba(132,207,244,.6);background:#183851;color:#f4fbff;font-weight:700;font-size:12px;cursor:pointer}',
      '.gf-wr-discard{border-color:rgba(255,173,108,.7);background:#4a2d22;color:#fff3e9}',
      '.gf-wr-in-session{padding:14px 0;margin:10px 0;border-top:1px solid rgba(255,255,255,.18)}',
      '.gf-wr-in-session b{display:block;margin-bottom:9px}.gf-wr-in-session small{display:block;opacity:.75;margin-top:8px}',
      '.gf-wr-float{position:fixed;z-index:100000;bottom:calc(88px + env(safe-area-inset-bottom,0px));right:12px;border:1px solid #ffa96c;border-radius:14px;padding:12px 14px;min-height:44px;background:#422b20;color:#fff;font:700 12px/1.2 system-ui,sans-serif;box-shadow:0 8px 30px #0008;cursor:pointer}',
      '.gf-wr-float[hidden]{display:none!important}'
    ].join('\n');
    document.head.appendChild(style);
  }
  var scheduled=false;
  function scheduleRender(){
    if(scheduled)return;scheduled=true;
    root.requestAnimationFrame?root.requestAnimationFrame(function(){scheduled=false;renderRecovery();}):setTimeout(function(){scheduled=false;renderRecovery();},0);
  }
  function boot(){
    installStyles();
    document.addEventListener('click',function(event){
      var button=event.target.closest('[data-gf-wr-action]');
      if(!button)return;
      var operation=button.getAttribute('data-gf-wr-action');
      if(!['discard','finish','discard-current'].includes(operation))return;
      event.preventDefault();event.stopPropagation();
      var id=operation==='discard-current'?currentRecord()?.id:decodeURIComponent(button.getAttribute('data-gf-wr-id')||'');
      if(!id)return;
      changeRecord(id,operation==='finish'?'finish':'discard');
    },true);
    if(document.body){
      var observer=new MutationObserver(scheduleRender);
      observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    }
    root.addEventListener('pageshow',scheduleRender);
    scheduleRender();
  }
  root.GFWorkoutRecovery=api;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})(typeof window!=='undefined'?window:globalThis);
