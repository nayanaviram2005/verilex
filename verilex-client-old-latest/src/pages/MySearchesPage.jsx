import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { SkeletonResultsList } from '../components/Skeleton.jsx';

export default function MySearchesPage() {
  const [searches, setSearches] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .listSearches()
      .then((res) => setSearches(res.searches))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="notice">ERR :: {error}</div>;
  if (!searches) return <SkeletonResultsList count={3} />;

  return (
    <div className="stack">
      <div className="panel-header" style={{ border: 'none', margin: 0, padding: 0 }}>
        <h2 style={{ fontSize: 20 }}>MY_SEARCHES.LOG</h2>
      </div>

      {searches.length === 0 && (
        <div className="notice info">
          No saved searches yet. Run a situation search from the home screen — while signed in,
          it will appear here.
        </div>
      )}

      <div className="stack">
        {searches.map((s) => (
          <Link key={s.id} to={`/search/${s.id}`} className="panel" style={{ display: 'block', color: 'var(--ink)' }}>
            <div className="spread">
              <span className="mono small muted">{new Date(s.created_at).toISOString().slice(0, 19).replace('T', ' ')}</span>
              <span className="tag dim">{s.result_count} RESULT(S)</span>
            </div>
            <p style={{ margin: '10px 0 0' }}>{s.raw_query}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
