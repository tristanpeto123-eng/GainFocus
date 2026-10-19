// Run: node tests/test_split_scheduler.js
const assert = require('node:assert/strict');
const scheduler = require('../gain-focus-split-scheduler.js');
const base = [
  { id: 'push', name: 'Push', subtitle: 'Chest & triceps', exercises: [{ name: 'Bench Press', focus: 'Chest' }, { name: 'Flat Dumbbell Press', focus: 'Chest' }, { name: 'Cable Triceps Pushdown', focus: 'Triceps' }] },
  { id: 'pull', name: 'Pull', subtitle: 'Back & biceps', exercises: [{ name: 'Lat Pulldown', focus: 'Lats' }, { name: 'Seated Cable Row', focus: 'Mid-back' }] },
  { id: 'legs', name: 'Legs', subtitle: 'Leg day', exercises: [{ name: 'Leg Press', focus: 'Quads' }, { name: 'Romanian Deadlift', focus: 'Hamstrings' }] }
];
assert.equal(scheduler.exerciseGroup({ name: 'Leg Press', focus: 'Quads' }), 'legs');
assert.equal(scheduler.exerciseGroup({ name: 'Chest Supported Row', focus: 'Back' }), 'pull');
assert.equal(scheduler.exerciseGroup({ name: 'Seated Shoulder Press', focus: 'Delts' }), 'push');
assert.equal(scheduler.exerciseGroup({ name: 'Plank', focus: 'Core' }), 'core');
// Regression: 'lat' in Flat Dumbbell Press must not be classified as back/lats.
assert.equal(scheduler.exerciseGroup({ name: 'Flat Dumbbell Press', focus: 'Chest' }), 'push');
assert.equal(scheduler.exerciseGroup({ name: 'Lat Pulldown', focus: 'Lat width' }), 'pull');
assert.equal(scheduler.exerciseGroup({ name: 'Chest Supported Row', focus: 'Upper back' }), 'pull');
assert.deepEqual(scheduler.validateSessions(base), []);
const invalid = JSON.parse(JSON.stringify(base));
invalid[0].exercises.push({ name: 'Lat Pulldown', focus: 'Lats' });
assert.equal(scheduler.validateSessions(invalid).length, 1, 'Cross-group moves blocked');
for (const count of [3, 4, 5, 6]) {
  const output = scheduler.makePPLSessions(count, base);
  assert.equal(output.length, count);
  assert.equal(new Set(output.map(x => x.id)).size, count, 'Unique session IDs');
  assert.deepEqual(scheduler.validateSessions(output), [], 'No mixed days');
}
const initial = { 1: 'push', 3: 'pull', 5: 'legs' };
assert.deepEqual(scheduler.move(initial, 'push', 3), { 1: 'pull', 3: 'push', 5: 'legs' }, 'Swaps occupied days');
assert.deepEqual(scheduler.move(initial, 'push', 4), { 3: 'pull', 4: 'push', 5: 'legs' }, 'Move to rest day');
assert.deepEqual(initial, { 1: 'push', 3: 'pull', 5: 'legs' }, 'Input not mutated');
assert.deepEqual(scheduler.reconcile(base, { 1: 'push', 3: 'missing', 5: 'legs' }, [1, 3, 5]), initial, 'Orphan ID repaired');
assert.deepEqual(scheduler.reconcile(base, initial, [1, 3, 5]), initial, 'Existing user schedule preserved');
console.log('Gain Focus PPL split and weekly scheduler: 16 validation groups PASS');
