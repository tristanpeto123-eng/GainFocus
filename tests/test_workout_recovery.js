// Run: node tests/test_workout_recovery.js
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const code=fs.readFileSync(require('node:path').join(__dirname,'..','gain-focus-workout-recovery.js'),'utf8');
const model=require('../gain-focus-workout-recovery.js');
const done={id:'done',completed:true,sessionId:'pull',setEntries:[{exerciseKey:'row'}]};
const stuck={id:'stuck',completed:false,sessionName:'Upper A',sessionId:'upper-a',setEntries:[
  {id:'s1',exerciseKey:'bench',exerciseName:'Bench Press',focus:'Chest',weightKg:60,reps:8},
  {id:'s2',exerciseKey:'bench',exerciseName:'Bench Press',focus:'Chest',weightKg:60,reps:7}
]};
const blank={id:'blank',completed:false,sessionId:'push',setEntries:[]};
const initial=[done,stuck,blank];
assert.equal(model.pending(initial).length,2);
assert.deepEqual(model.discard(initial,'stuck'),[done,blank],'Completed records must survive discard');
assert.deepEqual(initial,[done,stuck,blank],'Discard does not mutate input');
assert.equal(model.discard(initial,'done').length,3,'Cannot remove a completed workout');
const part=model.asCompleted(initial,'stuck','2026-10-19T18:00:00Z');
assert.equal(part[1].completed,true);
assert.equal(part[1].partialWorkout,true);
assert.equal(part[1].exercises[0].sets,2);
assert.equal(part[1].setEntries.length,2);
assert.equal(part[0],done,'Other workouts are untouched');
assert.equal(model.asCompleted(initial,'blank','x')[2].completed,false,'No empty partial workouts');
let writes=0,restStops=0,closed=0,redraws=0,asks=0;
const progress={workoutLogs:[structuredClone(done),structuredClone(stuck),structuredClone(blank)],nutritionLogs:[{id:'meal'}]};
const root={addEventListener(){},confirm(){asks++;return true;},alert(){throw Error('Unexpected alert');}};
const context={window:root,document:{readyState:'loading',addEventListener(){},getElementById(){return null;}},progress,write(){writes++;},renderAll(){redraws++;},closeSession(){closed++;},skipCanonicalRest(){restStops++;},canonicalWorkout:{workoutId:'stuck'},console};
vm.runInNewContext(code,context);
assert.equal(typeof root.GFWorkoutRecovery.discardActive,'function');
assert.equal(root.GFWorkoutRecovery.discardActive('stuck'),true);
assert.equal(progress.workoutLogs.length,2);
assert.equal(progress.workoutLogs[0].id,'done');
assert.deepEqual(progress.nutritionLogs,[{id:'meal'}]);
assert.equal(context.canonicalWorkout,null);
assert.equal(writes,1);
assert.equal(restStops,1);
assert.equal(closed,1);
assert.equal(redraws,1);
assert.equal(asks,1);
assert.equal(root.GFWorkoutRecovery.finishPartial('blank'),false);
assert.equal(writes,1,'Empty unfinished session cannot be marked completed');
console.log('Gain Focus stuck-workout escape and data preservation: PASS');
