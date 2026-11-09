// Mock data used until the dashboard is connected to the janitor backend.
// Hourly rates are AWS on-demand Linux prices for us-east-1.
import { buildAlert } from '../lib/alerts.js';

const M = 60_000;
const H = 60 * M;

function running(id, name, type, rate, msLeft, ttlLength, now) {
  return { id, name, type, rate, status: 'running', ttlStart: now + msLeft - ttlLength, ttlEnd: now + msLeft, stoppedAt: null, deleteAt: null, warned: msLeft <= 30 * M };
}

export function mockInstances(now) {
  const grace = running('i-0b62f9d7c4a3', 'hackathon-api', 't3.small', 0.0208, -55 * M, 12 * H, now);
  Object.assign(grace, { status: 'stopped', stoppedAt: grace.ttlEnd, deleteAt: grace.ttlEnd + 2 * H, warned: true });
  return [
    running('i-0c41e9a2f7b3', 'ml-notebook-gpu', 'g4dn.xlarge', 0.526, 31 * M + 20_000, 4 * H, now),
    running('i-07d2b85c1e60', 'db-practice', 't3.medium', 0.0416, 18 * M + 5_000, 2 * H, now),
    grace,
    running('i-0a9f3b6d2c18', 'web-lab-03', 't3.micro', 0.0104, 3 * H + 12 * M, 6 * H, now),
    running('i-0d77c3b1a9e5', 'cloud-assignment-vm', 't3.medium', 0.0416, 47 * M, 3 * H, now),
    running('i-0e5c7a1f9d24', 'cs-lab-shared', 'm5.large', 0.096, 6 * H + 4 * M, 8 * H, now),
    running('i-03b8d4e2a5f1', 'docker-sandbox', 't3.large', 0.0832, 11 * H + 40 * M, 24 * H, now),
    running('i-0f1a6c3e8b97', 'fyp-demo-server', 't3.small', 0.0208, 52 * H, 72 * H, now),
  ];
}

// [minutes ago, kind, name, id, type]
const ALERT_SEED = [
  [14, 'warn', 'db-practice', 'i-07d2b85c1e60', 't3.medium'],
  [55, 'stop', 'hackathon-api', 'i-0b62f9d7c4a3', 't3.small'],
  [70, 'extend', 'web-lab-03', 'i-0a9f3b6d2c18', 't3.micro'],
  [130, 'delete', 'quiz-scraper', 'i-0c19a4e7b2d5', 't3.micro'],
  [165, 'warn', 'quiz-scraper', 'i-0c19a4e7b2d5', 't3.micro'],
  [250, 'manual', 'db-practice-old', 'i-04e8b2c9f1a7', 't3.medium'],
  [25 * 60, 'delete', 'cloud-assignment-old', 'i-09a3c6e1d8b4', 't3.medium'],
  [27 * 60, 'stop', 'cloud-assignment-old', 'i-09a3c6e1d8b4', 't3.medium'],
  [27 * 60 + 30, 'warn', 'cloud-assignment-old', 'i-09a3c6e1d8b4', 't3.medium'],
  [30 * 60, 'extend', 'cs-lab-shared', 'i-0e5c7a1f9d24', 'm5.large'],
  [33 * 60, 'stop', 'jupyter-lab', 'i-02b7e9d4c3f6', 't3.large'],
  [49 * 60, 'delete', 'gpu-finetune', 'i-06f2a8c1e9b3', 'g4dn.xlarge'],
  [51 * 60, 'stop', 'gpu-finetune', 'i-06f2a8c1e9b3', 'g4dn.xlarge'],
  [51 * 60 + 30, 'warn', 'gpu-finetune', 'i-06f2a8c1e9b3', 'g4dn.xlarge'],
  [53 * 60, 'stop', 'render-farm-test', 'i-0a4d7f2b8e61', 'g4dn.xlarge'],
];

export function mockAlerts(now) {
  return ALERT_SEED.map(([ago, kind, name, id, type], i) => {
    const at = now - ago * M;
    return buildAlert(i + 1, kind, { id, name, type }, at, { newEnd: at + 4 * H });
  });
}

// Savings this month, one row per stop record in SQLite
// how: auto | manual | grace | deleted
export const SAVINGS_ROWS = [
  ['gpu-finetune', 'g4dn.xlarge', 0.526, 14.5, 'deleted'],
  ['render-farm-test', 'g4dn.xlarge', 0.526, 6.0, 'auto'],
  ['cs-lab-shared', 'm5.large', 0.096, 22, 'auto'],
  ['docker-sandbox', 't3.large', 0.0832, 18.5, 'auto'],
  ['db-practice', 't3.medium', 0.0416, 26, 'manual'],
  ['jupyter-lab', 't3.large', 0.0832, 12, 'auto'],
  ['cloud-assignment-old', 't3.medium', 0.0416, 20, 'deleted'],
  ['quiz-scraper', 't3.micro', 0.0104, 64, 'deleted'],
  ['hackathon-api', 't3.small', 0.0208, 31, 'grace'],
  ['web-lab-02', 't3.micro', 0.0104, 48, 'deleted'],
].map(([name, type, rate, hours, how]) => ({ name, type, rate, hours, how, saved: rate * hours }));

export const SAVED_BEFORE_SESSION = SAVINGS_ROWS.reduce((s, r) => s + r.saved, 0);
export const SPENT_THIS_MONTH = 11.4;

// Relative shape of daily savings for 1 to 21 October, scaled to the monthly total
export const DAILY_SHAPE = [0.62, 0.88, 0.14, 0.06, 1.2, 0.96, 0.74, 1.35, 0.92, 0.18, 0.09, 1.48, 1.12, 0.83, 0.97, 1.05, 0.21, 0.08, 1.66, 1.31, 0.44];
