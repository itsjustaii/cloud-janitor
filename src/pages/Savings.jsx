import { useState } from 'react';
import { Kpis, ThemeButton, Topbar } from '../components/Shell.jsx';
import { DAILY_SHAPE, SAVINGS_ROWS, SPENT_THIS_MONTH } from '../data/mock.js';
import { DAYS, formatMoney } from '../lib/format.js';

const HOW = {
  auto: { label: 'Stopped automatically', tone: 'tone-running' },
  manual: { label: 'Stopped by you', tone: 'tone-stopped' },
  grace: { label: 'Stopped, deleting soon', tone: 'tone-expiring' },
  deleted: { label: 'Deleted after grace', tone: 'tone-stopped' },
};
const COLS = { gridTemplateColumns: 'minmax(220px, 1.8fr) minmax(170px, 1.2fr) 110px 100px 100px', padding: '0 20px' };
const FIRST_DAY = new Date(2026, 9, 1).getDay(); // 1 October 2026

function DailyChart({ total }) {
  const [hover, setHover] = useState(null);
  const sum = DAILY_SHAPE.reduce((a, b) => a + b, 0);
  const values = DAILY_SHAPE.map((v) => (v * total) / sum);
  const step = Math.max(...values) > 2 ? 1 : 0.5;
  const top = Math.ceil(Math.max(...values) / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const last = values.length - 1;
  const dayName = (i) => `${DAYS[(FIRST_DAY + i) % 7]} ${i + 1} Oct`;

  return (
    <section className="panel" aria-label="Saved per day" style={{ flex: '2 1 560px', minWidth: 0, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <h2 className="h2">Saved per day</h2>
        <div aria-live="polite" style={{ fontSize: 13, color: 'var(--text-2)', minHeight: 19 }}>
          {hover === null ? 'Hover a bar to see that day' : `${dayName(hover)}: ${formatMoney(values[hover])} saved${hover === last ? ' so far' : ''}`}
        </div>
      </div>
      <div className="chart">
        <div className="chart-axis">
          {ticks.map((t) => <span key={t} style={{ bottom: `${(t / top) * 100}%` }}>${step < 1 ? t.toFixed(1) : t}</span>)}
        </div>
        <div className="chart-plot">
          {ticks.map((t) => <span key={t} className={`gridline${t === 0 ? ' base' : ''}`} style={{ bottom: `${(t / top) * 100}%` }} />)}
          <div className="chart-bars">
            {values.map((v, i) => (
              <button key={i} type="button" aria-label={`${dayName(i)}, ${formatMoney(v)} saved`}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
                <span className={i === last ? 'partial' : ''} style={{ height: `${Math.max(2, (v / top) * 100)}%` }} />
              </button>
            ))}
          </div>
        </div>
        <span />
        <div className="chart-x">{values.map((_, i) => <span key={i}>{i % 5 === 0 || i === last ? i + 1 : ''}</span>)}</div>
      </div>
      <div className="kpi-sub">Today is still counting, so its bar is lighter.</div>
    </section>
  );
}

export default function Savings({ dark, onTheme }) {
  const rows = [...SAVINGS_ROWS].sort((a, b) => b.saved - a.saved);
  const total = rows.reduce((s, r) => s + r.saved, 0);
  const hours = rows.reduce((s, r) => s + r.hours, 0);
  const deleted = rows.filter((r) => r.how === 'deleted').length;

  const byHow = Object.entries(
    rows.reduce((acc, r) => {
      acc[r.how] = acc[r.how] || { v: 0, n: 0 };
      acc[r.how].v += r.saved;
      acc[r.how].n += 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1].v - a[1].v);
  const maxHow = byHow[0]?.[1].v || 1;

  return (
    <>
      <Topbar title="Savings" sub="October 2026, 1 to 21 October">
        <ThemeButton dark={dark} onToggle={onTheme} />
      </Topbar>
      <main className="page">
        <Kpis items={[
          { label: 'Saved this month', value: formatMoney(total), sub: 'compared with leaving instances on' },
          { label: 'Compute hours avoided', value: `${hours} h`, sub: `across ${rows.length} instances` },
          { label: 'Instances cleaned up', value: deleted, sub: 'deleted after their grace period' },
          { label: 'Bill reduced by', value: `${Math.round((total / (total + SPENT_THIS_MONTH)) * 100)}%`, sub: `${formatMoney(SPENT_THIS_MONTH)} spent instead of ${formatMoney(SPENT_THIS_MONTH + total)}` },
        ]} />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'stretch' }}>
          <DailyChart total={total} />
          <section className="panel" aria-label="How it was saved" style={{ flex: '1 1 300px', minWidth: 0, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 className="h2">How it was saved</h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {byHow.map(([how, { v, n }]) => (
                <li key={how} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontWeight: 500 }}>{HOW[how].label} <span className="cell-sub">{n} {n === 1 ? 'instance' : 'instances'}</span></span>
                    <strong>{formatMoney(v)}</strong>
                  </div>
                  <div className="track thick"><div className="bar-running" style={{ width: `${(v / maxHow) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
            <div className="kpi-sub" style={{ marginTop: 'auto' }}>Most savings come from the janitor stopping instances you forgot about.</div>
          </section>
        </div>

        <section className="panel" style={{ overflow: 'hidden' }} aria-label="Savings by instance">
          <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <h2 className="h2">By instance</h2>
            <span className="cell-sub">Sorted by amount saved, highest first</span>
          </div>
          <div className="table-scroll">
            <div role="table" aria-label="Savings by instance" style={{ minWidth: 700 }}>
              <div role="row" className="trow head" style={COLS}>
                <div role="columnheader">Instance</div>
                <div role="columnheader">What happened</div>
                <div role="columnheader" className="right">Hours off</div>
                <div role="columnheader" className="right">Rate</div>
                <div role="columnheader" className="right" aria-sort="descending">Saved</div>
              </div>
              {rows.map((r) => (
                <div key={r.name} role="row" className="trow" style={COLS}>
                  <div role="cell" style={{ display: 'flex', flexDirection: 'column' }}><strong style={{ fontWeight: 600 }}>{r.name}</strong><span className="cell-sub">{r.type}</span></div>
                  <div role="cell"><span className={`pill ${HOW[r.how].tone}`}>{HOW[r.how].label}</span></div>
                  <div role="cell" className="right" style={{ color: 'var(--text-2)' }}>{r.hours} h</div>
                  <div role="cell" className="right" style={{ color: 'var(--text-2)' }}>${r.rate}</div>
                  <div role="cell" className="right" style={{ fontWeight: 600 }}>{formatMoney(r.saved)}</div>
                </div>
              ))}
              <div role="row" className="trow total" style={COLS}>
                <div role="cell">Total</div><div role="cell" />
                <div role="cell" className="right">{hours} h</div><div role="cell" />
                <div role="cell" className="right">{formatMoney(total)}</div>
              </div>
            </div>
          </div>
        </section>

        <p className="cell-sub" style={{ maxWidth: '80ch' }}>
          How savings are worked out: the hours an instance stayed stopped or deleted instead of running, multiplied by its on-demand hourly rate. Rates are Linux prices for us-east-1.
        </p>
      </main>
    </>
  );
}
