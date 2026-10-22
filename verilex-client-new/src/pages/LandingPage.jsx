import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, AUTH_STATUS } from '../context/AuthContext.jsx';

const EXAMPLE_AREAS = ['Tenancy', 'Employment', 'Online Fraud', 'Consumer Disputes'];

const STATS = [
  { n: '3', label: 'Retrieval Methods Fused — API, Lexical, Semantic' },
  { n: '6', label: 'Stages, Situation to Grounded Explanation' },
  { n: '0', label: 'Fabricated Citations — Ever' },
  { n: '1', label: 'Source Per Explanation, Strictly Grounded' },
];

const PIPELINE_STEPS = [
  { id: '01', label: 'Describe', detail: 'You describe what happened, in your own words.' },
  { id: '02', label: 'Understand', detail: 'The system extracts the legal concepts involved.' },
  { id: '03', label: 'Discover', detail: 'Relevant statutes, provisions and judgments are retrieved.' },
  { id: '04', label: 'Select', detail: 'You pick one specific provision to examine.' },
  { id: '05', label: 'Explain', detail: 'The AI explains how that source relates to your situation.' },
  { id: '06', label: 'Verify', detail: 'You inspect the original source yourself.' },
];

const PRINCIPLES = [
  { label: 'Real Sources Only', detail: 'Legal material originates from external providers — never invented.' },
  { label: 'Cache, Not Authority', detail: 'The database indexes material for search; it is never the authoritative text.' },
  { label: 'Grounded Explanation', detail: 'AI commentary is tethered strictly to the one source you selected.' },
  { label: 'Always Verifiable', detail: 'Every result links back to the original external source.' },
];

function BadgeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="11" cy="11" r="7.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 11.2l2 2 4-4.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HeroEmblem() {
  return (
    <svg viewBox="0 0 280 280" width="100%" height="100%" style={{ maxWidth: 340 }} aria-hidden="true">
      <circle cx="140" cy="140" r="128" stroke="#5c3a21" strokeOpacity="0.45" strokeWidth="1" fill="none" />
      <circle cx="140" cy="140" r="104" stroke="#5c3a21" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="2 6" fill="none" />
      <path d="M140 54v172" stroke="#f6f1e7" strokeOpacity="0.85" strokeWidth="1.4" />
      <path d="M96 170h88" stroke="#f6f1e7" strokeOpacity="0.85" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M140 70 90 86l22 46a28 28 0 0 0 28 17" stroke="#f6f1e7" strokeWidth="1.3" fill="none" />
      <path d="M140 70l50 16-22 46a28 28 0 0 1-28 17" stroke="#f6f1e7" strokeWidth="1.3" fill="none" />
      <circle cx="140" cy="60" r="7" stroke="#f6f1e7" strokeWidth="1.3" fill="none" />
      <circle cx="90" cy="86" r="3" fill="#5c3a21" />
      <circle cx="190" cy="86" r="3" fill="#5c3a21" />
      <circle cx="140" cy="140" r="3" fill="#f6f1e7" />
      <circle cx="140" cy="140" r="52" stroke="#5c3a21" strokeOpacity="0.5" strokeWidth="1" fill="none" />
    </svg>
  );
}

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

  useEffect(() => {
    if (status === AUTH_STATUS.AUTHENTICATED) {
      navigate('/app', { replace: true });
    }
  }, [status, navigate]);

  return (
    <div className="stack landing-root" style={{ gap: 0 }}>
      {/* ---------------- HERO ---------------- */}
      <section className="hero-dark bleed">
        <div className="hero-inner">
          <div>
            <span className="eyebrow-dark">Semantic Legal Discovery</span>
            <h1 className="hero-headline">
              Describe what happened.
              <br />
              <em>Find the law</em> connected to it.
            </h1>
            <p className="hero-sub">
              No legal terminology required. Verilex identifies the legal concepts in a real-world
              situation, retrieves potentially relevant Indian statutes, provisions and court
              judgments from connected legal-data sources, and — once you pick one — explains why
              it's relevant. It does not give legal advice, and it does not decide outcomes.
            </p>
            <div className="hero-actions">
              <button type="button" className="btn primary" onClick={() => navigate('/login?returnTo=%2Fapp')}>
                Sign In or Create an Account
              </button>
              <a href="#how-it-works" className="btn ghost on-dark">
                See How It Works
              </a>
            </div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 10, marginTop: 28 }}>
              {EXAMPLE_AREAS.map((area) => (
                <span key={area} className="tag dim" style={{ borderColor: 'var(--border-dark)', color: 'var(--on-dark-muted)' }}>
                  {area}
                </span>
              ))}
            </div>
          </div>
          <div className="hero-art">
            <HeroEmblem />
          </div>
        </div>
      </section>

      {/* ---------------- STAT BAR ---------------- */}
      <section className="stat-bar bleed">
        <div className="stat-bar-inner">
          {STATS.map((s) => (
            <div key={s.label} className="stat-item">
              <div className="stat-number">{s.n}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="container" style={{ padding: '72px 24px' }}>
        {/* ---------------- HOW IT WORKS ---------------- */}
        <section id="how-it-works" style={{ marginBottom: 72 }}>
          <div className="section-head">
            <span className="eyebrow-dark" style={{ color: 'var(--accent-deep)' }}>Process</span>
            <h2>How it works</h2>
          </div>
          <div className="grid-3">
            {PIPELINE_STEPS.map((step) => (
              <div key={step.id} className="ed-card">
                <div className="ed-card-icon">{step.id}</div>
                <h3>{step.label}</h3>
                <p>{step.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------- DIFFERENTIATOR ---------------- */}
        <section style={{ marginBottom: 72 }}>
          <div className="section-head">
            <span className="eyebrow-dark" style={{ color: 'var(--accent-deep)' }}>Distinction</span>
            <h2>Not another AI legal chatbot</h2>
          </div>
          <div className="grid-2">
            <div className="panel">
              <div className="tag warn" style={{ marginBottom: 14 }}>Generic Approach</div>
              <p className="small" style={{ margin: 0, color: 'var(--ink-soft)' }}>
                You ask a legal question. A model generates an answer from its general training —
                with no specific retrieved source, no citation you can verify, and no way to tell
                fact from guess.
              </p>
            </div>
            <div className="panel" style={{ borderColor: 'var(--accent)' }}>
              <div className="tag accent" style={{ marginBottom: 14 }}>The Verilex Approach</div>
              <p className="small" style={{ margin: 0, color: 'var(--ink-soft)' }}>
                The system retrieves an actual legal provision from a connected legal source. You
                select it. The AI explains how that specific, inspectable source relates to your
                described situation — nothing more.
              </p>
            </div>
          </div>
        </section>

        {/* ---------------- PRINCIPLES / SOURCE INTEGRITY ---------------- */}
        <section>
          <div className="section-head">
            <span className="eyebrow-dark" style={{ color: 'var(--accent-deep)' }}>Source Integrity</span>
            <h2>Grounded in real, verifiable sources</h2>
          </div>
          <div className="badge-row">
            {PRINCIPLES.map((p) => (
              <div key={p.label} className="badge-item">
                <span className="badge-seal">
                  <BadgeIcon />
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>{p.label}</div>
                  <div className="badge-label">{p.detail}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="callout-authority" style={{ marginTop: 32 }}>
            Note. External legal APIs and cited statutes remain the authoritative source at all
            times. This application's database is a cache, search index and provenance store — never a
            replacement for the official legal text, and does not claim to represent the complete body
            of Indian law. Verilex is not a lawyer and does not provide legal advice or predict outcomes.
          </div>
        </section>
      </div>

      {/* ---------------- CTA ---------------- */}
      <section className="cta-dark bleed">
        <h2>Begin your research</h2>
        <p>
          An account is required to run a search — this keeps a history of the legal material
          you've reviewed and lets the explanation layer stay tied to your own scenarios. Continue
          with Google, or use email and password if you prefer.
        </p>
        <button type="button" className="btn primary" onClick={() => navigate('/login?returnTo=%2Fapp')}>
          Sign In or Create an Account
        </button>
      </section>
    </div>
  );
}
