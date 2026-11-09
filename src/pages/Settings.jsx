import { useState } from 'react';
import Icon from '../components/Icons.jsx';
import { ThemeButton, Topbar } from '../components/Shell.jsx';
import { SAVINGS_ROWS } from '../data/mock.js';

const NUMBERS = [
  ['defaultTtl', 'Default TTL', 'Used when the janitor adds a TTL tag to a new instance.', 'hours', 1, 72],
  ['warnMin', 'Warning email', 'How long before the TTL ends you get an email.', 'minutes', 5, 120],
  ['graceHours', 'Grace period', 'How long a stopped instance waits before it is deleted.', 'hours', 1, 24],
  ['scanMin', 'Scan interval', 'How often the janitor checks every instance.', 'minutes', 1, 60],
  ['maxExtend', 'Longest single extension', 'The most time one Extend can add.', 'hours', 1, 72],
  ['maxLifeDays', 'Longest total lifetime', 'An instance cannot be extended past this age.', 'days', 1, 30],
];
const EVENTS = [['warn', 'Is about to expire'], ['stop', 'Is stopped'], ['delete', 'Is deleted'], ['extend', 'Is extended']];
const PERMISSIONS = [
  ['ec2:DescribeInstances', 'read instances and tags'],
  ['ec2:CreateTags', 'set and extend TTL'],
  ['ec2:StopInstances', 'stop at expiry'],
  ['ec2:TerminateInstances', 'delete after grace'],
  ['sns:Publish', 'send alert emails'],
];

