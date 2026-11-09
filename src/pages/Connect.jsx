import { useState } from 'react';
import Icon from '../components/Icons.jsx';
import { ThemeButton } from '../components/Shell.jsx';
import { api } from '../api/client.js';

const POLICY = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:CreateTags",
        "ec2:StopInstances",
        "ec2:TerminateInstances",
        "sns:Publish"
      ],
      "Resource": "*"
    }
  ]
}`;

const GUIDES = {
  lab: {
    steps: [['Open Learner Lab', 'in your AWS Academy course.'], ['Click Start Lab', 'and wait for the green dot.'], ['Click AWS Details', 'at the top right.'], ['Click Show', 'next to AWS CLI.'], ['Copy the whole block', 'and paste it above.']],
    note: 'Learner Lab keys expire when the lab ends, about every 4 hours. You will be asked for new ones.',
    noteColor: 'var(--warn)',
  },
  aws: {
    steps: [['Open IAM', 'in the AWS console.'], ['Create a user', 'called cloud-janitor, no console access.'], ['Attach the policy below', 'so it can only touch EC2 and SNS.'], ['Create an access key', 'under Security credentials, for an application outside AWS.'], ['Copy both keys', 'into Fill in manually above.']],
    note: 'Never use your root account keys.',
    noteColor: 'var(--muted)',
  },
};

// Reads the [default] block Learner Lab shows under AWS Details > AWS CLI
function parseBlock(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(aws_access_key_id|aws_secret_access_key|aws_session_token)\s*=\s*(\S+)\s*$/i);
    if (m) out[m[1].toLowerCase()] = m[2];
  }
  return out;
}

function validate({ keyId, secret, token }) {
  if (!keyId || !secret) return 'Paste your keys first, or fill them in manually.';
  if (!/^(AKIA|ASIA)[A-Z0-9]{12,}$/.test(keyId)) return 'The access key ID should start with AKIA or ASIA.';
  if (secret.length < 30) return 'The secret key looks too short. It is usually 40 characters.';
  if (keyId.startsWith('ASIA') && !token) return 'Learner Lab keys need the session token too. Copy the whole block.';
  return null;
}

export default function Connect({ onConnected, dark, onTheme }) {
  const [tab, setTab] = useState('lab');
  const [manual, setManual] = useState(false);
  const [paste, setPaste] = useState('');
  const [keys, setKeys] = useState({ keyId: '', secret: '', token: '' });
  const [region, setRegion] = useState('us-east-1');
  const [show, setShow] = useState(false);
  const [result, setResult] = useState(null); // null | { ok } | { error }
  const [testing, setTesting] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const update = (patch) => { setKeys({ ...keys, ...patch }); setResult(null); };
  const onPaste = (text) => {
    setPaste(text);
    const p = parseBlock(text);
    update({
      keyId: p.aws_access_key_id ?? keys.keyId,
      secret: p.aws_secret_access_key ?? keys.secret,
      token: p.aws_session_token ?? keys.token,
    });
  };

  const test = async () => {
    setTesting(true);
    setResult(null);
    const error = validate(keys);
    if (error) {
      setResult({ error });
    } else if (api.enabled) {
      // Real check: the backend calls sts:GetCallerIdentity and ec2:DescribeInstances
      try {
        const res = await api.connect({ ...keys, region });
        setResult({ ok: true, count: res.instanceCount });
      } catch (e) {
        setResult({ error: e.message });
      }
    } else {
      await new Promise((r) => setTimeout(r, 900));
      setResult({ ok: true, count: 8 });
    }
    setTesting(false);
  };

  const found = [keys.keyId, keys.secret, keys.token].filter(Boolean).length;
  let status = null;
  if (testing) status = { text: 'Checking with AWS...', color: 'var(--muted)' };
  else if (result?.ok) status = { text: `Connected. Found ${result.count} instances in ${region}.`, color: 'var(--accent)' };
  else if (result?.error) status = { text: result.error, color: 'var(--danger)' };
  else if (found) status = { text: `Found ${found} ${found === 1 ? 'key' : 'keys'}. Click Test connection.`, color: 'var(--accent)' };

  const guide = GUIDES[tab];
  const copyPolicy = () => {
    navigator.clipboard?.writeText(POLICY).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="theme-corner"><ThemeButton dark={dark} onToggle={onTheme} className="btn btn-icon btn-plain" /></div>
      <main className="connect">
        <div className="connect-head">
          <span style={{ color: 'var(--accent)', display: 'flex', marginBottom: 6 }}><Icon name="logo" size={28} stroke={2.2} /></span>
          <h1>Connect your AWS account</h1>
          <p>Paste your access keys so Cloud Janitor can watch your EC2 instances.</p>
        </div>

        <section className="panel connect-card" aria-label="Access keys">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label htmlFor="paste" style={{ fontSize: 13, fontWeight: 500 }}>Access keys</label>
              <button type="button" className="link" aria-expanded={manual} onClick={() => setManual(!manual)}>{manual ? 'Paste instead' : 'Fill in manually'}</button>
            </div>
            {manual ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input aria-label="Access key ID" className="field mono" autoComplete="off" spellCheck={false} value={keys.keyId} onChange={(e) => update({ keyId: e.target.value.trim() })} placeholder="Access key ID" />
                <div style={{ display: 'flex', gap: 6 }}>
                  <input aria-label="Secret access key" className="field mono" type={show ? 'text' : 'password'} autoComplete="off" spellCheck={false} value={keys.secret} onChange={(e) => update({ secret: e.target.value.trim() })} placeholder="Secret access key" />
                  <button type="button" className="btn" style={{ height: 34, borderRadius: 6, flexShrink: 0 }} onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
                </div>
                <input aria-label="Session token, Learner Lab only" className="field mono" type="password" autoComplete="off" spellCheck={false} value={keys.token} onChange={(e) => update({ token: e.target.value.trim() })} placeholder="Session token (Learner Lab only)" />
              </div>
            ) : (
              <textarea id="paste" className="mono" rows={4} spellCheck={false} value={paste} onChange={(e) => onPaste(e.target.value)} placeholder="Paste the block from AWS Details here" />
            )}
            {status && <span aria-live="polite" style={{ fontSize: 12.5, color: status.color }}>{status.text}</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label htmlFor="region" style={{ fontSize: 13, fontWeight: 500, flexShrink: 0 }}>Region</label>
            <select id="region" className="field" value={region} onChange={(e) => { setRegion(e.target.value); setResult(null); }} style={{ fontSize: 13 }}>
              <option value="us-east-1">us-east-1, N. Virginia</option>
              <option value="ap-southeast-1">ap-southeast-1, Singapore</option>
              <option value="ap-southeast-5">ap-southeast-5, Malaysia</option>
              <option value="eu-west-1">eu-west-1, Ireland</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn" style={{ flex: 1, height: 36, borderRadius: 6 }} onClick={test} disabled={testing}>{testing ? 'Testing...' : 'Test connection'}</button>
            {result?.ok && (
              <button type="button" className="btn btn-primary" style={{ flex: 1, height: 36, borderRadius: 6 }}
                onClick={() => onConnected({ region, temporary: !!keys.token, keyHint: `${keys.keyId.slice(0, 4)}••••${keys.keyId.slice(-4)}` })}>
                Continue
              </button>
            )}
          </div>

          <div className="cell-sub" style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
            <Icon name="lock" size={13} />Saved only on this computer. Sent to AWS and nowhere else.
          </div>
        </section>

        <section className="guide" aria-labelledby="guide-title">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 id="guide-title" style={{ fontSize: 13.5, fontWeight: 600 }}>Where do I find my keys?</h2>
            <div className="segmented small" role="tablist" aria-label="Account type">
              {[['lab', 'Learner Lab'], ['aws', 'AWS account']].map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'is-on' : ''} onClick={() => setTab(id)}>{label}</button>
              ))}
            </div>
          </div>
          <ol role="tabpanel">
            {guide.steps.map(([title, detail]) => <li key={title}><strong>{title}</strong> {detail}</li>)}
          </ol>
          {tab === 'aws' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <button type="button" className="link" aria-expanded={policyOpen} onClick={() => setPolicyOpen(!policyOpen)}>{policyOpen ? 'Hide policy' : 'Show policy'}</button>
                {policyOpen && <button type="button" className="link" onClick={copyPolicy}>{copied ? 'Copied' : 'Copy policy'}</button>}
              </div>
              {policyOpen && <pre className="mono">{POLICY}</pre>}
            </div>
          )}
          <p style={{ fontSize: 12.5, color: guide.noteColor }}>{guide.note}</p>
        </section>

        <div style={{ textAlign: 'center' }}>
          <button type="button" className="link" style={{ color: 'var(--muted)' }}
            onClick={() => { setManual(true); setTab('aws'); update({ keyId: 'AKIAIOSFODNN7EXAMPLE', secret: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', token: '' }); }}>
            Try it with example keys
          </button>
        </div>
      </main>
    </div>
  );
}
