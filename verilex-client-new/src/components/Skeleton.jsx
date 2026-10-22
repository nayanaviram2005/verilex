/**
 * Skeleton loading, built on the "transparent text" technique: each
 * skeleton reuses the real page's own markup — same element, same
 * className, often the same static label text — with the text made
 * transparent and a shimmer gradient clipped to its own glyphs
 * (background-clip: text). Because it's the real element rendered with
 * real or representative text, its dimensions are exactly the real
 * content's dimensions by construction; nothing here is a hand-guessed
 * percentage-width bar. Non-text placeholders (icon swatches) use
 * .skel-block, a plain shimmering fill. See global.css for the shimmer
 * animation, the prefers-reduced-motion fallback, and .skel-fade-in,
 * used by useDelayedLoading's consumers to crossfade in.
 */

function T({ as: Tag = 'span', children, className = '', style }) {
  return (
    <Tag className={`skel-text ${className}`} style={style} aria-hidden="true">
      {children}
    </Tag>
  );
}

function Block({ width, height, style }) {
  return <div className="skel-block" style={{ width, height, ...style }} aria-hidden="true" />;
}

export function SkeletonPanelHeader({ left = 'Loading', right = '···' }) {
  return (
    <div className="skel-panel-header">
      <T>{left}</T>
      <T className="mono small muted">{right}</T>
    </div>
  );
}

/**
 * Mirrors ResultCard exactly: same .panel/.tag/.notice structure, same
 * h3 title element, same meta-row shape — filled with representative
 * text of plausible length rather than the (unknown, still loading)
 * real values.
 */
export function SkeletonResultCard() {
  return (
    <div className="panel" aria-hidden="true">
      <div className="spread" style={{ marginBottom: 8 }}>
        <span className="tag dim"><T>#1 · FUSED</T></span>
        <div className="row" style={{ gap: 8 }}>
          <span className="tag accent"><T>View Source</T></span>
          <span className="tag dim"><T>Current</T></span>
        </div>
      </div>
      <h3 style={{ fontSize: 17, marginBottom: 6 }}>
        <T>Model Tenancy Act, 2021 — Section 10: Security deposit</T>
      </h3>
      <div className="row mono small muted" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <T>SECTION</T>
        <T>· Model Tenancy Act, 2021</T>
        <T>· §10</T>
        <T>· India (Central)</T>
      </div>
      <p className="muted small" style={{ margin: '0 0 10px' }}>
        <T as="span" style={{ display: 'block' }}>
          The relevant provision text will appear here once the source has been retrieved and
          cached from its provider, in full…
        </T>
      </p>
      <div className="notice info small" style={{ padding: '8px 10px' }}>
        <T>Why This Was Retrieved: this source overlaps with concepts identified in your description.</T>
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
          <SkeletonPanelHeader left="Scenario Reference: ········" right="· result(s)" />
          <p style={{ marginTop: 0 }}>
            <T>"Your described situation will appear here once the search completes."</T>
          </p>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <T className="mono small muted">Detected Concepts:</T>
            <span className="tag accent"><T>concept</T></span>
            <span className="tag accent"><T>concept</T></span>
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
 * Mirrors SourcePage: panel header, star/status tags, title, meta row,
 * the three-cell date grid, the source-text divider and paragraph, and
 * the provenance box — in the same positions the real page renders them.
 */
export function SkeletonSourceView() {
  return (
    <div className="skel-panel skel-fade-in" role="status" aria-label="Loading legal source">
      <div className="skel-panel-header">
        <T>Legal Source</T>
        <div className="row" style={{ gap: 8 }}>
          <span className="tag dim"><T>☆ Star This Source</T></span>
          <span className="tag dim"><T>Current</T></span>
        </div>
      </div>
      <h2 style={{ fontSize: 22, marginBottom: 10 }}>
        <T>Model Tenancy Act, 2021 — Section 10: Security deposit</T>
      </h2>
      <div className="row mono small muted" style={{ flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <T>SECTION</T>
        <T>· Act: Model Tenancy Act, 2021</T>
        <T>· §10</T>
      </div>
      <div className="grid-3 mono small muted" style={{ marginBottom: 16 }}>
        <T>Date: ····-··-··</T>
        <T>Effective: ····-··-··</T>
        <T>Repealed: n/a</T>
      </div>
      <div className="divider-label" style={{ opacity: 0.7 }}>source text</div>
      <p>
        <T as="span" style={{ display: 'block' }}>
          The full retrieved text of this provision will be shown here once it has finished
          loading from the cache, exactly as cached from the provider, with no summarisation.
        </T>
      </p>
      <div className="callout-authority" style={{ marginTop: 10 }}>
        <T as="span" style={{ display: 'block' }}>
          Provenance — Provider: ·· · Provider ID: ········ · Retrieved: ·· · Last Verified: ··
        </T>
      </div>
    </div>
  );
}

/**
 * Mirrors ExplanationPage: scenario callout, panel header, notice box,
 * then one divider-shaped label + two body lines per real section.
 */
export function SkeletonExplanation() {
  const sections = [
    'what the law says',
    'what in your scenario relates to it',
    'where the relationship is strong',
    'what is uncertain',
    'exceptions / limitations',
  ];
  return (
    <div className="stack skel-fade-in" role="status" aria-label="Generating explanation">
      <div className="callout-authority">
        <T as="span" style={{ display: 'block' }}>Scenario on File — "your description will appear here"</T>
      </div>
      <div className="skel-panel">
        <div className="skel-panel-header">
          <T>Explanation — Model: ········</T>
          <T className="mono small muted">Source title</T>
        </div>
        <div className="notice info small" style={{ marginBottom: 20 }}>
          <T as="span" style={{ display: 'block' }}>
            This is an AI/rule-based interpretation of the retrieved source below, grounded only
            in its cached text.
          </T>
        </div>
        {sections.map((s) => (
          <div key={s} style={{ marginBottom: 20 }}>
            <div className="divider-label" style={{ opacity: 0.7 }}>{s}</div>
            <p style={{ margin: 0 }}>
              <T as="span" style={{ display: 'block' }}>
                This section will explain how the retrieved source relates to your described
                situation, grounded strictly in its cached text.
              </T>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export { T as SkeletonText, Block as SkeletonBlock };
