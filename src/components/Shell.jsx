import Icon from './Icons.jsx';

const NAV = [
  { id: 'instances', label: 'Instances', icon: 'instances' },
  { id: 'savings', label: 'Savings', icon: 'savings' },
  { id: 'alerts', label: 'Alerts', icon: 'bell' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export function Sidebar({ page, alertsToday, speed, onSpeed, region }) {
  return (
    <nav className="sidebar" aria-label="Main">
      <div className="brand" style={{ color: 'var(--text)' }}>
        <span style={{ color: 'var(--accent)', display: 'flex' }}><Icon name="logo" size={26} stroke={2.2} /></span>
        Cloud Janitor
      </div>
      <div className="nav">
        {NAV.map((n) => (
          <a key={n.id} href={`#/${n.id}`} className={`nav-item${page === n.id ? ' is-on' : ''}`} aria-current={page === n.id ? 'page' : undefined}>
            <Icon name={n.icon} />
            <span className="label">{n.label}</span>
            {n.id === 'alerts' && alertsToday > 0 && <span className="badge">{alertsToday}</span>}
          </a>
        ))}
      </div>
      <div className="sidebar-foot">
        <div className="demo-box">
          Demo speed
          <div className="segmented" role="group" aria-label="Demo speed" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {[1, 60].map((s) => (
              <button key={s} type="button" className={speed === s ? 'is-on' : ''} aria-pressed={speed === s} onClick={() => onSpeed(s)}>{s}×</button>
            ))}
          </div>
        </div>
        <div className="account">
          <span className="account-icon"><Icon name="cloud" /></span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <strong>AWS connected <span className="dot" /></strong>
            <span className="muted" style={{ fontSize: 12 }}>{region}</span>
          </div>
        </div>
      </div>
    </nav>
  );
}

export function ThemeButton({ dark, onToggle, className = 'btn btn-icon' }) {
  return (
    <button type="button" className={className} onClick={onToggle} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}>
      <Icon name={dark ? 'sun' : 'moon'} size={17} />
    </button>
  );
}

export function Topbar({ title, sub, children }) {
  return (
    <header className="topbar">
      <div className="titles">
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {children}
    </header>
  );
}

export function Kpis({ items }) {
  return (
    <section className="panel kpis" aria-label="Summary">
      {items.map((k) => (
        <div key={k.label} className="kpi">
          <div className="kpi-label">{k.swatch && <span className={`swatch ${k.swatch}`} />}{k.label}</div>
          <div className="kpi-value">{k.value}</div>
          <div className="kpi-sub">{k.sub}</div>
        </div>
      ))}
    </section>
  );
}

export function Chips({ options, value, onChange, label }) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" className={`chip${value === o.id ? ' is-on' : ''}`} aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label} <span className="count">{o.count}</span>
        </button>
      ))}
    </div>
  );
}

export function Search({ value, onChange, placeholder }) {
  return (
    <label className="search">
      <Icon name="search" size={15} />
      <span className="sr-only">{placeholder}</span>
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function Modal({ labelId, onClose, small, children, onKeyDown, role = 'dialog' }) {
  return (
    <div className="overlay" onKeyDown={(e) => { if (e.key === 'Escape') onClose(); onKeyDown?.(e); }}>
      <button type="button" className="backdrop" aria-label="Close" onClick={onClose} tabIndex={-1} />
      <div className={`dialog${small ? ' small' : ''}`} role={role} aria-modal="true" aria-labelledby={labelId}>
        {children}
      </div>
    </div>
  );
}
