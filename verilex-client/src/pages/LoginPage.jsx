import { useEffect } from 'react';
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
  oauth_failed: 'Google sign-in did not complete. No account changes were made.',
};

export default function LoginPage() {
  const { status, googleEnabled, signIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const returnTo = params.get('returnTo') || '/';
  const errorCode = params.get('error');
  const sessionExpired = status === AUTH_STATUS.SESSION_EXPIRED;

  useEffect(() => {
    if (status === AUTH_STATUS.AUTHENTICATED) {
      navigate(returnTo, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="stack" style={{ maxWidth: 480, margin: '40px auto' }}>
      <div className="panel">
        <div className="panel-header">
          <span>AUTH.ENTRY_POINT</span>
          <span className="mono small muted">verilex-session</span>
        </div>

        <div className="row" style={{ marginBottom: 18 }}>
          <span className="brand-mark">
            <span className="bracket">[</span>VERILEX<span className="bracket">]</span>
          </span>
        </div>

        <p className="muted small" style={{ marginTop: 0 }}>
          Sign in to save searches, revisit retrieved sources and build a history of the legal
          material you've reviewed. Anonymous situation search remains available without an
          account.
        </p>

        {(errorCode || sessionExpired) && (
          <div className="notice" style={{ marginBottom: 16 }}>
            ERR :: {sessionExpired ? 'Your session expired. Please sign in again.' : ERROR_MESSAGES[errorCode] || 'Authentication failed.'}
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
          <div className="notice info">Google sign-in is not configured on this server yet.</div>
        )}

        <hr className="rule" />
        <p className="mono small muted" style={{ margin: 0 }}>
          By continuing you agree this tool provides legal information, not legal advice. See the
          disclaimer in the footer. No password is stored — authentication is handled entirely by
          Google.
        </p>
      </div>
    </div>
  );
}
