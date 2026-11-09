// REST API of the Python (boto3) janitor backend.
// Set VITE_API_URL in a .env file, e.g. VITE_API_URL=http://localhost:8000
// Until then the dashboard runs on the mock data in src/data/mock.js.

const BASE_URL = import.meta.env.VITE_API_URL;

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.message || `${options.method || 'GET'} ${path} failed with status ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  enabled: Boolean(BASE_URL),

  // POST /connect { keyId, secret, token, region }
  // Backend checks the keys with AWS and saves them to ~/.aws/credentials on this computer.
  // Returns { instanceCount }
  connect: (keys) => request('/connect', { method: 'POST', body: JSON.stringify(keys) }),

  // GET /instances -> TTL-tagged EC2 instances with lifecycle status
  listInstances: () => request('/instances'),

  // POST /instances/extend { ids, hours }
  extendInstances: (ids, hours) => request('/instances/extend', { method: 'POST', body: JSON.stringify({ ids, hours }) }),

  // POST /instances/stop { ids }
  stopInstances: (ids) => request('/instances/stop', { method: 'POST', body: JSON.stringify({ ids }) }),

  // DELETE /instances/:id -> terminate now
  deleteInstance: (id) => request(`/instances/${id}`, { method: 'DELETE' }),

  // GET /savings -> stop records from SQLite
  getSavings: () => request('/savings'),

  // GET /alerts -> alert history from SQLite
  listAlerts: () => request('/alerts'),

  // GET /settings, PUT /settings
  getSettings: () => request('/settings'),
  saveSettings: (settings) => request('/settings', { method: 'PUT', body: JSON.stringify(settings) }),
};
