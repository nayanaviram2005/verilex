import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [state, setState] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (query.trim().length < 10) {
      setError('Describe the situation in a bit more detail (at least 10 characters).');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await api.searchSituation({ query, state: state || undefined, incidentDate: incidentDate || undefined });
      navigate(`/search/${result.search.id}`, { state: { initial: result } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="panel-header">
          <span>root@verilex:~$ describe_situation</span>
          <span className="mono small muted">mode: SITUATION_SEARCH</span>
        </div>

        <p className="muted" style={{ marginTop: 0, marginBottom: 20, maxWidth: 720 }}>
          Describe what happened, in your own words. No legal terminology required. VERILEX will
          identify the legal concepts involved and retrieve potentially relevant Indian statutes,
          provisions and judgments through connected legal-data providers — it does not generate
          legal advice.
        </p>

        <form onSubmit={handleSubmit} className="stack">
          <div>
            <label className="field-label" htmlFor="scenario">// your situation</label>
            <textarea
              id="scenario"
              rows={7}
              placeholder="e.g. My employer hasn't paid me for three months and then told me not to come back..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="grid-2">
            <div>
              <label className="field-label" htmlFor="state">// state / jurisdiction (optional)</label>
              <select id="state" value={state} onChange={(e) => setState(e.target.value)}>
                <option value="">— not specified —</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="date">// approximate incident date (optional)</label>
              <input id="date" type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} />
            </div>
          </div>

          {error && <div className="notice">ERR :: {error}</div>}

          <div className="row">
            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? <span className="loading-bar">Retrieving</span> : 'Find Relevant Law →'}
            </button>
            <span className="mono small muted">
              {loading ? 'querying legal source providers + semantic index…' : 'no login required — anonymous search supported'}
            </span>
          </div>
        </form>
      </div>

      <div className="callout-authority">
        [SYSTEM NOTE] External legal APIs and cited statutes remain the authoritative source at all
        times. This application's database is a cache, search index and provenance store — never a
        replacement for the official legal text. VERILEX is not a lawyer and does not provide legal
        advice or predict outcomes.
      </div>
    </div>
  );
}
