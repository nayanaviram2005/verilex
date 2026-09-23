import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, AUTH_STATUS } from '../context/AuthContext.jsx';

const EXAMPLE_AREAS = ['Tenancy', 'Employment', 'Online Fraud', 'Consumer Disputes'];

const DEMO_STEPS = [
  'Reading your description…',
  'Extracting legal concepts…',
  'Searching connected legal sources…',
  'Ranking relevant provisions…',
];

const DEMO_TEASER_ROWS = [
  { w: '78%' },
  { w: '64%' },
  { w: '71%' },
];

const PIPELINE_STEPS = [
  { id: '01', label: 'Describe', detail: 'You describe what happened, in your own words.', icon: '💬' },
  { id: '02', label: 'Understand', detail: 'The system extracts the legal concepts involved.', icon: '🧠' },
  { id: '03', label: 'Discover', detail: 'Relevant statutes, provisions and judgments are retrieved.', icon: '🔍' },
  { id: '04', label: 'Select', detail: 'You pick one specific provision to examine.', icon: '📌' },
  { id: '05', label: 'Explain', detail: 'The AI explains how that source relates to your situation.', icon: '✨' },
  { id: '06', label: 'Verify', detail: 'You inspect the original source yourself.', icon: '✅' },
];

/**
 * Public front door. This is NOT a working preview of the product — there
 * is no scenario input or search here, and nothing on this page performs a
 * real legal search or returns real/fabricated results. It exists to
 * explain what Verilex does and move a visitor toward authentication;
 * the actual application lives at /app, behind sign-in.
 */
