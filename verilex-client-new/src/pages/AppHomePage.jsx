import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const EXAMPLE_SCENARIOS = [
  {
    label: 'Tenancy',
    text: 'My landlord kept my deposit after I moved out and says he won\'t return it because he claims there was damage.',
  },
  {
    label: 'Employment',
    text: 'My employer hasn\'t paid me for three months and then told me not to come back.',
  },
  {
    label: 'Online Fraud',
    text: 'Someone called claiming to be from my bank and tricked me into transferring money to their account.',
  },
  {
    label: 'Consumer',
    text: 'A company sold me a product and is refusing to fix or refund it even though it stopped working within a week.',
  },
];

/**
 * The actual application entry point — protected by ProtectedRoute. The
 * public LandingPage explains the product and never runs a real search;
 * this is where a signed-in user performs one.
 */
export default function AppHomePage() {
  const [query, setQuery] = useState('');
  const [state, setState] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const textareaRef = useRef(null);
  const { user } = useAuth();

  async function runSearch(rawQuery) {
    if (rawQuery.trim().length < 10) {
      setError('Describe the situation in a bit more detail (at least 10 characters).');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await api.searchSituation({ query: rawQuery, state: state || undefined, incidentDate: incidentDate || undefined });
      navigate(`/search/${result.search.id}`, { state: { initial: result } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    runSearch(query);
  }

  function handleExampleClick(example) {
    setQuery(example.text);
    setError(null);
    textareaRef.current?.focus();
    textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="spread">
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 6 }}>Describe what happened.</h1>
          <p className="muted small" style={{ margin: 0 }}>
            No legal terminology required. Verilex will identify the legal concepts involved.
          </p>
        </div>
        <span className="mono small muted">Signed in as {user?.email || user?.name || 'you'}</span>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>Describe Your Situation</span>
          <span className="mono small muted">Situation Search</span>
        </div>

        <form onSubmit={handleSubmit} className="stack">
          <div>
            <label className="field-label" htmlFor="scenario">Your Situation</label>
            <textarea
              id="scenario"
              ref={textareaRef}
              rows={7}
              placeholder="Describe what happened..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="grid-2">
            <div>
              <label className="field-label" htmlFor="state">State / Jurisdiction (Optional)</label>
              <select id="state" value={state} onChange={(e) => setState(e.target.value)}>
                <option value="">— not specified —</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="date">Approximate Incident Date (Optional)</label>
              <input id="date" type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} />
            </div>
          </div>

          {error && <div className="notice">Error: {error}</div>}

          <div className="row">
            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? <span className="loading-bar">Retrieving</span> : 'Find Relevant Law'}
            </button>
            <span className="mono small muted">
              {loading ? 'Querying legal source providers and the semantic index…' : 'Results are saved to your account.'}
            </span>
          </div>
        </form>
      </div>

      <div className="row" style={{ flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <span className="mono small muted">Try an example —</span>
        {EXAMPLE_SCENARIOS.map((ex) => (
          <button
            key={ex.label}
            type="button"
            className="tag dim"
            style={{ cursor: 'pointer', background: 'transparent' }}
            onClick={() => handleExampleClick(ex)}
          >
            {ex.label}
          </button>
        ))}
      </div>

      <div className="callout-authority">
        Note. External legal APIs and cited statutes remain the authoritative source at all
        times. This application's database is a cache, search index and provenance store — never a
        replacement for the official legal text. Verilex is not a lawyer and does not provide legal
        advice or predict outcomes.
      </div>
    </div>
  );
}
