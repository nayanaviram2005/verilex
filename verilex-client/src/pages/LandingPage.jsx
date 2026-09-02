import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, AUTH_STATUS } from '../context/AuthContext.jsx';

const EXAMPLE_AREAS = ['TENANCY', 'EMPLOYMENT', 'ONLINE FRAUD', 'CONSUMER DISPUTES'];

const PIPELINE_STEPS = [
  { id: '01', label: 'DESCRIBE', detail: 'you describe what happened, in your own words' },
  { id: '02', label: 'UNDERSTAND', detail: 'the system extracts the legal concepts involved' },
  { id: '03', label: 'DISCOVER', detail: 'relevant statutes, provisions and judgments are retrieved' },
  { id: '04', label: 'SELECT', detail: 'you pick one specific provision to examine' },
  { id: '05', label: 'EXPLAIN', detail: 'the AI explains how that source relates to your situation' },
  { id: '06', label: 'VERIFY', detail: 'you inspect the original source yourself' },
];

/**
 * Public front door. This is NOT a working preview of the product — there
 * is no scenario input or search here, and nothing on this page performs a
 * real legal search or returns real/fabricated results. It exists to
 * explain what VERILEX does and move a visitor toward authentication;
 * the actual application lives at /app, behind sign-in.
 */
export default function LandingPage() {
  const { status, signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === AUTH_STATUS.AUTHENTICATED) {
      navigate('/app', { replace: true });
    }
  }, [status, navigate]);

  return (
    <div className="stack" style={{ gap: 40 }}>
      {/* ---------------- HERO ---------------- */}
      <section className="stack" style={{ gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 30, lineHeight: 1.15, marginBottom: 10 }}>
            Describe what happened.<br />Find the law connected to it.
          </h1>
          <p className="muted" style={{ maxWidth: 640, marginTop: 0 }}>
            No legal terminology required. VERILEX identifies the legal concepts in a real-world
            situation, retrieves potentially relevant Indian statutes, provisions and court
            judgments from connected legal-data sources, and — once you pick one — explains why
            it's relevant. It does not give legal advice, and it does not decide outcomes.
          </p>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span>root@verilex:~$ authenticate</span>
            <span className="mono small muted">mode: ENTRY_POINT</span>
          </div>

          <p className="muted small" style={{ marginTop: 0, maxWidth: 560 }}>
            An account is required to run a search — this keeps a history of the legal material
            you've reviewed and lets the explanation layer stay tied to your own scenarios.
            Authentication is Google-only; no password to create or remember.
          </p>

          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn primary" onClick={() => signIn('/app')}>
              Sign In / Create Account →
            </button>
            <span className="mono small muted">continues with Google — no separate signup form</span>
          </div>
        </div>

        <div className="row" style={{ flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <span className="mono small muted">// spans areas such as —</span>
          {EXAMPLE_AREAS.map((area) => (
            <span key={area} className="tag dim">{area}</span>
          ))}
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section>
        <div className="divider-label">how it works</div>
        <div className="panel">
          <div className="pipeline">
            {PIPELINE_STEPS.map((step) => (
              <div key={step.id} className="pipeline-step">
                <div className="mono small" style={{ color: 'var(--accent)', marginBottom: 4 }}>{step.id}</div>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>{step.label}</div>
                <div className="muted small">{step.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- DIFFERENTIATOR ---------------- */}
      <section>
        <div className="divider-label">not another ai legal chatbot</div>
        <div className="grid-2">
          <div className="panel" style={{ borderColor: 'var(--border)' }}>
            <div className="tag warn" style={{ marginBottom: 14 }}>[X] GENERIC APPROACH</div>
            <p className="mono small" style={{ margin: 0 }}>
              You ask a legal question. A model generates an answer from its general training —
              with no specific retrieved source, no citation you can verify, and no way to tell
              fact from guess.
            </p>
          </div>
          <div className="panel" style={{ borderColor: 'var(--accent)' }}>
            <div className="tag accent" style={{ marginBottom: 14 }}>[OK] VERILEX APPROACH</div>
            <p className="mono small" style={{ margin: 0 }}>
              The system retrieves an actual legal provision from a connected legal source. You
              select it. The AI explains how that specific, inspectable source relates to your
              described situation — nothing more.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- SOURCE / TRUST ---------------- */}
      <section>
        <div className="divider-label">source integrity</div>
        <div className="panel">
          <div className="grid-2" style={{ rowGap: 16 }}>
            <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
              <span className="mono" style={{ color: 'var(--accent)' }}>01</span>
              <span className="small muted">Legal material comes from external legal sources / APIs — never invented.</span>
            </div>
            <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
              <span className="mono" style={{ color: 'var(--accent)' }}>02</span>
              <span className="small muted">VERILEX indexes and caches that material for search — it is not the authority.</span>
            </div>
            <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
              <span className="mono" style={{ color: 'var(--accent)' }}>03</span>
              <span className="small muted">The AI explanation is grounded strictly in the one source you selected.</span>
            </div>
            <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
              <span className="mono" style={{ color: 'var(--accent)' }}>04</span>
              <span className="small muted">You can always open and inspect the original external source.</span>
            </div>
          </div>
        </div>
        <div className="callout-authority" style={{ marginTop: 16 }}>
          [SYSTEM NOTE] External legal APIs and cited statutes remain the authoritative source at all
          times. This application's database is a cache, search index and provenance store — never a
          replacement for the official legal text, and does not claim to represent the complete body
          of Indian law. VERILEX is not a lawyer and does not provide legal advice or predict outcomes.
        </div>

        <div className="row" style={{ marginTop: 20 }}>
          <button type="button" className="btn" onClick={() => signIn('/app')}>
            Sign In / Create Account →
          </button>
        </div>
      </section>
    </div>
  );
}
