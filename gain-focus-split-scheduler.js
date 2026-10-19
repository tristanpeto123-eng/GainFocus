// Gain Focus: persistent training split + weekly day assignments.
// Sidecar for the existing classic-script application; does not migrate historical logs.
(function(root){
  'use strict';
  var DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var NAMES=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var OPTIONS=[['auto','Adaptive (current plan)'],['ppl','Push / Pull / Legs']];
  var installing=false, pointer=null;
  function clean(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','&#39;':'&#39;'}[c]||'&#39;';});}
  function typeForSession(s){
    var v=String((s&&s.splitGroup)||(s&&s.id)||'').toLowerCase(),name=String((s&&s.name)||'').toLowerCase();
    if (/^(push|pull|legs)$/.test(v)) return v;
    var m=name.match(/^(push|pull|legs)(?:\s|$)/);
    return m?m[1]:null;
  }
  function exerciseGroup(e){
    var x=String((e&&e.name)||'').toLowerCase(),f=String((e&&e.focus)||'').toLowerCase(),combined=x+' '+f;
    // Whole-body/core movements may be programmed as accessories in any split.
    if (/plank|ab wheel|crunch|sit.up|dead bug|pallof|core|abdominals/.test(combined))return 'core';
    if (/leg press|squat|lunge|deadlift|hamstring|quads|quadriceps|glutes|calf|calves|leg curl|leg extension|hip thrust|hip abduc|adductor/.test(combined))return 'legs';
    if (/face pull|rear delt|biceps|lat\b|pulldown|pull.up|chin.up|rowing|\brow\b|upper back|mid.back|trapezius|shrug|reverse fly/.test(combined))return 'pull';
    if (/chest|pectoral|triceps|pushdown|skullcrusher|bench press|overhead press|shoulder press|lateral raise|side delt|front delt|dumbbell press|push.up|incline press|flat press/.test(combined))return 'push';
    // Unclassified exercises do not trigger potentially destructive false positives.
    return 'unknown';
  }
  function validateSessions(sessions){
    var problems=[];
    (sessions||[]).forEach(function(s){
      var g=typeForSession(s);
      if(!g){problems.push(String(s.name||s.id||'Workout')+' is not a Push, Pull or Legs day');return;}
      (s.exercises||[]).forEach(function(e){
        var eGroup=exerciseGroup(e);
        if(eGroup!=='core'&&eGroup!=='unknown'&&eGroup!==g)
          problems.push(String(s.name||g)+': '+String(e.name||'exercise')+' belongs to '+eGroup);
      });
    });
    return problems;
  }
  function makePPLSessions(count,templates){
    count=Math.max(3,Math.min(6,Math.floor(Number(count)||3)));
    var three=(templates||[]).filter(function(s){return ['push','pull','legs'].includes(typeForSession(s));});
    var groups=['push','pull','legs'],counts={push:0,pull:0,legs:0};
    return Array.from({length:count},function(_,i){
      var group=groups[i%3],base=three.find(function(s){return typeForSession(s)===group;});
      if(!base)throw Error('Missing '+group+' workout template');
      counts[group]++;
      var occurrence=counts[group],suffix=occurrence>1?' '+String.fromCharCode(64+occurrence):'';
      return {id:group+(occurrence>1?'-'+occurrence:''),splitGroup:group,dayLabel:group.charAt(0).toUpperCase()+group.slice(1)+suffix,
        name:group.charAt(0).toUpperCase()+group.slice(1)+suffix,subtitle:base.subtitle||'',
        exercises:(base.exercises||[]).map(function(e,j){return Object.assign({},e,{id:group+'-'+occurrence+'-'+j});})};
    });
  }
  function reconcile(sessions,mapping,weekdays){
    var seen={},out={},valid=(sessions||[]).filter(function(s){return s&&s.id!=null;});
    Object.keys(mapping||{}).forEach(function(k){
      var day=Number(k),id=mapping[k];
      if(day>=0&&day<=6&&Number.isInteger(day)&&!seen[id]&&valid.some(function(s){return String(s.id)===String(id);})){
        out[day]=id;seen[id]=true;
      }
    });
    var remaining=valid.filter(function(s){return !seen[s.id];});
    var prefer=(weekdays||[]).concat([1,2,3,4,5,6,0]);
    prefer.forEach(function(d){
      if(remaining.length&&Number.isInteger(d)&&d>=0&&d<7&&out[d]===undefined){
        var s=remaining.shift();out[d]=s.id;seen[s.id]=true;
      }
    });
    return out;
  }
  function move(mapping,id,target){
    var next=Object.assign({},mapping),from=Object.keys(next).find(function(d){return String(next[d])===String(id);});
    target=Number(target);
    if(!Number.isInteger(target)||target<0||target>6||from===undefined)return next;
    if(Number(from)===target)return next;
    var replaced=next[target];next[target]=id;
    if(replaced!==undefined)next[from]=replaced;else delete next[from];
    return next;
  }
  var model={exerciseGroup:exerciseGroup,validateSessions:validateSessions,makePPLSessions:makePPLSessions,reconcile:reconcile,move:move};
  if(typeof module!=='undefined'&&module.exports)module.exports=model;
  if(typeof document==='undefined')return;

  function available(){return typeof plan!=='undefined'&&plan&&plan.training&&typeof progress!=='undefined'&&progress&&typeof write==='function';}
  function ensure(){
    if(!available())return null;
    progress.settings=progress.settings||{};
    plan.training=plan.training||{};
    var s=progress.settings;
    if(s.trainingSplitMode&&!plan.training.splitMode)plan.training.splitMode=s.trainingSplitMode;
    if(!plan.training.splitMode)plan.training.splitMode='auto';
    s.trainingSplitMode=plan.training.splitMode;
    if(!Array.isArray(plan.training.sessions))plan.training.sessions=[];
    var weekdays=Array.isArray(s.trainingWeekdays)&&s.trainingWeekdays.length?s.trainingWeekdays:
      (plan.onboarding&&Array.isArray(plan.onboarding.selectedWeekdays)?plan.onboarding.selectedWeekdays:[]);
    var existing=s.trainingSessionAssignments||{};
    if(!Object.keys(existing).length){
      existing={};plan.training.sessions.forEach(function(session,i){
        var d=Number(session.weekdayIndex);
        if(!Number.isInteger(d)||d<0||d>6)d=Number((plan.training.selectedWeekdays||[])[i]);
        if(Number.isInteger(d)&&d>=0&&d<=6&&existing[d]===undefined)existing[d]=session.id;
      });
    }
    s.trainingSessionAssignments=reconcile(plan.training.sessions,existing,weekdays);
    s.trainingWeekdays=Object.keys(s.trainingSessionAssignments).map(Number).sort(function(a,b){return a-b;});
    return s;
  }
  function choice(value){return OPTIONS.map(function(o){return '<option value="'+o[0]+'" '+(o[0]===value?'selected':'')+'>'+o[1]+'</option>';}).join('');}
  function currentMode(){return available()?(plan.training.splitMode||progress.settings.trainingSplitMode||'auto'):'auto';}
  function setMode(v){
    if(!available())return;
    if(v!=='auto'&&v!=='ppl')return;
    if(v==='ppl'&&(plan.training.sessionsPerWeek||plan.training.sessions.length)<3){
      notify('PPL needs at least 3 workouts per week');return;
    }
    plan.training.splitMode=v;
    progress.settings.trainingSplitMode=v;
    write();renderAll();
    if(v==='ppl'&&validateSessions(plan.training.sessions).length)
      notify('PPL saved. Review and rebuild the existing mixed programme from Account.');
    else notify('Training split saved');
  }
  function notify(message){if(typeof toast==='function')toast(message);else console.info(message);}
  function fieldHTML(id,v){return '<div class="gf-split-field"><label for="'+id+'">Muscle-group split</label><select class="input" id="'+id+'">'+choice(v)+'</select><small>PPL locks generated days to Push, Pull or Legs. Exercise changes must stay within the selected group.</small></div>';}
  function dayBoard(){
    var s=ensure();if(!s)return '';
    var ss=plan.training.sessions,byId={};
    ss.forEach(function(x){byId[x.id]=x;});
    var map=s.trainingSessionAssignments,items=DAYS.map(function(label,i){
      var assigned=byId[map[i]],controls='';
      if(assigned){
        controls='<div class="gf-split-workout" data-session="'+clean(assigned.id)+'"><span class="gf-split-grip" role="button" tabindex="0" aria-label="Drag '+clean(assigned.name)+' to another day">⠿</span><div class="gf-split-workout-copy"><b>'+clean(assigned.name)+'</b><small>'+clean(assigned.subtitle||'')+'</small></div><select class="gf-split-day-select" aria-label="Move '+clean(assigned.name)+'" data-session="'+clean(assigned.id)+'">'+DAYS.map(function(d,j){return '<option value="'+j+'" '+(j===i?'selected':'')+'>'+NAMES[j]+'</option>';}).join('')+'</select></div>';
      }else controls='<div class="gf-split-rest">Rest day</div>';
      return '<div class="gf-split-day" data-gf-day="'+i+'"><span class="gf-split-day-label">'+label+'</span>'+controls+'</div>';
    }).join('');
    return '<section class="gf-split-board card glass"><div class="gf-split-head"><div><div class="eyebrow">Weekly workout arrangement</div><h3>Move your workout days</h3><p>Drag the handle onto another day, or use the day selector. Moving onto another workout swaps them.</p></div><span class="gf-split-tag">'+(currentMode()==='ppl'?'PPL':'Adaptive')+'</span></div><div class="gf-split-week">'+items+'</div></section>';
  }
  function redraw(){
    if(typeof renderAll==='function')renderAll();
    else if(typeof renderTrain==='function')renderTrain();
  }
  function assignSession(id,day){
    var s=ensure();if(!s||!plan.training.sessions.some(function(x){return String(x.id)===String(id);}))return;
    var next=move(s.trainingSessionAssignments,id,day);
    s.trainingSessionAssignments=next;
    s.trainingWeekdays=Object.keys(next).map(Number).sort(function(a,b){return a-b;});
    plan.training.sessions.forEach(function(session){var day=Object.keys(next).find(function(d){return String(next[d])===String(session.id);});if(day!==undefined)session.weekdayIndex=Number(day);});
    plan.training.selectedWeekdays=plan.training.sessions.map(function(session){return Number(session.weekdayIndex);}).filter(Number.isInteger);
    plan.training.primaryWeekdays=s.trainingWeekdays.slice();s.primaryWeekdays=s.trainingWeekdays.slice();
    write();redraw();notify('Workout day updated');
  }
  function installStyles(){
    if(document.getElementById('gf-split-style'))return;
    var el=document.createElement('style');el.id='gf-split-style';
    el.textContent=[
      '.gf-split-field{display:flex;flex-direction:column;gap:7px;margin:12px 0}.gf-split-field label{font-weight:750;font-size:13px}.gf-split-field small{color:var(--muted,#a6aab4);font-size:11px;line-height:1.4}',
      '.gf-split-board{margin:10px 0 18px;padding:15px}.gf-split-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.gf-split-head h3{font-size:17px;margin:4px 0}.gf-split-head p{font-size:11px;line-height:1.45;opacity:.72;margin:4px 0 13px}',
      '.gf-split-tag{font-weight:700;white-space:nowrap;font-size:11px;padding:6px 8px;border:1px solid rgba(100,183,255,.22);border-radius:10px}',
      '.gf-split-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}',
      '.gf-split-day{min-width:0;min-height:105px;padding:6px;border:1px solid rgba(164,195,230,.17);border-radius:12px;background:rgba(255,255,255,.025)}.gf-split-day.gf-split-over{border-color:#65bcff;background:rgba(101,188,255,.14)}',
      '.gf-split-day-label{font-size:10px;font-weight:800;display:block;text-align:center;margin-bottom:7px}.gf-split-workout{display:flex;align-items:center;flex-direction:column;gap:5px;min-width:0;padding:5px 2px;border-radius:9px;background:rgba(96,166,237,.10)}',
      '.gf-split-grip{font-size:23px;line-height:1.25;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;min-height:27px}.gf-split-grip:active{cursor:grabbing}',
      '.gf-split-workout-copy{min-width:0;text-align:center}.gf-split-workout-copy b{display:block;font-size:11px;overflow-wrap:anywhere}.gf-split-workout-copy small{font-size:9px;line-height:1.3;opacity:.65;display:none}',
      '.gf-split-day-select{min-width:0;width:100%;max-width:100%;font-size:9px;border-radius:6px;background:var(--surface,#142236);color:inherit;border:1px solid rgba(164,195,230,.22)}',
      '.gf-split-rest{opacity:.45;font-size:10px;text-align:center;padding:15px 1px}.gf-split-ghost{position:fixed;z-index:9999;pointer-events:none;padding:8px 13px;border-radius:12px;background:#193d60;color:white;box-shadow:0 8px 30px #0009;font-size:13px;font-weight:700}',
      '@media(max-width:650px){.gf-split-week{grid-template-columns:repeat(4,minmax(0,1fr))}.gf-split-day{min-height:97px}.gf-split-workout-copy small{display:none}.gf-split-day-select{font-size:10px}}',
      '@media(prefers-reduced-motion:reduce){.gf-split-ghost{transition:none}}'
    ].join('\n');document.head.appendChild(el);
  }
  function decorateOnboarding(){
    var form=document.getElementById('canSessions'),card=document.getElementById('tourCard');
    if(!form||!card||document.getElementById('gfOnboardSplit'))return;
    var p=typeof canonicalOnboarding!=='undefined'&&canonicalOnboarding&&canonicalOnboarding.profile;
    if(!p)return;
    var wrapper=document.createElement('div');wrapper.className='canon-field wide';wrapper.innerHTML=fieldHTML('gfOnboardSplit',p.trainingSplit||currentMode());
    form.closest('.canon-field')?.insertAdjacentElement('afterend',wrapper);
    wrapper.querySelector('select').addEventListener('change',function(){p.trainingSplit=this.value;});
  }
  function decorateProfile(){
    var grid=document.querySelector('#sessionSheet .profile-editor-grid');
    if(!grid||document.getElementById('gfProfileSplit'))return;
    var div=document.createElement('div');div.className='wide';div.innerHTML=fieldHTML('gfProfileSplit',currentMode());grid.appendChild(div);
  }
  function decorateSettings(){
    var sheet=document.getElementById('settingsSheet');
    if(!sheet||!available()||typeof gfSocialTab!=='undefined'&&gfSocialTab!=='settings'||document.getElementById('gfAccountSplit'))return;
    var grp=document.createElement('div');grp.className='settings-group';
    var problems=currentMode()==='ppl'?validateSessions(plan.training.sessions):[];
    grp.innerHTML='<div class="eyebrow">Training structure</div>'+fieldHTML('gfAccountSplit',currentMode())+
      '<button id="gfRebuildPPL" class="btn secondary" style="width:100%" type="button">Preview / rebuild strict PPL workouts</button>'+
      (problems.length?'<p class="small">Current programme has '+problems.length+' split conflicts. Rebuild to enforce strict PPL; workout history will remain.</p>':'');
    var before=sheet.querySelector('#gf58SettingsAvailability')||sheet.querySelector('.settings-group')||sheet.querySelector('.gf-social-hub');
    if(before&&before.classList.contains('gf-social-hub'))before.appendChild(grp);
    else if(before)before.insertAdjacentElement('afterend',grp);
    else sheet.appendChild(grp);
    grp.querySelector('#gfAccountSplit').addEventListener('change',function(){setMode(this.value);});
    grp.querySelector('#gfRebuildPPL').addEventListener('click',rebuild);
  }
  function rebuild(){
    if(!available())return;
    var n=plan.training.sessions.length;
    if(n<3||n>6){notify('PPL rebuild supports 3 to 6 weekly sessions');return;}
    var originals=typeof starterSessions==='function'?starterSessions(3):[];
    var proposed=makePPLSessions(n,originals),messages=validateSessions(proposed);
    if(messages.length){notify('Could not validate the PPL template');return;}
    var summary=proposed.map(function(s){return s.name+': '+s.exercises.length+' exercises';}).join('\n');
    if(!root.confirm('Replace the current '+n+' training sessions with strict PPL days?\n\n'+summary+'\n\nYour existing workout logs are kept. The current exercise programme will be replaced.'))return;
    plan.training.sessions=proposed;plan.training.sessionsPerWeek=n;plan.training.splitMode='ppl';
    progress.settings.trainingSplitMode='ppl';progress.settings.trainingSessionAssignments={};
    ensure();write();redraw();notify('PPL programme rebuilt');
    if(document.getElementById('settingsModal')?.classList.contains('open')&&typeof openSettings==='function')openSettings();
  }
  function installWrappers(){
    if(installing||typeof renderTrain!=='function'||typeof write!=='function')return false;
    installing=true;
    var baseRenderTrain=renderTrain;
    renderTrain=function(){
      var result=baseRenderTrain.apply(this,arguments);
      var target=document.getElementById('train');
      if(target&&available()){target.querySelector('.gf-split-board')?.remove();target.insertAdjacentHTML('afterbegin',dayBoard());}
      return result;
    };
    if(typeof sessionForDate==='function'){
      var baseSessionForDate=sessionForDate;
      sessionForDate=function(d){
        if(available()&&typeof isTrainingDate==='function'&&isTrainingDate(d)){
          var s=ensure(),id=s&&s.trainingSessionAssignments[d.getDay()];
          var selected=id!=null&&plan.training.sessions.find(function(x){return String(x.id)===String(id);});
          if(selected)return selected;
        }
        return baseSessionForDate.apply(this,arguments);
      };
    }
    if(typeof canonicalSessions==='function'){
      var baseCanonicalSessions=canonicalSessions;
      canonicalSessions=function(){
        var result=baseCanonicalSessions.apply(this,arguments),p=typeof canonicalOnboarding!=='undefined'&&canonicalOnboarding&&canonicalOnboarding.profile;
        if(p&&p.trainingSplit==='ppl')return makePPLSessions(Number(p.sessions)||3,typeof starterSessions==='function'?starterSessions(3):result);
        return result;
      };
    }
    if(typeof canonicalPlanPreview==='function'){
      var basePreview=canonicalPlanPreview;
      canonicalPlanPreview=function(){
        var result=basePreview.apply(this,arguments),p=canonicalOnboarding&&canonicalOnboarding.profile;
        result.training.splitMode=p&&p.trainingSplit==='ppl'?'ppl':'auto';
        result.onboarding.splitMode=result.training.splitMode;
        return result;
      };
    }
    if(typeof canonicalSaveProfile==='function'){
      var baseSave=canonicalSaveProfile;
      canonicalSaveProfile=function(){
        var sel=document.getElementById('gfOnboardSplit'),p=canonicalOnboarding&&canonicalOnboarding.profile;
        if(p&&sel){p.trainingSplit=sel.value;if(sel.value==='ppl'&&Number(document.getElementById('canSessions')?.value)<3){
          notify('Choose 3 or more workout days for PPL');return;
        }}
        return baseSave.apply(this,arguments);
      };
    }
    if(typeof renderCanonicalOnboarding==='function'){
      var baseRenderOnboard=renderCanonicalOnboarding;
      renderCanonicalOnboarding=function(){var r=baseRenderOnboard.apply(this,arguments);decorateOnboarding();return r;};
    }
    if(typeof openProfileEditor==='function'){
      var baseProfile=openProfileEditor;openProfileEditor=function(){var r=baseProfile.apply(this,arguments);decorateProfile();return r;};
    }
    if(typeof saveProfileEdits==='function'){
      var baseProfileSave=saveProfileEdits;
      saveProfileEdits=function(){
        var v=document.getElementById('gfProfileSplit')?.value,was=currentMode();
        var r=baseProfileSave.apply(this,arguments);
        if(v&&v!==was&&plan&&plan.training){plan.training.splitMode=v;progress.settings.trainingSplitMode=v;write();}
        return r;
      };
    }
    if(typeof openSettings==='function'){
      var baseSettings=openSettings;openSettings=function(){var r=baseSettings.apply(this,arguments);decorateSettings();return r;};
    }
    if(typeof gfRenderSocialHub==='function'){
      var baseSocialHub=gfRenderSocialHub;
      gfRenderSocialHub=function(){var r=baseSocialHub.apply(this,arguments);decorateSettings();return r;};
    }

    // The 4.0.59 builder balances time by moving exercises across days.
    // In strict PPL mode, do not allow cross-group moves or mixed regeneration.
    function draftState(){return root.gf59PlannerState||null;}
    function strictDraft(){
      var q=draftState();if(!q||currentMode()!=='ppl')return true;
      if(validateSessions(q.baseline||[]).length){notify('Rebuild the existing mixed programme as PPL before editing');return false;}
      if(q.strategy==='spread')q.strategy='flex';
      q.overflowDay=null;
      var source=q.baseline||[];
      var days=Array.isArray(q.primary)?q.primary.slice():[];
      if(days.length<source.length){notify('Choose at least one primary workout day per PPL session');return false;}
      q.workoutCount=source.length;
      q.draft=source.map(function(original,i){
        var copy=JSON.parse(JSON.stringify(original));
        copy.weekdayIndex=Number(days[i]);copy.scheduleOrder=i;
        return copy;
      });
      return true;
    }
    if(typeof root.gf59GoEdit==='function'){
      var baseGoEdit=root.gf59GoEdit;
      root.gf59GoEdit=function(){
        if(currentMode()!=='ppl')return baseGoEdit.apply(this,arguments);
        var q=draftState();
        if(!q||validateSessions(q.baseline||[]).length){notify('Rebuild the existing mixed programme as PPL before editing');return;}
        if(q.strategy==='spread')q.strategy='flex';
        var result=baseGoEdit.apply(this,arguments);
        if(strictDraft()&&typeof root.gf59RenderPlanner==='function')root.gf59RenderPlanner();
        return result;
      };
    }
    if(typeof root.gf59CommitMove==='function'){
      var baseCommitMove=root.gf59CommitMove;
      root.gf59CommitMove=function(from,exercise,to){
        if(currentMode()==='ppl'){
          var q=draftState(),a=q?.draft?.[from]?.exercises?.[exercise],destination=q?.draft?.[to];
          var target=typeForSession(destination),group=exerciseGroup(a);
          if(!target||group!=='unknown'&&group!=='core'&&group!==target){notify('PPL lock: this exercise belongs on a different muscle day');return;}
        }
        return baseCommitMove.apply(this,arguments);
      };
    }
    if(typeof root.gf59GoImpact==='function'){
      var baseImpact=root.gf59GoImpact;
      root.gf59GoImpact=function(){
        if(currentMode()==='ppl'){
          var problems=validateSessions(draftState()?.draft||[]);
          if(problems.length){notify('PPL lock: '+problems[0]);return;}
        }
        return baseImpact.apply(this,arguments);
      };
    }
    if(typeof root.gf59Apply==='function'){
      var baseApply=root.gf59Apply;
      root.gf59Apply=function(){
        if(currentMode()==='ppl'){
          var problems=validateSessions(draftState()?.draft||[]);
          if(problems.length){notify('PPL lock: '+problems[0]);return;}
        }
        return baseApply.apply(this,arguments);
      };
    }
    if(typeof root.gf59RenderPlanner==='function'){
      var basePlannerRender=root.gf59RenderPlanner;
      root.gf59RenderPlanner=function(){
        var r=basePlannerRender.apply(this,arguments);
        var q=draftState(),sheet=document.getElementById('sessionSheet');
        if(q&&sheet&&currentMode()==='ppl'&&!sheet.querySelector('#gfSplitPlannerNote')){
          var note=document.createElement('div');note.id='gfSplitPlannerNote';note.className='gf51-editor-note';
          note.textContent='Strict PPL: Push, Pull and Legs are kept separate. Cross-group exercise moves and mixed plans will be blocked.';
          var head=sheet.querySelector('.gf51-flow')||sheet.querySelector('.eyebrow');
          if(head)head.insertAdjacentElement('afterbegin',note);
        }
        return r;
      };
    }
    var baseWrite=write;
    write=function(){
      if(available()){
        var saved=null;try{saved=JSON.parse(localStorage.getItem('gainFocusPlanV31')||'null');}catch(_){}
        if(currentMode()==='ppl'&&saved&&saved.client&&plan.client&&saved.client.id===plan.client.id){
          var prior=saved.training&&saved.training.sessions||[],next=plan.training.sessions||[];
          if(JSON.stringify(prior)!==JSON.stringify(next)){
            var errors=validateSessions(next);
            if(errors.length){plan.training.sessions=prior;notify('PPL edit blocked: '+errors[0]);}
          }
        }
      }
      return baseWrite.apply(this,arguments);
    };
    return true;
  }
  function installEvents(){
    document.addEventListener('change',function(e){
      var sel=e.target.closest('.gf-split-day-select');
      if(sel)assignSession(sel.dataset.session,Number(sel.value));
    });
    document.addEventListener('pointerdown',function(e){
      var grip=e.target.closest('.gf-split-grip');if(!grip||!e.isPrimary)return;
      var workout=grip.closest('.gf-split-workout');
      if(!workout)return;
      pointer={id:workout.dataset.session,handle:grip,startX:e.clientX,startY:e.clientY,ghost:null};
      grip.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    });
    document.addEventListener('pointermove',function(e){
      if(!pointer)return;
      var p=pointer,dist=Math.hypot(e.clientX-p.startX,e.clientY-p.startY);
      if(!p.ghost&&dist<6)return;
      if(!p.ghost){p.ghost=document.createElement('div');p.ghost.className='gf-split-ghost';p.ghost.textContent=(plan.training.sessions.find(function(s){return String(s.id)===p.id;})||{}).name||'Workout';document.body.appendChild(p.ghost);}
      p.ghost.style.left=(e.clientX+12)+'px';p.ghost.style.top=(e.clientY+12)+'px';
      document.querySelectorAll('.gf-split-over').forEach(function(el){el.classList.remove('gf-split-over');});
      document.elementFromPoint(e.clientX,e.clientY)?.closest('.gf-split-day')?.classList.add('gf-split-over');
      e.preventDefault();
    },{passive:false});
    function stop(e){
      if(!pointer)return;
      var p=pointer;pointer=null;p.ghost?.remove();
      var el=document.elementFromPoint(e.clientX,e.clientY)?.closest('.gf-split-day');
      document.querySelectorAll('.gf-split-over').forEach(function(x){x.classList.remove('gf-split-over');});
      if(el)assignSession(p.id,Number(el.dataset.gfDay));
    }
    document.addEventListener('pointerup',stop);
    document.addEventListener('pointercancel',function(){if(pointer)pointer.ghost?.remove();pointer=null;});
  }
  function boot(){
    if(!installWrappers())return;
    installStyles();installEvents();ensure();
    if(available()&&typeof write==='function')write();
    if(document.getElementById('train')&&typeof renderTrain==='function'&&document.getElementById('train').innerHTML)renderTrain();
  }
  root.GFSplitScheduler=Object.assign(model,{assign:assignSession,setMode:setMode,rebuild:rebuild});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(typeof window!=='undefined'?window:globalThis);
