// Lifecycle rules for TTL-tagged EC2 instances:
//   warning email before the TTL ends -> stop at expiry -> delete after the grace period.
// The Python (boto3) janitor applies the same rules on every scan.
import { buildAlert } from './alerts.js';
import { mockAlerts, mockInstances, SAVED_BEFORE_SESSION } from '../data/mock.js';

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const SCAN_INTERVAL = 5 * MINUTE;

export const DEFAULT_SETTINGS = {
  defaultTtl: 4,
  warnMin: 30,
  graceHours: 2,
  scanMin: 5,
  maxExtend: 24,
  maxLifeDays: 7,
  untagged: 'tag',
  dryRun: false,
  protectTag: 'cj:protect',
  email: 'you@example.com',
  events: { warn: true, stop: true, delete: true, extend: false },
};

export function getPhase(inst, now, settings) {
  if (inst.status === 'stopped') return 'stopped';
  return inst.ttlEnd - now <= settings.warnMin * MINUTE ? 'expiring' : 'running';
}

export const timeLeft = (inst, now) => (inst.status === 'stopped' ? inst.deleteAt - now : inst.ttlEnd - now);

export function remainingShare(inst, now, settings) {
  const span = inst.status === 'stopped' ? settings.graceHours * HOUR : Math.max(inst.ttlEnd - inst.ttlStart, 1);
  return Math.min(1, Math.max(0, timeLeft(inst, now) / span));
}

// hours stopped early x hourly rate, on top of what was saved before this session
export function totalSavings(state) {
  return state.instances.reduce(
    (sum, i) => (i.stoppedAt === null ? sum : sum + ((state.now - i.stoppedAt) / HOUR) * i.rate),
    state.savedBase
  );
}

export function initialState(now, settings) {
  const alerts = mockAlerts(now);
  return {
    now,
    speed: 1,
    settings,
    instances: mockInstances(now),
    alerts,
    nextAlertId: alerts.length + 1,
    // seed includes hackathon-api's time stopped so far, so subtract it once
    savedBase: SAVED_BEFORE_SESSION - (55 / 60) * 0.0208,
  };
}

function addAlert(state, kind, inst, at, extra) {
  return {
    alerts: [buildAlert(state.nextAlertId, kind, inst, at, extra), ...state.alerts],
    nextAlertId: state.nextAlertId + 1,
  };
}

function tick(state) {
  const now = state.now + 1000 * state.speed;
  const { warnMin, graceHours, dryRun } = state.settings;
  let next = { ...state, now };

  const instances = state.instances.map((inst) => {
    let x = inst;
    if (x.status === 'running') {
      if (!x.warned && x.ttlEnd - now <= warnMin * MINUTE) {
        x = { ...x, warned: true };
        next = { ...next, ...addAlert(next, 'warn', x, x.ttlEnd - warnMin * MINUTE, { stopAt: x.ttlEnd }) };
      }
      if (now >= x.ttlEnd && !x.dryNoted) {
        if (dryRun) {
          x = { ...x, dryNoted: true };
          next = { ...next, ...addAlert(next, 'dryrun', x, x.ttlEnd, { action: 'stopped' }) };
        } else {
          x = { ...x, status: 'stopped', stoppedAt: x.ttlEnd, deleteAt: x.ttlEnd + graceHours * HOUR };
          next = { ...next, ...addAlert(next, 'stop', x, x.ttlEnd, { deleteAt: x.deleteAt }) };
        }
      }
    }
    if (x.status === 'stopped' && now >= x.deleteAt && !x.dryNoted) {
      if (dryRun) {
        x = { ...x, dryNoted: true };
        next = { ...next, ...addAlert(next, 'dryrun', x, x.deleteAt, { action: 'deleted' }) };
      } else {
        x = { ...x, status: 'terminated' };
        next = { ...next, ...addAlert(next, 'delete', x, x.deleteAt) };
      }
    }
    return x;
  });

  return { ...next, instances };
}

export function reducer(state, action) {
  const { now, settings } = state;
  const pick = (ids) => new Set(ids);

  switch (action.type) {
    case 'tick':
      return tick(state);

    case 'setSpeed':
      return { ...state, speed: action.speed };

    case 'saveSettings':
      return { ...state, settings: action.settings };

    case 'stop': {
      const ids = pick(action.ids);
      let next = state;
      const instances = state.instances.map((i) => {
        if (!ids.has(i.id) || i.status !== 'running') return i;
        const x = { ...i, status: 'stopped', stoppedAt: now, deleteAt: now + settings.graceHours * HOUR, warned: true, dryNoted: false };
        next = { ...next, ...addAlert(next, 'manual', x, now, { deleteAt: x.deleteAt }) };
        return x;
      });
      return { ...next, instances };
    }

    case 'extend': {
      const ids = pick(action.ids);
      const extra = action.hours * HOUR;
      let next = state;
      let banked = 0;
      const instances = state.instances.map((i) => {
        if (!ids.has(i.id) || i.status === 'terminated') return i;
        const restarting = i.status === 'stopped';
        // savings earned while stopped are kept when the instance restarts
        if (restarting) banked += ((now - i.stoppedAt) / HOUR) * i.rate;
        const x = restarting
          ? { ...i, status: 'running', ttlStart: now, ttlEnd: now + extra, stoppedAt: null, deleteAt: null }
          : { ...i, ttlEnd: i.ttlEnd + extra };
        x.warned = x.ttlEnd - now <= settings.warnMin * MINUTE;
        x.dryNoted = false;
        next = { ...next, ...addAlert(next, 'extend', x, now, { newEnd: x.ttlEnd }) };
        return x;
      });
      return { ...next, instances, savedBase: state.savedBase + banked };
    }

    case 'delete': {
      let next = state;
      const instances = state.instances.map((i) => {
        if (i.id !== action.id || i.status === 'terminated') return i;
        const x = { ...i, status: 'terminated', stoppedAt: i.stoppedAt ?? now };
        next = { ...next, ...addAlert(next, 'delete', x, now, { manual: true }) };
        return x;
      });
      return { ...next, instances };
    }

    default:
      return state;
  }
}
