import { useEffect, useRef, useState } from 'react';
import Icon, { Dots } from '../components/Icons.jsx';
import { Chips, Kpis, Modal, Search, ThemeButton, Topbar } from '../components/Shell.jsx';
import { getPhase, HOUR, MINUTE, remainingShare, SCAN_INTERVAL, timeLeft, totalSavings } from '../lib/lifecycle.js';
import { formatClock, formatCountdown, formatMoney, formatScan } from '../lib/format.js';

const COLS = { gridTemplateColumns: '40px minmax(220px, 1.6fr) 132px minmax(200px, 1.4fr) 110px 128px' };
const LABEL = { running: 'Running', expiring: 'Expiring soon', stopped: 'Stopped' };

function StatusPill({ phase }) {
  return <span className={`pill tone-${phase}`}><span className="pill-dot" />{LABEL[phase]}</span>;
}

function Bar({ inst, now, settings, thick }) {
  const pct = remainingShare(inst, now, settings) * 100;
  return (
    <div className={`track${thick ? ' thick' : ''}`} role="img" aria-label={`${Math.round(pct)} percent of time left`}>
      <div className={`bar-${getPhase(inst, now, settings)}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function RowMenu({ inst, stopped, onOpen, onStop, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const run = (fn) => () => { setOpen(false); fn(); };

  return (
    <div ref={ref} style={{ position: 'relative' }} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <button type="button" className="btn btn-sm btn-icon" style={{ width: 32 }} aria-label={`More actions for ${inst.name}`} aria-expanded={open} onClick={() => setOpen(!open)}>
        <Dots />
      </button>
      {open && (
        <div className="menu" role="menu">
          <button type="button" role="menuitem" onClick={run(onOpen)}>View details</button>
          {!stopped && <button type="button" role="menuitem" onClick={run(onStop)}>Stop now</button>}
          <hr />
          <button type="button" role="menuitem" onClick={run(onDelete)} style={{ color: 'var(--danger)' }}>Delete now</button>
        </div>
      )}
    </div>
  );
}

function DetailModal({ inst, now, settings, position, onPrev, onNext, onClose, onExtend, onStop, onDelete }) {
  const phase = getPhase(inst, now, settings);
  const stopped = phase === 'stopped';
  const warnAt = inst.ttlEnd - settings.warnMin * MINUTE;
  const early = inst.stoppedAt !== null && inst.stoppedAt < inst.ttlEnd;
  const steps = [
    { label: 'Launched with TTL tag', note: 'Tracked by Cloud Janitor', at: inst.ttlStart, done: true },
    { label: 'Warning email sent', note: early ? 'Skipped, stopped early' : `${settings.warnMin} minutes before expiry`, at: warnAt, done: stopped || now >= warnAt },
    { label: early ? 'Stopped manually' : 'Stopped automatically', note: 'Compute billing ends', at: inst.stoppedAt ?? inst.ttlEnd, done: stopped },
    { label: 'Deleted', note: `After a ${settings.graceHours} hour grace period`, at: inst.deleteAt ?? inst.ttlEnd + settings.graceHours * HOUR, done: false },
  ];
  const current = steps.findIndex((s) => !s.done);

  return (
    <Modal labelId="detail-title" onClose={onClose} onKeyDown={(e) => { if (e.key === 'ArrowLeft') onPrev(); if (e.key === 'ArrowRight') onNext(); }}>
      <div className="dialog-head">
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <h2 id="detail-title" style={{ fontSize: 17, fontWeight: 600 }}>{inst.name}</h2>
          <div className="cell-sub">{inst.id}</div>
        </div>
        <span className="cell-sub" style={{ marginRight: 4 }}>{position.index + 1} of {position.total}</span>
        <button type="button" className="btn btn-icon" onClick={onPrev} disabled={position.index === 0} aria-label="Previous instance"><Icon name="left" size={16} /></button>
        <button type="button" className="btn btn-icon" onClick={onNext} disabled={position.index === position.total - 1} aria-label="Next instance"><Icon name="right" size={16} /></button>
        <span style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 4px' }} />
        <button type="button" className="btn btn-icon btn-plain" onClick={onClose} aria-label="Close details" autoFocus><Icon name="close" /></button>
      </div>

      <div className="dialog-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px 32px', alignItems: 'start' }}>
        <div className="panel" style={{ gridColumn: '1 / -1', padding: 16, background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span><StatusPill phase={phase} /></span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.1 }}>{formatCountdown(timeLeft(inst, now))}</span>
            <span style={{ color: 'var(--text-2)' }}>{stopped ? 'until deleted' : 'until it stops'}</span>
          </div>
          <Bar inst={inst} now={now} settings={settings} thick />
        </div>

        <dl className="facts">
          <dt>Instance type</dt><dd>{inst.type}</dd>
          <dt>Cost while running</dt><dd>${inst.rate} per hour</dd>
          <dt>Launched</dt><dd>{formatClock(inst.ttlStart, now)}</dd>
          <dt>TTL expires</dt><dd>{formatClock(inst.ttlEnd, now)}</dd>
          <dt>Region</dt><dd>us-east-1</dd>
        </dl>

        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>Lifecycle</h3>
          <ol className="steps">
            {steps.map((s, i) => (
              <li key={s.label} className={`step ${s.done ? 'done' : i === current ? 'now' : 'next'}`}>
                <div className="step-marker"><span className="step-dot" /><span className="step-rail" /></div>
                <div className="step-body"><span className="step-label">{s.label}</span><span className="cell-sub">{s.note}</span></div>
                <span className="step-time">{formatClock(s.at, now)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="dialog-foot">
        <button type="button" className="btn btn-lg btn-danger" onClick={onDelete}>Delete now</button>
        <span style={{ flexGrow: 1 }} />
        {!stopped && <button type="button" className="btn btn-lg" onClick={onStop}>Stop now</button>}
        <button type="button" className="btn btn-lg btn-primary" onClick={onExtend}>{stopped ? 'Restart for 4 hours' : 'Extend by 1 hour'}</button>
      </div>
    </Modal>
  );
}

function ConfirmDelete({ inst, onCancel, onConfirm }) {
  return (
    <Modal labelId="del-title" onClose={onCancel} small role="alertdialog">
      <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 id="del-title" style={{ fontSize: 17, fontWeight: 600 }}>Delete {inst.name} now?</h2>
        <p style={{ color: 'var(--text-2)' }}>The instance is terminated and its disk is deleted. This can't be undone.</p>
      </div>
      <div className="dialog-foot" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-lg" onClick={onCancel} autoFocus>Cancel</button>
        <button type="button" className="btn btn-lg btn-primary" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={onConfirm}>Delete now</button>
      </div>
    </Modal>
  );
}

export default function Instances({ state, dispatch, toast, dark, onTheme }) {
  const { now, settings } = state;
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [checked, setChecked] = useState(new Set());
  const [openId, setOpenId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const live = state.instances.filter((i) => i.status !== 'terminated');
  const phaseOf = (i) => getPhase(i, now, settings);
  const q = query.trim().toLowerCase();
  const visible = live
    .filter((i) => (status === 'all' || phaseOf(i) === status) && (!q || `${i.name} ${i.id}`.toLowerCase().includes(q)))
    .sort((a, b) => timeLeft(a, now) - timeLeft(b, now));

  const count = (p) => live.filter((i) => phaseOf(i) === p).length;
  const open = live.find((i) => i.id === openId);
  const order = open && visible.includes(open) ? visible : live;
  const index = open ? order.indexOf(open) : -1;
  const toDelete = live.find((i) => i.id === deleteId);
  const checkedIds = [...checked].filter((id) => live.some((i) => i.id === id));
  const allChecked = visible.length > 0 && visible.every((i) => checked.has(i.id));

  const extend = (inst) => {
    const restarting = inst.status === 'stopped';
    dispatch({ type: 'extend', ids: [inst.id], hours: restarting ? 4 : 1 });
    toast(restarting ? `${inst.name} restarted for 4 hours` : `${inst.name} extended by 1 hour`);
  };
  const stop = (inst) => {
    dispatch({ type: 'stop', ids: [inst.id] });
    toast(`${inst.name} stopped. Deletes in ${settings.graceHours} hours.`);
  };
  const confirmDelete = () => {
    dispatch({ type: 'delete', id: toDelete.id });
    toast(`${toDelete.name} deleted`);
    if (openId === toDelete.id) setOpenId(null);
    setDeleteId(null);
  };
  const toggle = (id) => {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id); else next.add(id);
    setChecked(next);
  };

  return (
    <>
      <Topbar title="Instances">
        <div className="topbar-meta"><Icon name="scan" size={15} />Next scan in <strong>{formatScan(SCAN_INTERVAL - (now % SCAN_INTERVAL))}</strong></div>
        <ThemeButton dark={dark} onToggle={onTheme} />
      </Topbar>

      <main className="page">
        <Kpis items={[
          { label: 'Running', value: count('running'), sub: `of ${live.length} tracked instances`, swatch: 'sw-running' },
          { label: 'Expiring soon', value: count('expiring'), sub: `stop within ${settings.warnMin} minutes`, swatch: 'sw-expiring' },
          { label: 'In grace period', value: count('stopped'), sub: `deleted after ${settings.graceHours} hours`, swatch: 'sw-stopped' },
          { label: 'Saved this month', value: formatMoney(totalSavings(state)), sub: 'from stopping idle instances', swatch: 'sw-text' },
        ]} />

        <section className="panel" style={{ overflow: 'hidden' }} aria-label="Instance list">
          <div className="toolbar">
            <Chips label="Status" value={status} onChange={setStatus} options={[
              { id: 'all', label: 'All statuses', count: live.length },
              { id: 'running', label: 'Running', count: count('running') },
              { id: 'expiring', label: 'Expiring soon', count: count('expiring') },
              { id: 'stopped', label: 'Stopped', count: count('stopped') },
            ]} />
            <Search value={query} onChange={setQuery} placeholder="Search by name or ID" />
          </div>

          {checkedIds.length > 0 && (
            <div className="bulkbar">
              <strong>{checkedIds.length} {checkedIds.length === 1 ? 'instance' : 'instances'} selected</strong>
              <button type="button" className="btn btn-sm" onClick={() => { dispatch({ type: 'extend', ids: checkedIds, hours: 1 }); setChecked(new Set()); toast(`${checkedIds.length} extended by 1 hour`); }}>Extend 1 hour</button>
              <button type="button" className="btn btn-sm" onClick={() => { dispatch({ type: 'stop', ids: checkedIds }); setChecked(new Set()); toast(`${checkedIds.length} stopped`); }}>Stop</button>
              <button type="button" className="btn btn-sm btn-plain" onClick={() => setChecked(new Set())}>Clear</button>
            </div>
          )}

          <div className="table-scroll">
            <div role="table" aria-label="Instances" style={{ minWidth: 820 }}>
              <div role="row" className="trow head" style={COLS}>
                <div role="columnheader"><input type="checkbox" className="checkbox" aria-label="Select all" checked={allChecked} onChange={() => setChecked(allChecked ? new Set() : new Set(visible.map((i) => i.id)))} /></div>
                <div role="columnheader">Name</div>
                <div role="columnheader">Status</div>
                <div role="columnheader" aria-sort="ascending" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Time left <Icon name="arrowDown" size={13} stroke={2.4} /></div>
                <div role="columnheader" className="right">Cost per hour</div>
                <div role="columnheader" className="right">Actions</div>
              </div>

              {visible.length === 0 && (
                <div className="empty">No instances match these filters. <button type="button" className="link" onClick={() => { setStatus('all'); setQuery(''); }}>Clear filters</button></div>
              )}

              {visible.map((inst) => {
                const phase = phaseOf(inst);
                const stopped = phase === 'stopped';
                return (
                  <div key={inst.id} role="row" className={`trow${openId === inst.id ? ' is-sel' : ''}`} style={COLS}>
                    <div role="cell"><input type="checkbox" className="checkbox" aria-label={`Select ${inst.name}`} checked={checked.has(inst.id)} onChange={() => toggle(inst.id)} /></div>
                    <div role="cell">
                      <button type="button" className="name-btn" onClick={() => setOpenId(inst.id)} aria-label={`Open details for ${inst.name}`}>
                        <strong>{inst.name}</strong><span className="cell-sub">{inst.id}, {inst.type}</span>
                      </button>
                    </div>
                    <div role="cell"><StatusPill phase={phase} /></div>
                    <div role="cell" style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <strong style={{ fontWeight: 600 }}>{formatCountdown(timeLeft(inst, now))}</strong>
                        <span className="cell-sub">{stopped ? 'until deleted' : 'until stop'}</span>
                      </div>
                      <Bar inst={inst} now={now} settings={settings} />
                    </div>
                    <div role="cell" className="right" style={{ color: 'var(--text-2)' }}>${inst.rate}</div>
                    <div role="cell" style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <button type="button" className="btn btn-sm" onClick={() => extend(inst)}>{stopped ? 'Restart' : 'Extend'}</button>
                      <RowMenu inst={inst} stopped={stopped} onOpen={() => setOpenId(inst.id)} onStop={() => stop(inst)} onDelete={() => setDeleteId(inst.id)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="table-foot">Showing {visible.length} of {live.length} instances. Prices are on-demand Linux rates for us-east-1.</div>
        </section>
      </main>

      {open && (
        <DetailModal
          inst={open} now={now} settings={settings}
          position={{ index, total: order.length }}
          onPrev={() => index > 0 && setOpenId(order[index - 1].id)}
          onNext={() => index < order.length - 1 && setOpenId(order[index + 1].id)}
          onClose={() => setOpenId(null)}
          onExtend={() => extend(open)}
          onStop={() => stop(open)}
          onDelete={() => setDeleteId(open.id)}
        />
      )}
      {toDelete && <ConfirmDelete inst={toDelete} onCancel={() => setDeleteId(null)} onConfirm={confirmDelete} />}
    </>
  );
}
