import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { SkeletonSourceView } from '../components/Skeleton.jsx';

export default function SourcePage() {
  const { sourceId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const [starred, setStarred] = useState(false);
  const [starring, setStarring] = useState(false);

  const searchId = location.state?.searchId;
  const scenarioText = location.state?.scenarioText;

  useEffect(() => {
    setLoading(true);
    api
      .getSource(sourceId)
      .then((res) => {
        setData(res);
        setStarred(Boolean(res.starred));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sourceId]);

  async function toggleStar() {
    if (starring) return;
    setStarring(true);
    try {
      if (starred) {
        await api.unstarSource(sourceId);
        setStarred(false);
      } else {
        await api.starSource(sourceId);
        setStarred(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setStarring(false);
    }
  }

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

  if (loading) return <SkeletonSourceView />;
  if (error && !data) return <div className="notice">Error: {error}</div>;
  if (!data) return null;

  const { source, chunks, relatedProvisions, provenance } = data;

  return (
    <div className="stack">
      <div className="panel">
        <div className="panel-header">
          <span>Legal Source</span>
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className={`tag ${starred ? 'accent' : 'dim'}`}
              style={{ cursor: 'pointer', background: 'transparent' }}
              onClick={toggleStar}
              disabled={starring}
            >
              {starred ? '★ Starred' : '☆ Star This Source'}
            </button>
            <span className={`tag ${source.current_status === 'current' ? 'accent' : 'warn'}`}>
              {(source.current_status || 'unknown').toUpperCase()}
            </span>
          </div>
        </div>

        <h2 style={{ fontSize: 22, marginBottom: 10 }}>{source.title}</h2>
        <div className="row mono small muted" style={{ flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <span>{source.source_type?.toUpperCase()}</span>
          {source.act && <span>· Act: {source.act}</span>}
          {source.section && <span>· §{source.section}</span>}
          {source.court && <span>· Court: {source.court}</span>}
          <span>· Jurisdiction: {source.jurisdiction || 'unknown'}</span>
        </div>

        <div className="grid-3 mono small muted" style={{ marginBottom: 16 }}>
          <div>Date: {source.date ? source.date.slice(0, 10) : 'n/a'}</div>
          <div>Effective: {source.effective_date ? source.effective_date.slice(0, 10) : 'n/a'}</div>
          <div>Repealed: {source.repeal_date ? source.repeal_date.slice(0, 10) : 'n/a'}</div>
        </div>

        <div className="divider-label">source text</div>
        {source.full_text ? (
          <p style={{ whiteSpace: 'pre-wrap' }}>{source.full_text}</p>
        ) : (
          <div className="notice info">Full text not cached locally for this source. Use the external source link below.</div>
        )}

        {source.url && (
          <p>
            <a href={source.url} target="_blank" rel="noreferrer">Open Original External Source</a>
          </p>
        )}

        <div className="callout-authority" style={{ marginTop: 10 }}>
          Provenance — Provider: {provenance.provider} · Provider ID: {provenance.providerSourceId} · Retrieved: {new Date(provenance.retrievedAt).toISOString()} · Last Verified: {new Date(provenance.lastVerifiedAt).toISOString()}
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
            {explaining ? <span className="loading-bar">Generating</span> : 'Explain Relevance'}
          </button>
          {!scenarioText && (
            <span className="mono small muted">Open this source from a situation search result to enable explanation.</span>
          )}
        </div>
        {error && <div className="notice" style={{ marginTop: 12 }}>Error: {error}</div>}
      </div>
    </div>
  );
}
