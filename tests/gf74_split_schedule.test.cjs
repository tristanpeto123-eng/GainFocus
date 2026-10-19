'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','gainfocus-split-schedule.js'),'utf8');
const calls={saved:0,rendered:0,alerts:[]};
const plan={client:{},training:{muscleSplit:'ppl',sessions:[],primaryWeekdays:[1,3,5],selectedWeekdays:[1,3,5],availableWeekdays:[1,3,5]}};
const progress={settings:{trainingWeekdays:[1,3,5],primaryWeekdays:[1,3,5]},workoutLogs:[]};
const doc={
  addEventListener(){},getElementById(){return null},
  createElement(){return {style:{},dataset:{},remove(){}};},
  head:{appendChild(){}},querySelectorAll(){return [];},elementFromPoint(){return null;}
};
const window={gf59RenderPlanner(){},gf59OpenPlanBuilder(){}};
const context={window,document:doc,plan,progress,structuredClone,console,
  toast(m){calls.alerts.push(m)},write(){calls.saved++},renderTrain(){calls.rendered++},
  ensureProgressExtras(){},isTrainingDate(){return true;}};
vm.runInNewContext(source,context,{filename:'gainfocus-split-schedule.js'});
const {classify,reshape,assigned,scheduleHTML,validate}=window.gf74TestHelpers;
const base=[
  {id:'upper-a',name:'Upper',exercises:[
    {name:'Bench Press',focus:'Chest',sets:3},{name:'Lateral Raise',focus:'Shoulders',sets:3},
    {name:'Cable Curl',focus:'Biceps',sets:3}]},
  {id:'lower',name:'Lower',exercises:[
    {name:'Leg Press',focus:'Quads',sets:3},{name:'Romanian Deadlift',focus:'Hamstrings',sets:3},
    {name:'Plank',focus:'Core',sets:3}]},
  {id:'upper-b',name:'Upper',exercises:[
    {name:'Lat Pulldown',focus:'Back',sets:3},{name:'Rear Delt Fly',focus:'Rear delts',sets:3}]}
];
assert.equal(classify({name:'Chest Supported Row',focus:'Back'}),'pull');
assert.equal(classify({name:'Rear Delt Fly',focus:'Shoulders'}),'pull');
assert.equal(classify({name:'Plank',focus:'Core'}),'neutral');
assert.deepEqual(Array.from(assigned([{weekdayIndex:null},{weekdayIndex:undefined}],[1,5])),[1,5]);
const three=reshape(base,[1,3,5]);
assert.equal(three.length,3);
assert.deepEqual(Array.from(three,x=>x.splitGroup),['push','pull','legs']);
assert.equal(three.reduce((n,s)=>n+s.exercises.length,0),8);
assert.ok(three.every(s=>s.exercises.every(e=>['neutral',s.splitGroup].includes(classify(e,s.splitGroup)))));
assert.equal((scheduleHTML(three,'live').match(/class="gf74-day"/g)||[]).length,7);
assert.equal((scheduleHTML(three,'live').match(/class="gf74-session /g)||[]).length,3);
const four=reshape(base,[1,2,4,5]);
assert.equal(four.length,4);
assert.equal(four[0].splitGroup,'push');
assert.equal(four[3].splitGroup,'push');
assert.ok(four[0].exercises.length>0&&four[3].exercises.length>0);
assert.equal(four.reduce((n,s)=>n+s.exercises.length,0),8);
const q={gf74Split:'ppl',strategy:'spread',available:[1,3,5],primary:[1,3,5],
  workoutCount:3,draft:structuredClone(base)};
window.gf59PlannerState=q;
window.gf59RenderPlanner();
assert.equal(q.strategy,'flex');
assert.equal(q.draft.length,3);
assert.ok(validate(q));
assert.ok(q.draft.every(s=>s.exercises.every(e=>['neutral',s.splitGroup].includes(classify(e,s.splitGroup)))));
const qOverflow={gf74Split:'ppl',strategy:'flex',available:[1,3,5,6],primary:[1,3,5],workoutCount:3,
  draft:[...structuredClone(three),{id:'overflow',name:'Overflow',_overflow:true,exercises:[{name:'Dumbbell Fly',focus:'Chest',sets:3}]}]};
window.gf59PlannerState=qOverflow;
window.gf59RenderPlanner();
assert.equal(qOverflow.draft.reduce((n,s)=>n+s.exercises.length,0),9,'Overflow exercises must not be discarded');
plan.training.sessions=structuredClone(base);
window.gf74MoveSession('upper-a',3,'live');
assert.equal(plan.training.sessions[0].weekdayIndex,3);
assert.equal(plan.training.sessions[1].weekdayIndex,1);
assert.deepEqual(Array.from(progress.settings.trainingWeekdays),[1,3,5]);
assert.equal(calls.saved,1);
assert.equal(calls.rendered,1);
assert.equal(calls.alerts.at(-1),'Workout day updated');
console.log('PASS: strict PPL separation, repeated days, onboarding classification, seven-day board and legacy day swapping');
