/**
 * Neo-brutalist skeleton loading primitives — reuse the app's panel/border/
 * mono-label language instead of generic rounded shimmer cards, so loading
 * states read as native to the terminal aesthetic and preserve layout.
 */

export function SkeletonLine({ width = '100', style }) {
  return <div className={`skel-block skel-line w-${width}`} style={style} aria-hidden="true" />;
}

export function SkeletonTag() {
  return <span className="skel-block skel-tag" aria-hidden="true" />;
}

export function SkeletonPanelHeader({ label = 'FETCHING' }) {
  return (
    <div className="skel-panel-header">
      <span>
        {label}
        <span className="skel-cursor" />
      </span>
      <span className="mono small muted">···</span>
    </div>
  );
}

export function SkeletonResultCard() {
  return (
    <div className="skel-panel" role="status" aria-label="Loading result">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <SkeletonTag />
        <SkeletonTag />
      </div>
      <div className="skel-block skel-title" />
      <SkeletonLine width="70" />
      <SkeletonLine width="90" />
      <SkeletonLine width="50" />
    </div>
  );
}

export function SkeletonResultsList({ count = 4 }) {
  return (
    <div className="stack" role="status" aria-label="Loading search results">
      <div className="skel-panel">
        <SkeletonPanelHeader label="ANALYSING SCENARIO" />
        <SkeletonLine width="90" />
        <SkeletonLine width="70" />
        <div className="row" style={{ marginTop: 12 }}>
          <SkeletonTag />
          <SkeletonTag />
          <SkeletonTag />
        </div>
      </div>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonResultCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonSourceView() {
  return (
    <div className="skel-panel" role="status" aria-label="Loading legal source">
      <SkeletonPanelHeader label="RETRIEVING SOURCE" />
      <div className="skel-block skel-title" style={{ width: '75%', height: 26 }} />
      <div className="row" style={{ marginBottom: 16 }}>
        <SkeletonTag />
        <SkeletonTag />
        <SkeletonTag />
      </div>
      <SkeletonLine width="100" />
      <SkeletonLine width="100" />
      <SkeletonLine width="90" />
      <SkeletonLine width="70" />
      <SkeletonLine width="50" />
    </div>
  );
}

export function SkeletonExplanation() {
  const sections = ['what the law says', 'what relates', 'strong relationship', 'uncertain', 'exceptions'];
  return (
    <div className="skel-panel" role="status" aria-label="Generating explanation">
      <SkeletonPanelHeader label="GENERATING EXPLANATION" />
      {sections.map((s) => (
        <div key={s} style={{ marginBottom: 20 }}>
          <div className="divider-label" style={{ opacity: 0.6 }}>{s}</div>
          <SkeletonLine width="100" />
          <SkeletonLine width="80" />
        </div>
      ))}
    </div>
  );
}
