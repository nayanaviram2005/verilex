import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { SkeletonResultsList } from '../components/Skeleton.jsx';

const STATUS_LABEL = { current: 'CURRENT', repealed: 'REPEALED', amended: 'AMENDED', unknown: 'STATUS UNKNOWN' };
const STATUS_CLASS = { current: 'accent', repealed: 'warn', amended: 'dim', unknown: 'dim' };

function ResultCard({ result }) {
  const navigate = useNavigate();
  const s = result.source;
  // The API-provided source URL is the only thing that makes this link —
  // never constructed/guessed. Absent it, the card behaves exactly as before.
  const hasExternalUrl = Boolean(s.url);

  return (
    <div className="panel" style={{ cursor: 'pointer' }} onClick={() => navigate(`/sources/${s.id}`, { state: { searchId: result.search_id, scenarioText: result.scenarioText } })}>
      <div className="spread" style={{ marginBottom: 8 }}>
        <span className="tag dim">#{result.rank} · {result.retrieval_method.toUpperCase()}</span>
        <div className="row" style={{ gap: 8 }}>
          {hasExternalUrl && (
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="tag accent"
              onClick={(e) => e.stopPropagation()}
              title="Open the original source at the provider"
            >
              ↗ SOURCE
            </a>
          )}
          <span className={`tag ${STATUS_CLASS[s.current_status] || 'dim'}`}>{STATUS_LABEL[s.current_status] || 'UNKNOWN'}</span>
        </div>
      </div>
      <h3 style={{ fontSize: 17, marginBottom: 6 }}>
        {hasExternalUrl ? (
          <a
            href={s.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ color: 'inherit' }}
          >
            {s.title}
          </a>
        ) : (
          s.title
        )}
      </h3>
      <div className="row mono small muted" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <span>{s.source_type?.toUpperCase()}</span>
        {s.act && <span>· {s.act}</span>}
        {s.section && <span>· §{s.section}</span>}
        {s.court && <span>· {s.court}</span>}
        <span>· {s.jurisdiction || 'jurisdiction unknown'}</span>
        <span>· provider:{s.provider}</span>
      </div>
      {s.full_text && <p className="muted small" style={{ margin: '0 0 10px' }}>{s.full_text.slice(0, 220)}…</p>}
      <div className="notice info small" style={{ padding: '8px 10px' }}>
        WHY RETRIEVED: {result.reason}
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const { searchId } = useParams();
  const location = useLocation();
  const [data, setData] = useState(location.state?.initial || null);
  const [loading, setLoading] = useState(!location.state?.initial);
  const [error, setError] = useState(null);
  const [sourceTypeFilter, setSourceTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (data) return;
    setLoading(true);
    api
      .getSearch(searchId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [searchId, data]);

  const filteredResults = useMemo(() => {
    if (!data?.results) return [];
    return data.results.filter((r) => {
      if (sourceTypeFilter && r.source.source_type !== sourceTypeFilter) return false;
      if (statusFilter && r.source.current_status !== statusFilter) return false;
      return true;
    });
  }, [data, sourceTypeFilter, statusFilter]);

  if (loading) return <SkeletonResultsList />;
  if (error) return <div className="notice">ERR :: {error}</div>;
  if (!data) return null;

  const { scenario, results } = data;
  const concepts = scenario?.concepts || [];
  const scenarioText = data.search?.raw_query;

  return (
    <div className="stack">
      <div className="panel">
        <div className="panel-header">
          <span>SCENARIO :: {searchId?.slice(0, 8)}</span>
          <span className="mono small muted">{results?.length || 0} result(s)</span>
        </div>
        <p style={{ marginTop: 0 }}>"{scenarioText}"</p>
        {concepts.length > 0 && (
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <span className="mono small muted">DETECTED CONCEPTS:</span>
            {concepts.map((c) => (
              <span key={c} className="tag accent">{c}</span>
            ))}
          </div>
        )}
      </div>

      {results?.length === 0 && (
        <div className="notice">
          {data.notice || 'No sufficiently relevant source was found in the available legal sources.'}
        </div>
      )}

      {results?.length > 0 && (
        <>
          <div className="divider-label">filters</div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
            <select value={sourceTypeFilter} onChange={(e) => setSourceTypeFilter(e.target.value)} style={{ width: 'auto' }}>
              <option value="">All source types</option>
              <option value="act">Act</option>
              <option value="section">Section</option>
              <option value="rule">Rule</option>
              <option value="regulation">Regulation</option>
              <option value="judgment">Judgment</option>
              <option value="order">Order</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 'auto' }}>
              <option value="">All statuses</option>
              <option value="current">Current</option>
              <option value="amended">Amended</option>
              <option value="repealed">Repealed</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>

          <div className="divider-label">retrieved legal sources</div>
          <div className="stack">
            {filteredResults.map((r) => (
              <ResultCard key={r.id} result={{ ...r, scenarioText }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
