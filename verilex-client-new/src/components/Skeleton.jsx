/**
 * Content-shaped skeleton loading. Each skeleton is built from small atoms
 * (SkelText, SkelCircle, SkelTitle) composed to mirror the exact structure
 * of the real content it stands in for — not a stack of generic uniform
 * blocks — so the page never shifts layout once real data arrives. Atoms
 * pulse (a soft opacity breathe, see .skel-pulse in global.css) rather than
 * sweep with an animated shimmer gradient.
 */

function SkelText({ width = '100%', style }) {
  return <div className={`skel skel-text`} style={{ width, ...style }} aria-hidden="true" />;
}

function SkelTitle({ width = '60%', style }) {
  return <div className={`skel skel-title`} style={{ width, ...style }} aria-hidden="true" />;
}

function SkelTag({ width = 80 }) {
  return <div className="skel skel-tag" style={{ width }} aria-hidden="true" />;
}

function SkelCircle({ size = 20 }) {
  return <div className="skel skel-circle" style={{ width: size, height: size }} aria-hidden="true" />;
}

export function SkeletonPanelHeader() {
  return (
    <div className="skel-panel-header">
      <SkelText width={160} style={{ height: 10 }} />
      <SkelText width={70} style={{ height: 10 }} />
    </div>
  );
}

/**
 * Mirrors ResultCard: rank/method tag + two action tags, a title line,
 * a meta line of short fragments, two body lines of varying width, and a
 * bordered "why retrieved" box.
 */
export function SkeletonResultCard() {
  return (
    <div className="skel-panel" role="status" aria-label="Loading result">
      <div className="spread" style={{ marginBottom: 12 }}>
        <SkelTag width={96} />
        <div className="row" style={{ gap: 8 }}>
          <SkelTag width={84} />
          <SkelTag width={70} />
        </div>
      </div>
      <SkelTitle width="72%" style={{ marginBottom: 10 }} />
      <div className="row" style={{ gap: 10, marginBottom: 14 }}>
        <SkelText width={70} style={{ height: 9 }} />
        <SkelText width={120} style={{ height: 9 }} />
        <SkelText width={90} style={{ height: 9 }} />
      </div>
      <div className="stack" style={{ gap: 7, marginBottom: 14 }}>
        <SkelText width="100%" />
        <SkelText width="94%" />
        <SkelText width="60%" />
      </div>
      <div style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>
        <SkelText width="90%" style={{ marginBottom: 6 }} />
        <SkelText width="55%" />
      </div>
    </div>
  );
}

/**
 * Mirrors ResultsPage: the scenario summary panel (query quote + concept
 * tags) followed by `count` result cards. MySearchesPage/StarredPage reuse
 * this for their row lists, where the scenario header doesn't apply.
 */
export function SkeletonResultsList({ count = 4, showScenario = true }) {
  return (
    <div className="stack" role="status" aria-label="Loading results">
      {showScenario && (
        <div className="skel-panel">
          <SkeletonPanelHeader />
          <SkelText width="88%" style={{ marginBottom: 8 }} />
          <SkelText width="64%" style={{ marginBottom: 14 }} />
          <div className="row" style={{ gap: 8 }}>
            <SkelTag width={100} />
            <SkelTag width={84} />
            <SkelTag width={76} />
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
 * Mirrors SourcePage: panel header, star/status tags, a large title, a
 * meta line, a three-cell date grid, a divider-shaped rule, several lines
 * of source text, and a bordered provenance box.
 */
export function SkeletonSourceView() {
  return (
    <div className="skel-panel" role="status" aria-label="Loading legal source">
      <SkeletonPanelHeader />
      <SkelTitle width="78%" style={{ height: 26, marginBottom: 14 }} />
      <div className="row" style={{ gap: 12, marginBottom: 18 }}>
        <SkelText width={80} style={{ height: 9 }} />
        <SkelText width={140} style={{ height: 9 }} />
        <SkelText width={60} style={{ height: 9 }} />
      </div>
      <div className="grid-3" style={{ marginBottom: 20 }}>
        <SkelText width="70%" style={{ height: 9 }} />
        <SkelText width="70%" style={{ height: 9 }} />
        <SkelText width="70%" style={{ height: 9 }} />
      </div>
      <div style={{ width: 22, height: 2, background: 'var(--accent)', marginBottom: 16 }} aria-hidden="true" />
      <div className="stack" style={{ gap: 8, marginBottom: 18 }}>
        <SkelText width="100%" />
        <SkelText width="100%" />
        <SkelText width="96%" />
        <SkelText width="80%" />
        <SkelText width="50%" />
      </div>
      <div style={{ border: '1px solid var(--border)', padding: '12px 14px' }}>
        <SkelText width="95%" style={{ marginBottom: 6 }} />
        <SkelText width="70%" />
      </div>
    </div>
  );
}

/**
 * Mirrors ExplanationPage: the scenario callout bar, panel header, notice
 * box, then — for each real explanation section — a divider-shaped label
 * followed by two body lines.
 */
export function SkeletonExplanation() {
  const sections = ['what the law says', 'what in your scenario relates to it', 'where the relationship is strong', 'what is uncertain', 'exceptions / limitations'];
  return (
    <div className="stack" role="status" aria-label="Generating explanation">
      <div className="skel-panel" style={{ padding: 16 }}>
        <SkelText width="85%" />
      </div>
      <div className="skel-panel">
        <SkeletonPanelHeader />
        <div style={{ border: '1px solid var(--border)', padding: '12px 14px', marginBottom: 20 }}>
          <SkelText width="100%" style={{ marginBottom: 6 }} />
          <SkelText width="88%" />
        </div>
        {sections.map((s) => (
          <div key={s} style={{ marginBottom: 20 }}>
            <div className="row" style={{ gap: 10, marginBottom: 10 }}>
              <div style={{ width: 18, height: 2, background: 'var(--accent)' }} aria-hidden="true" />
              <SkelText width={160} style={{ height: 9 }} />
            </div>
            <SkelText width="100%" style={{ marginBottom: 6 }} />
            <SkelText width="76%" />
          </div>
        ))}
      </div>
    </div>
  );
}

export { SkelText, SkelTitle, SkelTag, SkelCircle };
