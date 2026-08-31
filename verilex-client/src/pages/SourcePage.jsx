import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';

export default function SourcePage() {
  const { sourceId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [explaining, setExplaining] = useState(false);

  const searchId = location.state?.searchId;
  const scenarioText = location.state?.scenarioText;

  useEffect(() => {
    setLoading(true);
    api
      .getSource(sourceId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sourceId]);

  async function handleExplain() {
    setExplaining(true);
    setError(null);
    try {
      const result = await api.explain({ sourceId, searchId, scenarioText });
      navigate(`/explanations/${result.explanation.id}`, { state: { initial: result } });
    } catch (err) {
      setError(err.message);
    } finally {
      setExplaining(false);
    }
  }

  if (loading) return <div className="loading-bar">Loading source</div>;
  if (error && !data) return <div className="notice">ERR :: {error}</div>;
  if (!data) return null;

  const { source, chunks, relatedProvisions, provenance } = data;

  return (
    <div className="stack">
      <div className="panel">
        <div className="panel-header">
          <span>LEGAL_SOURCE.VIEW</span>
          <span className={`tag ${source.current_status === 'current' ? 'accent' : 'warn'}`}>
            {(source.current_status || 'unknown').toUpperCase()}
          </span>
        </div>

        <h2 style={{ fontSize: 22, marginBottom: 10 }}>{source.title}</h2>
        <div className="row mono small muted" style={{ flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <span>{source.source_type?.toUpperCase()}</span>
          {source.act && <span>· ACT: {source.act}</span>}
          {source.section && <span>· §{source.section}</span>}
          {source.court && <span>· COURT: {source.court}</span>}
          <span>· JURISDICTION: {source.jurisdiction || 'unknown'}</span>
        </div>

        <div className="grid-3 mono small muted" style={{ marginBottom: 16 }}>
          <div>DATE: {source.date ? source.date.slice(0, 10) : 'n/a'}</div>
          <div>EFFECTIVE: {source.effective_date ? source.effective_date.slice(0, 10) : 'n/a'}</div>
          <div>REPEALED: {source.repeal_date ? source.repeal_date.slice(0, 10) : 'n/a'}</div>
        </div>

        <div className="divider-label">source text</div>
        {source.full_text ? (
          <p style={{ whiteSpace: 'pre-wrap' }}>{source.full_text}</p>
        ) : (
          <div className="notice info">Full text not cached locally for this source. Use the external source link below.</div>
        )}

        {source.url && (
          <p>
            <a href={source.url} target="_blank" rel="noreferrer">↗ open original external source</a>
          </p>
        )}

        <div className="callout-authority" style={{ marginTop: 10 }}>
          [PROVENANCE] provider={provenance.provider} · provider_id={provenance.providerSourceId} · retrieved={new Date(provenance.retrievedAt).toISOString()} · last_verified={new Date(provenance.lastVerifiedAt).toISOString()}
          <br />
          {provenance.note}
        </div>

        {relatedProvisions?.length > 0 && (
          <>
            <div className="divider-label">related provisions (same act)</div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              {relatedProvisions.map((p) => (
                <a key={p.id} className="tag dim" href={`/sources/${p.id}`}>
                  §{p.section || '—'} {p.title.slice(0, 40)}
                </a>
              ))}
            </div>
          </>
        )}

        <hr className="rule" />
        <div className="row">
          <button className="btn primary" onClick={handleExplain} disabled={explaining || !scenarioText}>
            {explaining ? <span className="loading-bar">Generating</span> : 'Explain Relevance →'}
          </button>
          {!scenarioText && (
            <span className="mono small muted">Open this source from a situation search result to enable explanation.</span>
          )}
        </div>
        {error && <div className="notice" style={{ marginTop: 12 }}>ERR :: {error}</div>}
      </div>
    </div>
  );
}
