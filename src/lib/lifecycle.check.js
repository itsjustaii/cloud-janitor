// Quick self-check of the lifecycle rules. Run: npm run check
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, HOUR, MINUTE, initialState, reducer, totalSavings } from './lifecycle.js';

const run = (state, seconds) => {
  for (let i = 0; i < seconds; i++) state = reducer(state, { type: 'tick' });
  return state;
};
const find = (s, name) => s.instances.find((i) => i.name === name);

// db-practice has 18 min left: stops at expiry, deletes after the 2 h grace period
let s = initialState(0, DEFAULT_SETTINGS);
s = reducer(s, { type: 'setSpeed', speed: 60 }); // 1 tick = 1 minute
s = run(s, 19);
assert.equal(find(s, 'db-practice').status, 'stopped');
assert.equal(s.alerts[0].kind, 'stop');
s = run(s, 120);
assert.equal(find(s, 'db-practice').status, 'terminated');

// ml-notebook-gpu has 31 min left: warning goes out once at 30 min
s = initialState(0, DEFAULT_SETTINGS);
s = reducer(s, { type: 'setSpeed', speed: 60 });
s = run(s, 2);
assert.equal(s.alerts.filter((a) => a.kind === 'warn' && a.instance === 'ml-notebook-gpu').length, 1);

// dry run logs but never stops
s = initialState(0, { ...DEFAULT_SETTINGS, dryRun: true });
s = reducer(s, { type: 'setSpeed', speed: 60 });
s = run(s, 30);
assert.equal(find(s, 'db-practice').status, 'running');
assert.ok(s.alerts.some((a) => a.kind === 'dryrun' && a.instance === 'db-practice'));

// restarting a stopped instance keeps the savings it earned while stopped
s = initialState(0, DEFAULT_SETTINGS);
const before = totalSavings(s);
const id = find(s, 'hackathon-api').id;
s = reducer(s, { type: 'extend', ids: [id], hours: 4 });
assert.equal(find(s, 'hackathon-api').status, 'running');
assert.equal(find(s, 'hackathon-api').ttlEnd, 4 * HOUR);
assert.ok(Math.abs(totalSavings(s) - before) < 1e-9);

// manual stop starts the grace period now
s = initialState(0, DEFAULT_SETTINGS);
const web = find(s, 'web-lab-03').id;
s = reducer(s, { type: 'stop', ids: [web] });
assert.equal(find(s, 'web-lab-03').deleteAt, 2 * HOUR);
assert.equal(s.alerts[0].kind, 'manual');
assert.ok(MINUTE === 60_000);

console.log('lifecycle checks passed');
