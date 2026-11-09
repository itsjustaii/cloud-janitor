import { useState } from 'react';
import Icon from '../components/Icons.jsx';
import { Chips, Kpis, Search, ThemeButton, Topbar } from '../components/Shell.jsx';
import { ALERT_KINDS } from '../lib/alerts.js';
import { formatDay, formatTime } from '../lib/format.js';

const LOOK = {
  warn: { icon: 'warn', tone: 'tone-expiring' },
  stop: { icon: 'stop', tone: 'tone-stopped' },
  manual: { icon: 'stop', tone: 'tone-stopped' },
  delete: { icon: 'trash', tone: 'tone-danger' },
  extend: { icon: 'extend', tone: 'tone-running' },
  dryrun: { icon: 'info', tone: 'tone-expiring' },
};
const matches = (a, type) => type === 'all' || a.kind === type || (type === 'stop' && a.kind === 'manual');

export default function Alerts({ alerts, now, dark, onTheme }) {
  const [type, setType] = useState('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(alerts[0]?.id ?? null);

  const q = query.trim().toLowerCase();
  const shown = alerts.filter((a) => matches(a, type) && (!q || a.instance.toLowerCase().includes(q)));
  const count = (t) => alerts.filter((a) => matches(a, t)).length;

  const groups = [];
  shown.forEach((a) => {
    const label = formatDay(a.at, now);
    if (groups.at(-1)?.label !== label) groups.push({ label, items: [] });
    groups.at(-1).items.push(a);
  });

  return (
    <>
      <Topbar title="Alerts" sub="Emails Cloud Janitor sent through AWS SNS">
        <ThemeButton dark={dark} onToggle={onTheme} />
      </Topbar>
      <main className="page">
        <Kpis items={[
          { label: 'Emails sent', value: alerts.length, sub: 'in the last 3 days', swatch: 'sw-text' },
          { label: 'Expiry warnings', value: count('warn'), sub: 'sent before an instance stops', swatch: 'sw-expiring' },
          { label: 'Stops', value: count('stop'), sub: 'automatic and by you', swatch: 'sw-stopped' },
          { label: 'Deletions', value: count('delete'), sub: 'after the grace period', swatch: 'sw-danger' },
        ]} />

        <section className="panel" style={{ overflow: 'hidden' }} aria-label="Alert history">
          <div className="toolbar">
            <Chips label="Alert type" value={type} onChange={setType} options={[
              { id: 'all', label: 'All', count: alerts.length },
              { id: 'warn', label: 'Warnings', count: count('warn') },
              { id: 'stop', label: 'Stopped', count: count('stop') },
              { id: 'delete', label: 'Deleted', count: count('delete') },
              { id: 'extend', label: 'Extended', count: count('extend') },
            ]} />
            <Search value={query} onChange={setQuery} placeholder="Search by instance" />
          </div>

          {shown.length === 0 && (
            <div className="empty">No alerts match these filters. <button type="button" className="link" onClick={() => { setType('all'); setQuery(''); }}>Clear filters</button></div>
          )}

          {groups.map((g) => (
            <div key={g.label}>
              <h2 className="day-head">{g.label}</h2>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {g.items.map((a) => {
                  const open = openId === a.id;
                  return (
                    <li key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <button type="button" className="alert-row" aria-expanded={open} onClick={() => setOpenId(open ? null : a.id)}>
                        <span className={`alert-icon ${LOOK[a.kind].tone}`}><Icon name={LOOK[a.kind].icon} size={16} /></span>
                        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <strong style={{ fontWeight: 600 }}>{ALERT_KINDS[a.kind].label}: {a.instance}</strong>
                          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{a.summary}</span>
                        </span>
                        <span className="cell-sub" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', whiteSpace: 'nowrap' }}>
                          <span style={{ color: 'var(--text-2)' }}>{formatTime(a.at)}</span>Emailed to you
                        </span>
                        <span className="chev" style={{ display: 'flex', color: 'var(--muted)' }}><Icon name="down" size={16} /></span>
                      </button>
                      {open && (
                        <>
                          <div className="email">
                            <div className="email-meta">
                              <span className="muted">Subject</span><strong>{a.subject}</strong>
                              <span className="muted">To</span><span>Your email, through the cloud-janitor-alerts topic</span>
                              <span className="muted">Sent</span><span>{formatDay(a.at, now)} at {formatTime(a.at)}</span>
                            </div>
                            <div className="email-body">{a.body}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 16, margin: '-6px 16px 16px 60px', fontSize: 13 }}>
                            <a href="#/instances" style={{ fontWeight: 600, textDecoration: 'none' }}>Open Instances</a>
                            <span className="muted">SNS message ID {a.msgId}</span>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <div className="table-foot">Showing {shown.length} of {alerts.length} alerts. Every email SNS sends is also saved here, newest first.</div>
        </section>
      </main>
    </>
  );
}
