const BASE = import.meta.env.VITE_API_BASE_URL || '';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `Request failed (${res.status})`);
    error.status = res.status;
    error.details = data.details;
    throw error;
  }
  return data;
}

export const api = {
  health: () => request('/health'),

  searchSituation: ({ query, state, incidentDate, filters }) =>
    request('/search/situation', {
      method: 'POST',
      body: JSON.stringify({ query, state, incidentDate, filters }),
    }),

  searchSource: ({ query, filters }) =>
    request('/search/source', { method: 'POST', body: JSON.stringify({ query, filters }) }),

  searchCase: ({ query, filters }) =>
    request('/search/case', { method: 'POST', body: JSON.stringify({ query, filters }) }),

  getSearch: (id) => request(`/search/${id}`),

  getSource: (id) => request(`/sources/${id}`),

  explain: ({ sourceId, searchId, scenarioText }) =>
    request('/explain', { method: 'POST', body: JSON.stringify({ sourceId, searchId, scenarioText }) }),

  getExplanation: (id) => request(`/explain/${id}`),

  authStatus: () => request('/auth/status'),
  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
  signup: ({ email, password, confirmPassword }) =>
    request('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, confirmPassword }) }),
  login: ({ email, password }) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  listSearches: () => request('/searches'),
};

export const BASE_URL = BASE;
