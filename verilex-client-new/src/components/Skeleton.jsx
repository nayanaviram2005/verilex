/**
 * Skeleton loading: placeholder shapes, not placeholder text. A skeleton
 * stands in for content that hasn't arrived — including when it may be
 * a while, e.g. a slow connection — so it never renders real or
 * representative copy, only shimmering bars sized and positioned to
 * mirror the real layout (title bar, meta fragments, paragraph lines of
 * varying width, tag pills) exactly, so there's zero layout shift once
 * real data lands. See global.css for the shimmer sweep, the
 * prefers-reduced-motion fallback, and .skel-fade-in (the crossfade used
 * once the skeleton is swapped for real content).
 */

function Line({ width = '100', style }) {
  return <div className={`skel-block skel-line w-${width}`} style={style} aria-hidden="true" />;
}

function Title({ width, style }) {
  return <div className="skel-block skel-title" style={{ width, ...style }} aria-hidden="true" />;
}

function Tag({ width }) {
  return <div className="skel-block skel-tag" style={{ width }} aria-hidden="true" />;
}

export function SkeletonPanelHeader() {
  return (
    <div className="skel-panel-header">
      <Line width="30" style={{ height: 10, marginBottom: 0 }} />
      <Line width="15" style={{ height: 10, marginBottom: 0 }} />
    </div>
  );
}

/**
 * Mirrors ResultCard's shape: rank/method tag + two action tags, a title
 * bar, a row of short meta fragments, two body lines, and a bordered
 * "why retrieved" box — all placeholder shapes at the real positions.
 */
export function SkeletonResultCard() {
  return (
    <div className="panel" aria-hidden="true">
      <div className="spread" style={{ marginBottom: 12 }}>
        <Tag width={90} />
        <div className="row" style={{ gap: 8 }}>
          <Tag width={80} />
          <Tag width={66} />
        </div>
      </div>
      <Title width="70%" style={{ marginBottom: 12 }} />
      <div className="row" style={{ gap: 10, marginBottom: 14 }}>
        <Line width="30" style={{ height: 9, marginBottom: 0 }} />
        <Line width="30" style={{ height: 9, marginBottom: 0 }} />
        <Line width="30" style={{ height: 9, marginBottom: 0 }} />
      </div>
      <div className="stack" style={{ gap: 7, marginBottom: 14 }}>
        <Line width="100" />
        <Line width="90" />
        <Line width="60" />
      </div>
      <div style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>
        <Line width="90" style={{ marginBottom: 6 }} />
        <Line width="50" />
      </div>
    </div>
  );
}

/**
 * Mirrors ResultsPage's scenario-summary panel + N result cards.
 * MySearchesPage/StarredPage pass showScenario=false since their real
 * layout has no scenario header — just a list of panel rows.
 */
export function SkeletonResultsList({ count = 4, showScenario = true }) {
  return (
    <div className="stack skel-fade-in" role="status" aria-label="Loading results">
      {showScenario && (
        <div className="panel" aria-hidden="true">
          <SkeletonPanelHeader />
          <Line width="90" style={{ marginBottom: 8 }} />
          <Line width="60" style={{ marginBottom: 14 }} />
          <div className="row" style={{ gap: 8 }}>
            <Tag width={100} />
            <Tag width={84} />
            <Tag width={76} />
          </div>
        </div>
      )}
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonResultCard key={i} />
      ))}
    </div>
  );
}

/**
 * Mirrors SourcePage: panel header, star/status tags, a title bar, a
 * meta line, a three-cell date grid, a divider, several paragraph lines
 * of source text, and a bordered provenance box.
 */
export function SkeletonSourceView() {
  return (
    <div className="skel-panel skel-fade-in" role="status" aria-label="Loading legal source">
      <div className="skel-panel-header">
        <Line width="30" style={{ height: 10, marginBottom: 0 }} />
        <div className="row" style={{ gap: 8 }}>
          <Tag width={120} />
          <Tag width={70} />
        </div>
      </div>
      <Title width="78%" style={{ height: 26, marginBottom: 14 }} />
      <div className="row" style={{ gap: 12, marginBottom: 18 }}>
        <Line width="15" style={{ height: 9, marginBottom: 0 }} />
        <Line width="30" style={{ height: 9, marginBottom: 0 }} />
        <Line width="10" style={{ height: 9, marginBottom: 0 }} />
      </div>
      <div className="grid-3" style={{ marginBottom: 20 }}>
        <Line width="70" style={{ height: 9, marginBottom: 0 }} />
        <Line width="70" style={{ height: 9, marginBottom: 0 }} />
        <Line width="70" style={{ height: 9, marginBottom: 0 }} />
      </div>
      <div style={{ width: 22, height: 2, background: 'var(--accent)', marginBottom: 16 }} aria-hidden="true" />
      <div className="stack" style={{ gap: 8, marginBottom: 18 }}>
        <Line width="100" />
        <Line width="100" />
        <Line width="90" />
        <Line width="70" />
        <Line width="50" />
      </div>
      <div style={{ border: '1px solid var(--border)', padding: '12px 14px' }}>
        <Line width="90" style={{ marginBottom: 6 }} />
        <Line width="60" />
      </div>
    </div>
  );
}

/**
 * Mirrors ExplanationPage: the scenario callout bar, panel header,
 * notice box, then — for each real explanation section — a divider
 * mark followed by two body lines.
 */
export function SkeletonExplanation() {
  const sections = ['what the law says', 'what in your scenario relates to it', 'where the relationship is strong', 'what is uncertain', 'exceptions / limitations'];
  return (
    <div className="stack skel-fade-in" role="status" aria-label="Generating explanation">
      <div className="skel-panel" style={{ padding: 16 }}>
        <Line width="80" style={{ marginBottom: 0 }} />
      </div>
      <div className="skel-panel">
        <SkeletonPanelHeader />
        <div style={{ border: '1px solid var(--border)', padding: '12px 14px', marginBottom: 20 }}>
          <Line width="100" style={{ marginBottom: 6 }} />
          <Line width="80" />
        </div>
        {sections.map((s) => (
          <div key={s} style={{ marginBottom: 20 }}>
            <div className="row" style={{ gap: 10, marginBottom: 10 }}>
              <div style={{ width: 18, height: 2, background: 'var(--accent)' }} aria-hidden="true" />
              <Line width="30" style={{ height: 9, marginBottom: 0 }} />
            </div>
            <Line width="100" style={{ marginBottom: 6 }} />
            <Line width="70" />
          </div>
        ))}
      </div>
    </div>
  );
}

export { Line as SkeletonLine, Title as SkeletonTitle, Tag as SkeletonTag };
