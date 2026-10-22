import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { SkeletonResultsList } from '../components/Skeleton.jsx';

export default function StarredPage() {
  const [starred, setStarred] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .listStarred()
      .then((res) => setStarred(res.starred))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="notice">Error: {error}</div>;
  if (!starred) return <SkeletonResultsList count={3} showScenario={false} />;

  return (
    <div className="stack">
      <div className="panel-header" style={{ border: 'none', margin: 0, padding: 0 }}>
        <h2 style={{ fontSize: 20 }}>Starred Sources</h2>
      </div>

      {starred.length === 0 && (
        <div className="notice info">
          No starred sources yet. Open any retrieved source and select "Star This Source" to save
          it here for later reference.
        </div>
      )}

      <div className="stack">
        {starred.map((s) => (
          <Link
            key={s.starred_id}
            to={`/sources/${s.source.id}`}
            className="panel"
            style={{ display: 'block', color: 'var(--ink)' }}
          >
            <div className="spread">
              <span className="mono small muted">
                Starred {new Date(s.starred_at).toISOString().slice(0, 10)}
              </span>
              <span className="tag dim">{s.source.source_type}</span>
            </div>
            <h3 style={{ fontSize: 16, margin: '10px 0 4px' }}>{s.source.title}</h3>
            <div className="row mono small muted" style={{ flexWrap: 'wrap', gap: 8 }}>
              {s.source.act && <span>{s.source.act}</span>}
              {s.source.section && <span>· §{s.source.section}</span>}
              <span>· provider:{s.source.provider}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
