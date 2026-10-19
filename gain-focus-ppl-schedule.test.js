/* Gain Focus PPL split/schedule core regressions. Run: node gain-focus-ppl-schedule.test.js */
'use strict';
const assert = require('node:assert/strict');
global.window = {};
require('./gain-focus-ppl-schedule.js');
const {group,rebuild,assign,sameSplit} = window.GF74.core;
const originals = [
 {id:'push',name:'Push',exercises:[{name:'Incline Dumbbell Press',focus:'Chest'},{name:'Seated Shoulder Press',focus:'Shoulders'},{name:'Lateral Raise',focus:'Side delts'}]},
 {id:'pull',name:'Pull',exercises:[{name:'Lat Pulldown',focus:'Lats'},{name:'Seated Cable Row',focus:'Mid-back'},{name:'Dumbbell Curl',focus:'Biceps'}]},
 {id:'legs',name:'Legs',exercises:[{name:'Leg Press',focus:'Quads'},{name:'Romanian Deadlift',focus:'Hamstrings / glutes'},{name:'Leg Curl',focus:'Hamstrings'}]}
];
assert.equal(group({name:'Leg Press'}),'legs');
assert.equal(group({name:'Face Pull'}),'pull');
assert.equal(group({name:'Triceps Pushdown'}),'push');
const before=JSON.stringify(originals);
const three=rebuild(originals,3,[1,3,5]);
assert(three.ok,three.errors?.join(', '));
assert(sameSplit(three.sessions));
assert.deepEqual(three.sessions.map(s=>s.weekdayIndex),[1,3,5]);
assert.equal(three.sessions.flatMap(s=>s.exercises).length,9);
assert.equal(JSON.stringify(originals),before,'rebuild may not mutate source');
const five=rebuild(originals,5,[1,2,3,4,5]);
assert(five.ok,five.errors?.join(', '));
assert(sameSplit(five.sessions),'five-day plans cannot mix groups');
assert.equal(five.sessions.flatMap(s=>s.exercises).length,9,'no duplicated/dropped exercises');
assert.equal(rebuild(originals,2,[1,3]).ok,false,'PPL requires three days');
assert.equal(rebuild([{name:'Day 1',exercises:[{name:'Unknown exercise'}]}],3,[1,3,5]).ok,false,'do not silently allocate unknown exercise');
const swapped=assign(three.sessions,three.sessions[0].id,3);
assert(swapped.ok&&swapped.swapped,'occupied day must swap');
assert.equal(swapped.sessions.find(s=>s.id===three.sessions[0].id).weekdayIndex,3);
assert.equal(new Set(swapped.sessions.map(s=>s.weekdayIndex)).size,3);
const rest=assign(three.sessions,three.sessions[0].id,2);
assert(rest.ok&&!rest.swapped,'rest day should be a move');
assert.equal(rest.sessions.find(s=>s.id===three.sessions[0].id).weekdayIndex,2);
assert.equal(new Set(rest.sessions.map(s=>s.weekdayIndex)).size,3);
console.log('PASS: PPL groups, 3/5 days, unknown rejection, no-loss, swap, rest move');
