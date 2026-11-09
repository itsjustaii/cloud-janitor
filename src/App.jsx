import { useEffect, useReducer, useState } from 'react';
import { Sidebar } from './components/Shell.jsx';
import Connect from './pages/Connect.jsx';
import Instances from './pages/Instances.jsx';
import Savings from './pages/Savings.jsx';
import Alerts from './pages/Alerts.jsx';
import Settings from './pages/Settings.jsx';
import { DEFAULT_SETTINGS, initialState, reducer } from './lib/lifecycle.js';
import { formatDay } from './lib/format.js';

const PAGES = ['instances', 'savings', 'alerts', 'settings', 'connect'];

// Only non-secret details live in the browser. The keys themselves stay with the backend.
const load = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const store = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
};

function usePage() {
  const read = () => {
    const p = window.location.hash.replace('#/', '');
    return PAGES.includes(p) ? p : 'instances';
  };
  const [page, setPage] = useState(read);
  useEffect(() => {
    const onHash = () => setPage(read());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return page;
}

export default function App() {
  const page = usePage();
  const [connection, setConnection] = useState(() => load('cj-connection', null));
  const [dark, setDark] = useState(() => load('cj-dark', window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false));
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(Date.now(), { ...DEFAULT_SETTINGS, ...load('cj-settings', {}) }));
  const [toast, setToast] = useState(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    store('cj-dark', dark);
  }, [dark]);

  useEffect(() => {
    const timer = setInterval(() => dispatch({ type: 'tick' }), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const theme = { dark, onTheme: () => setDark(!dark) };

  if (!connection || page === 'connect') {
    return (
      <Connect
        {...theme}
        onConnected={(info) => {
          setConnection(info);
          store('cj-connection', info);
          window.location.hash = '#/instances';
        }}
      />
    );
  }

  const alertsToday = state.alerts.filter((a) => formatDay(a.at, state.now) === 'Today').length;
  const saveSettings = (settings) => {
    dispatch({ type: 'saveSettings', settings });
    store('cj-settings', settings);
  };

  return (
    <div className="app">
      <Sidebar page={page} alertsToday={alertsToday} speed={state.speed} onSpeed={(speed) => dispatch({ type: 'setSpeed', speed })}
        region={`${connection.temporary ? 'Learner Lab' : 'AWS account'}, ${connection.region}`} />
      <div className="content">
        {page === 'instances' && <Instances state={state} dispatch={dispatch} toast={setToast} {...theme} />}
        {page === 'savings' && <Savings {...theme} />}
        {page === 'alerts' && <Alerts alerts={state.alerts} now={state.now} {...theme} />}
        {page === 'settings' && (
          <Settings settings={state.settings} alerts={state.alerts} onSave={saveSettings} toast={setToast} {...theme}
            credentials={{ ...connection, source: connection.temporary ? 'Learner Lab account' : 'AWS account' }} />
        )}
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
