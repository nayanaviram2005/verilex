import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { SkeletonResultsList } from '../components/Skeleton.jsx';
import { useDelayedLoading } from '../hooks/useDelayedLoading.js';

export default function MySearchesPage() {
  const [searches, setSearches] = useState(null);
  const [error, setError] = useState(null);
  const loading = searches === null;

  useEffect(() => {
    api
      .listSearches()
      .then((res) => setSearches(res.searches))
      .catch((err) => setError(err.message));
  }, []);

  const showSkeleton = useDelayedLoading(loading);
  if (error) return <div className="notice">Error: {error}</div>;
  if (loading) return showSkeleton ? <SkeletonResultsList count={3} showScenario={false} /> : null;

  return (
    <div className="stack">
      <div>
        <span className="eyebrow" style={{ color: 'var(--accent-deep)' }}>Account</span>
        <h2 style={{ fontSize: 24, marginTop: 10 }}>My Searches</h2>
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
              <span className="tag dim">{s.result_count} Result(s)</span>
            </div>
            <p style={{ margin: '10px 0 0' }}>{s.raw_query}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
