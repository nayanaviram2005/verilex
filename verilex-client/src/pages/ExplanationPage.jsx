import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { api } from '../api/client.js';

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div className="divider-label">{label}</div>
      <p style={{ margin: 0 }}>{children}</p>
    </div>
  );
}

export default function ExplanationPage() {
  const { explanationId } = useParams();
  const location = useLocation();
  const [data, setData] = useState(location.state?.initial || null);
  const [loading, setLoading] = useState(!location.state?.initial);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (data) return;
    setLoading(true);
    api
      .getExplanation(explanationId)
      .then((res) => setData({ explanation: res.explanation, source: null, relatedJudgments: res.explanation.supporting_cases }))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [explanationId, data]);

  if (loading) return <div className="loading-bar">Generating explanation</div>;
  if (error) return <div className="notice">ERR :: {error}</div>;
  if (!data) return null;

  const { explanation, source, relatedJudgments } = data;

  return (
    <div className="stack">
      <div className="callout-authority">
        [SCENARIO ON FILE] "{explanation.scenario_text}"
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>EXPLANATION.ENGINE :: MODEL={explanation.model?.toUpperCase()}</span>
          {source && <span className="mono small muted">{source.title}</span>}
        </div>

        <div className="notice info small" style={{ marginBottom: 20 }}>
          This is an AI/rule-based interpretation of the retrieved source below, grounded only in
          its cached text. It is not a legal determination and does not establish that this
          provision applies to your situation.
        </div>

        <Section label="what the law says">{explanation.what_it_says}</Section>
        <Section label="what in your scenario relates to it">{explanation.what_relates}</Section>
        <Section label="where the relationship is strong">{explanation.strong_relationship}</Section>
        <Section label="what is uncertain">{explanation.uncertain}</Section>
        <Section label="exceptions / limitations">{explanation.exceptions}</Section>

        {relatedJudgments?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div className="divider-label">supporting cases</div>
            <div className="stack">
              {relatedJudgments.map((j, i) => (
                <div key={i} className="panel" style={{ padding: 14 }}>
                  <div className="spread">
                    <strong style={{ fontSize: 14 }}>{j.title}</strong>
                    <span className="mono small muted">{j.court}</span>
                  </div>
                  {j.excerpt && <p className="small muted" style={{ margin: '8px 0 0' }}>{j.excerpt}</p>}
                  {j.url && <a href={j.url} target="_blank" rel="noreferrer" className="mono small">↗ open source</a>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="notice" style={{ marginTop: 8 }}>
          WHAT THIS DOES NOT ESTABLISH: {explanation.what_this_does_not_establish}
        </div>

        {source?.url && (
          <p style={{ marginTop: 16 }}>
            <a href={source.url} target="_blank" rel="noreferrer">↗ verify against the original external source</a>
          </p>
        )}
      </div>
    </div>
  );
}
