import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, AUTH_STATUS } from '../context/AuthContext.jsx';

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.69 9c0-.6.1-1.18.28-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

const ERROR_MESSAGES = {
  oauth_failed: 'Google sign-in did not complete. No account changes were made. You can try again, or use email and password below.',
};

function FieldError({ messages }) {
  if (!messages?.length) return null;
  return (
    <div className="mono small" style={{ color: 'var(--warn)', marginTop: 6 }}>
      {messages[0]}
    </div>
  );
}

export default function LoginPage() {
  const { status, googleEnabled, signIn, signInWithPassword, signUp } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const returnTo = params.get('returnTo') || '/';
  const errorCode = params.get('error');
  const sessionExpired = status === AUTH_STATUS.SESSION_EXPIRED;

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (status === AUTH_STATUS.AUTHENTICATED) {
      navigate(returnTo, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function switchMode(nextMode) {
    setMode(nextMode);
    setFormError(null);
    setFieldErrors({});
    setPassword('');
    setConfirmPassword('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signUp({ email, password, confirmPassword });
      } else {
        await signInWithPassword({ email, password });
      }
      navigate(returnTo, { replace: true });
    } catch (err) {
      setFieldErrors(err.details?.fieldErrors || {});
      setFormError(err.details?.fieldErrors ? null : err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack" style={{ maxWidth: 480, margin: '40px auto' }}>
      <div className="panel">
        <div className="panel-header">
          <span>AUTH.ENTRY_POINT</span>
          <span className="mono small muted">mode: {mode === 'signup' ? 'CREATE_ACCOUNT' : 'SIGN_IN'}</span>
        </div>

        <div className="row" style={{ marginBottom: 18 }}>
          <span className="brand-mark">
            <span className="bracket">[</span>VERILEX<span className="bracket">]</span>
          </span>
        </div>

        <p className="muted small" style={{ marginTop: 0 }}>
          An account is required to run a search — this keeps a history of the legal material
          you've reviewed. Google is the fastest way in; email and password remain available if
          Google is unavailable, blocked, or not your preference.
        </p>

        {(errorCode || sessionExpired || formError) && (
          <div className="notice" style={{ marginBottom: 16 }}>
            ERR :: {sessionExpired ? 'Your session expired. Please sign in again.' : formError || ERROR_MESSAGES[errorCode] || 'Authentication failed.'}
          </div>
        )}

        {googleEnabled ? (
          <button
            type="button"
            className="btn"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
            onClick={() => signIn(returnTo)}
          >
            <GoogleMark />
            Continue with Google
          </button>
        ) : (
          <div className="notice info">Google sign-in is not configured on this server. Use email and password below.</div>
        )}

        <div className="row" style={{ margin: '18px 0', gap: 12 }}>
          <div style={{ flex: 1, borderTop: '1px dashed var(--border)' }} />
          <span className="mono small muted">OR</span>
          <div style={{ flex: 1, borderTop: '1px dashed var(--border)' }} />
        </div>

        <form onSubmit={handleSubmit} className="stack" style={{ gap: 14 }}>
          <div>
            <label className="field-label" htmlFor="email">// email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <FieldError messages={fieldErrors.email} />
          </div>

          <div>
            <label className="field-label" htmlFor="password">// password</label>
            <input
              id="password"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <FieldError messages={fieldErrors.password} />
            {mode === 'signup' && !fieldErrors.password && (
              <div className="mono small muted" style={{ marginTop: 6 }}>
                8+ characters, at least one letter and one number.
              </div>
            )}
          </div>

          {mode === 'signup' && (
            <div>
              <label className="field-label" htmlFor="confirmPassword">// confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <FieldError messages={fieldErrors.confirmPassword} />
            </div>
          )}

          <button type="submit" className="btn primary" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? (
              <span className="loading-bar">{mode === 'signup' ? 'Creating account' : 'Signing in'}</span>
            ) : mode === 'signup' ? (
              'Create Account →'
            ) : (
              'Sign In →'
            )}
          </button>
        </form>

        <p className="mono small" style={{ textAlign: 'center', marginTop: 16 }}>
          {mode === 'signup' ? (
            <>
              Already have an account?{' '}
              <button type="button" className="mono small" style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0 }} onClick={() => switchMode('signin')}>
                Sign in
              </button>
            </>
          ) : (
            <>
              Don't have an account?{' '}
              <button type="button" className="mono small" style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0 }} onClick={() => switchMode('signup')}>
                Create one
              </button>
            </>
          )}
        </p>

        <hr className="rule" />
        <p className="mono small muted" style={{ margin: 0 }}>
          By continuing you agree this tool provides legal information, not legal advice. See the
          disclaimer in the footer. Passwords are hashed server-side and never stored in plain
          text.
        </p>
      </div>
    </div>
  );
}