function downloadCsv(filename, header, rows) {
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

function Section({ id, title, desc, children, aside }) {
  return (
    <section className="panel" aria-labelledby={id}>
      <div className="panel-head" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px' }}>
        <div style={{ flexGrow: 1 }}>
          <h2 id={id}>{title}</h2>
          <p>{desc}</p>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export default function Settings({ settings, alerts, onSave, toast, dark, onTheme, credentials }) {
  const [draft, setDraft] = useState(settings);
  const set = (patch) => setDraft({ ...draft, ...patch });
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const emailConfirmed = draft.email && draft.email === settings.email;

  const save = () => {
    const invalid = NUMBERS.find(([key, , , , min, max]) => !(draft[key] >= min && draft[key] <= max));
    if (invalid) return toast(`${invalid[1]} must be between ${invalid[4]} and ${invalid[5]} ${invalid[3]}.`);
    onSave(draft);
    toast(draft.email !== settings.email ? 'Saved. Check your inbox and click Confirm to start getting alerts.' : 'Settings saved. They apply from the next scan.');
  };

  return (
    <>
      <Topbar title="Settings" sub="Rules the janitor follows on every scan">
        <ThemeButton dark={dark} onToggle={onTheme} />
      </Topbar>
      <main className="page settings">
        {draft.dryRun && (
          <div className="banner tone-expiring" role="status"><Icon name="warn" />Dry run is on. The janitor logs what it would do but does not stop or delete anything.</div>
        )}

        <Section id="s-life" title="Lifecycle rules" desc="When instances are warned, stopped and deleted.">
          {NUMBERS.map(([key, label, help, unit, min, max]) => (
            <div key={key} className="row">
              <label htmlFor={key} className="row-label"><span>{label}</span><span>{help}</span></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input id={key} className="field" type="number" min={min} max={max} value={draft[key]}
                  onChange={(e) => set({ [key]: e.target.value === '' ? '' : Number(e.target.value) })} style={{ width: 88, textAlign: 'right' }} />
                <span style={{ width: 64, color: 'var(--text-2)' }}>{unit}</span>
              </div>
            </div>
          ))}
          <div className="row">
            <label htmlFor="untagged" className="row-label"><span>Instances without a TTL tag</span><span>What the janitor does when it finds one.</span></label>
            <select id="untagged" className="field" value={draft.untagged} onChange={(e) => set({ untagged: e.target.value })} style={{ width: 200 }}>
              <option value="tag">Add the default TTL</option>
              <option value="warn">Just email me</option>
              <option value="ignore">Ignore them</option>
            </select>
          </div>
        </Section>

        <Section id="s-safe" title="Safety" desc="Stop the janitor from touching things it should not.">
          <div className="row">
            <div className="row-label"><span id="dry-label">Dry run</span><span>Log every action without stopping or deleting. Use this when testing.</span></div>
            <button type="button" className="switch" role="switch" aria-checked={draft.dryRun} aria-labelledby="dry-label" onClick={() => set({ dryRun: !draft.dryRun })}><span /></button>
          </div>
          <div className="row">
            <label htmlFor="protect" className="row-label"><span>Protect tag</span><span>Instances with this tag set to true are never stopped or deleted.</span></label>
            <input id="protect" className="field" value={draft.protectTag} onChange={(e) => set({ protectTag: e.target.value })} style={{ width: 160 }} />
          </div>
        </Section>

        <Section id="s-mail" title="Email notifications" desc="Sent through the SNS topic cloud-janitor-alerts.">
          <div className="row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontWeight: 500 }}>Send an email when an instance</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
              {EVENTS.map(([key, label]) => (
                <label key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 32, cursor: 'pointer' }}>
                  <input type="checkbox" className="checkbox" checked={draft.events[key]} onChange={() => set({ events: { ...draft.events, [key]: !draft.events[key] } })} />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="row">
            <label htmlFor="email" className="row-label"><span>Your email</span><span>AWS sends a confirmation email first. Alerts only arrive after you click Confirm in it.</span></label>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <input id="email" className="field" type="email" value={draft.email} onChange={(e) => set({ email: e.target.value.trim() })} placeholder="[your email]" style={{ width: 240 }} />
              <span className={`pill ${emailConfirmed ? 'tone-running' : 'tone-expiring'}`}><span className="pill-dot" />
                {!draft.email ? 'No email set' : emailConfirmed ? 'Confirmed' : 'Needs confirming after you save'}
              </span>
            </div>
          </div>
        </Section>

        <Section id="s-conn" title="AWS connection" desc={`${credentials.source} in ${credentials.region}. Keys are stored only on this computer.`}
          aside={<span className="pill tone-running"><span className="pill-dot" />Connected</span>}>
          <div className="row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px 24px' }}>
            <div><div className="cell-sub">Access key</div><strong>{credentials.keyHint}</strong></div>
            <div><div className="cell-sub">Credentials</div><strong>{credentials.temporary ? 'Expire when the lab session ends' : 'Do not expire'}</strong></div>
            <div><div className="cell-sub">Last successful scan</div><strong>2 minutes ago, 8 instances checked</strong></div>
          </div>
          <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
            <span style={{ fontWeight: 500 }}>Permissions</span>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '6px 24px' }}>
              {PERMISSIONS.map(([action, why]) => (
                <li key={action} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
                  <span style={{ color: 'var(--accent)', display: 'flex' }}><Icon name="check" size={16} stroke={2.4} /></span>
                  <span style={{ fontWeight: 500 }}>{action}</span><span className="muted">{why}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <a href="#/connect" className="btn">Change access keys</a>
            <button type="button" className="btn" onClick={() => toast('Connection OK. All 5 permissions work.')}>Test connection</button>
          </div>
        </Section>

        <Section id="s-data" title="Data" desc="Alert history and savings are stored in a local SQLite database.">
          <div className="row">
            <div className="row-label"><span>Database file</span><span>backend/janitor.db, {alerts.length} alerts and {SAVINGS_ROWS.length} stop records</span></div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn" onClick={() => downloadCsv('alerts.csv', ['sent_at', 'kind', 'instance', 'subject'], alerts.map((a) => [new Date(a.at).toISOString(), a.kind, a.instance, a.subject]))}>Export alerts as CSV</button>
              <button type="button" className="btn" onClick={() => downloadCsv('savings.csv', ['instance', 'type', 'rate_per_hour', 'hours_off', 'saved_usd', 'how'], SAVINGS_ROWS.map((r) => [r.name, r.type, r.rate, r.hours, r.saved.toFixed(4), r.how]))}>Export savings as CSV</button>
            </div>
          </div>
        </Section>
      </main>

      {dirty && (
        <div className="savebar" role="region" aria-label="Unsaved changes">
          <span>You have unsaved changes</span>
          <button type="button" className="btn btn-lg" onClick={() => setDraft(settings)}>Discard</button>
          <button type="button" className="btn btn-lg btn-primary" onClick={save}>Save changes</button>
        </div>
      )}
    </>
  );
}