export default function LandingPage() {
  const { status } = useAuth();
  const navigate = useNavigate();

  // "Try it now" teaser on the landing page. This does NOT run a real
  // search — nothing here calls the API or touches real legal data. It
  // exists purely to demonstrate the product flow (analyzing → results
  // found) before gating the actual results behind sign-in, mirroring the
  // "start typing, then get walled" pattern common on marketing sites.
  const [demoText, setDemoText] = useState('');
  const [demoStep, setDemoStep] = useState(-1); // -1 idle, 0..N-1 analyzing, N done
  const demoTimer = useRef(null);

  useEffect(() => {
    if (status === AUTH_STATUS.AUTHENTICATED) {
      navigate('/app', { replace: true });
    }
  }, [status, navigate]);

  useEffect(() => () => clearInterval(demoTimer.current), []);

  function runDemo() {
    if (!demoText.trim() || demoStep >= 0) return;
    setDemoStep(0);
    let i = 0;
    demoTimer.current = setInterval(() => {
      i += 1;
      if (i >= DEMO_STEPS.length) {
        clearInterval(demoTimer.current);
        setDemoStep(DEMO_STEPS.length);
      } else {
        setDemoStep(i);
      }
    }, 620);
  }

  const demoIdle = demoStep === -1;
  const demoAnalyzing = demoStep >= 0 && demoStep < DEMO_STEPS.length;
  const demoDone = demoStep === DEMO_STEPS.length;

  return (
    <div className="stack" style={{ gap: 88 }}>
      {/* ---------------- HERO ---------------- */}
      <section className="hero-wrap">
        <span className="hero-badge">✦ New version 2.0 →</span>

        <h1 className="hero-headline">
          Streamline your <em>legal research</em> with AI
        </h1>

        <p className="hero-sub">
          Describe a real-world situation in plain language. Verilex identifies the legal concepts
          involved and surfaces the Indian statutes, provisions and judgments that may be relevant —
          then explains, in plain English, why.
        </p>

        <div className="hero-actions">
          <button type="button" className="btn primary" onClick={() => navigate('/login?returnTo=%2Fapp')}>
            Get Started — It's Free
          </button>
          <button type="button" className="btn ghost" onClick={() => navigate('/login?returnTo=%2Fapp')}>
            Sign In
          </button>
        </div>

        <div className="row" style={{ flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 4 }}>
          {EXAMPLE_AREAS.map((area) => (
            <span key={area} className="tag dim">{area}</span>
          ))}
        </div>

        {/* floating mockup dashboard */}
        <div className="hero-mockup">
          <div className="row spread" style={{ marginBottom: 4 }}>
            <span className="mono small muted" style={{ fontWeight: 700 }}>Scenario Insights</span>
            <span className="tag accent">Live</span>
          </div>
          <div className="mockup-bars">
            <span style={{ height: '38%' }} />
            <span style={{ height: '62%' }} />
            <span style={{ height: '48%' }} />
            <span style={{ height: '85%' }} />
            <span style={{ height: '55%' }} />
            <span style={{ height: '70%' }} />
            <span style={{ height: '30%' }} />
            <span style={{ height: '90%' }} />
          </div>
          <div className="mockup-nodes">
            <span className="mockup-node-line" />
            <span className="mockup-node" />
            <span className="mockup-node-line" />
            <span className="mockup-node" />
            <span className="mockup-node-line" />
            <span className="mockup-node" />
            <span className="mockup-node-line" />
          </div>
        </div>
      </section>

      {/* ---------------- TRY IT NOW — teaser demo, gated at sign-in ---------------- */}
      <section>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span className="eyebrow">Try it now</span>
          <h2 style={{ fontSize: 30 }}>See it work on your own situation</h2>
        </div>

        <div className="panel" style={{ maxWidth: 720, margin: '0 auto' }}>
          {demoIdle && (
            <>
              <label className="field-label" htmlFor="demo-scenario">
                Describe what happened
              </label>
              <textarea
                id="demo-scenario"
                rows={3}
                placeholder="e.g. My landlord is refusing to return my security deposit after I moved out…"
                value={demoText}
                onChange={(e) => setDemoText(e.target.value)}
              />
              <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
                <button type="button" className="btn primary" onClick={runDemo} disabled={!demoText.trim()}>
                  Analyze my situation
                </button>
              </div>
            </>
          )}

          {demoAnalyzing && (
            <div className="stack" style={{ gap: 14 }}>
              <div className="row spread">
                <span className="loading-bar">Analyzing</span>
                <span className="tag accent">{demoStep + 1} / {DEMO_STEPS.length}</span>
              </div>
              <p className="mono small muted" style={{ margin: 0 }}>{DEMO_STEPS[demoStep]}</p>
              <div className="skel-block skel-line w-100" />
              <div className="skel-block skel-line w-90" />
              <div className="skel-block skel-line w-70" />
            </div>
          )}

          {demoDone && (
            <div className="stack" style={{ gap: 16 }}>
              <div className="row spread">
                <span className="tag accent">3 relevant sources found</span>
                <span className="tag dim">Preview</span>
              </div>

              <div className="stack" style={{ gap: 12, position: 'relative' }}>
                {DEMO_TEASER_ROWS.map((row, idx) => (
                  <div
                    key={idx}
                    className="skel-panel"
                    style={{ padding: 16, filter: 'blur(5px)', userSelect: 'none' }}
                    aria-hidden="true"
                  >
                    <div className="skel-block skel-line w-30" style={{ marginBottom: 10 }} />
                    <div className="skel-block skel-line" style={{ width: row.w }} />
                  </div>
                ))}

                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    textAlign: 'center',
                  }}
                >
                  <p className="mono small" style={{ margin: 0, fontWeight: 700 }}>
                    Sign in to view these results
                  </p>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => navigate('/login?returnTo=%2Fapp')}
                  >
                    Unlock full results
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ---------------- HOW IT WORKS — bento grid ---------------- */}
      <section>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span className="eyebrow">How it works</span>
          <h2 style={{ fontSize: 30 }}>From situation to source, in six steps</h2>
        </div>
        <div className="grid-3">
          {PIPELINE_STEPS.map((step) => (
            <div key={step.id} className="bento-card">
              <div className="bento-icon">{step.icon}</div>
              <p className="bento-title">{step.id} · {step.label}</p>
              <p className="bento-text">{step.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- DIFFERENTIATOR ---------------- */}
      <section>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span className="eyebrow">Why Verilex</span>
          <h2 style={{ fontSize: 30 }}>Not another AI legal chatbot</h2>
        </div>
        <div className="grid-2">
          <div className="panel">
            <div className="tag warn" style={{ marginBottom: 14 }}>Generic approach</div>
            <p className="bento-text" style={{ fontSize: 14 }}>
              You ask a legal question. A model generates an answer from its general training —
              with no specific retrieved source, no citation you can verify, and no way to tell
              fact from guess.
            </p>
          </div>
          <div className="panel">
            <div className="tag accent" style={{ marginBottom: 14 }}>Verilex approach</div>
            <p className="bento-text" style={{ fontSize: 14 }}>
              The system retrieves an actual legal provision from a connected legal source. You
              select it. The AI explains how that specific, inspectable source relates to your
              described situation — nothing more.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- SOURCE / TRUST — bento grid ---------------- */}
      <section>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span className="eyebrow">Source integrity</span>
          <h2 style={{ fontSize: 30 }}>Grounded in real, verifiable sources</h2>
        </div>
        <div className="grid-2">
          <div className="bento-card">
            <div className="bento-icon mint">①</div>
            <p className="bento-text">Legal material comes from external legal sources / APIs — never invented.</p>
          </div>
          <div className="bento-card">
            <div className="bento-icon mint">②</div>
            <p className="bento-text">Verilex indexes and caches that material for search — it is not the authority.</p>
          </div>
          <div className="bento-card">
            <div className="bento-icon amber">③</div>
            <p className="bento-text">The AI explanation is grounded strictly in the one source you selected.</p>
          </div>
          <div className="bento-card">
            <div className="bento-icon amber">④</div>
            <p className="bento-text">You can always open and inspect the original external source.</p>
          </div>
        </div>

        <div className="callout-authority" style={{ marginTop: 24, textAlign: 'center' }}>
          External legal APIs and cited statutes remain the authoritative source at all
          times. Verilex's database is a cache, search index and provenance store — never a
          replacement for the official legal text, and does not claim to represent the complete body
          of Indian law. Verilex is not a lawyer and does not provide legal advice or predict outcomes.
        </div>

        <div className="row" style={{ marginTop: 28, justifyContent: 'center' }}>
          <button type="button" className="btn primary" onClick={() => navigate('/login?returnTo=%2Fapp')}>
            Get Started — It's Free
          </button>
        </div>
      </section>
    </div>
  );
}
