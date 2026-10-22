import { useState } from 'react';
import { Routes, Route, NavLink, Link } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import AppHomePage from './pages/AppHomePage.jsx';
import ResultsPage from './pages/ResultsPage.jsx';
import SourcePage from './pages/SourcePage.jsx';
import ExplanationPage from './pages/ExplanationPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MySearchesPage from './pages/MySearchesPage.jsx';
import StarredPage from './pages/StarredPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth, AUTH_STATUS } from './context/AuthContext.jsx';

function AccountMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn ghost"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <span className="status-dot" aria-hidden="true" />
        <span className="mono small">{user.name || user.email || 'Account'}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="panel"
          style={{ position: 'absolute', right: 0, top: '110%', minWidth: 220, padding: 0, zIndex: 30 }}
        >
          <div className="mono small muted" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            {user.email || 'Signed in via Google'}
          </div>
          <Link
            to="/account/searches"
            role="menuitem"
            className="mono small"
            style={{ display: 'block', padding: '10px 14px', color: 'var(--ink)' }}
            onClick={() => setOpen(false)}
          >
            My Searches
          </Link>
          <Link
            to="/account/starred"
            role="menuitem"
            className="mono small"
            style={{ display: 'block', padding: '10px 14px', color: 'var(--ink)', borderTop: '1px solid var(--border)' }}
            onClick={() => setOpen(false)}
          >
            Starred Sources
          </Link>
          <button
            type="button"
            role="menuitem"
            className="mono small"
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '10px 14px',
              background: 'transparent',
              border: 'none',
              borderTop: '1px solid var(--border)',
              color: 'var(--warn)',
            }}
            onClick={() => {
              setOpen(false);
              signOut();
            }}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

function AuthControls() {
  const { status } = useAuth();

  if (status === AUTH_STATUS.AUTHENTICATING) {
    return <span className="mono small muted">checking session…</span>;
  }

  if (status === AUTH_STATUS.AUTHENTICATED) {
    return <AccountMenu />;
  }

  // Both buttons land on the same /login entry point (Google + email/
  // password, with a sign-in/sign-up toggle) rather than jumping straight
  // into the Google redirect — Google is one option there, not the only one.
  return (
    <div className="row" style={{ gap: 8 }}>
      <Link to="/login?returnTo=%2Fapp" className="btn ghost">
        Sign in
      </Link>
      <Link to="/login?returnTo=%2Fapp" className="btn">
        Create account
      </Link>
    </div>
  );
}

function ScaleIcon() {
  return (
    <svg className="brand-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M16 3v24" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 29h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 7 6 10l4.5 9a5 5 0 0 0 9 0L16 7Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M16 7l10 3-4.5 9a5 5 0 0 1-9 0L16 7Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="16" cy="5" r="2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export default function App() {
  const { status } = useAuth();
  const homeHref = status === AUTH_STATUS.AUTHENTICATED ? '/app' : '/';

  return (
    <div className="shell">
      <header className="topbar">
        <Link to={homeHref} className="brand" style={{ textDecoration: 'none' }}>
          <ScaleIcon />
          <span className="brand-mark">Verilex</span>
        </Link>
        <div className="row" style={{ gap: 20 }}>
          {status === AUTH_STATUS.AUTHENTICATED && (
            <nav>
              <NavLink to="/app" end className={({ isActive }) => (isActive ? 'active' : '')}>
                Situation Search
              </NavLink>
            </nav>
          )}
          <AuthControls />
        </div>
      </header>

      <div className="container">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppHomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search/:searchId"
            element={
              <ProtectedRoute>
                <ResultsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sources/:sourceId"
            element={
              <ProtectedRoute>
                <SourcePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/explanations/:explanationId"
            element={
              <ProtectedRoute>
                <ExplanationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/searches"
            element={
              <ProtectedRoute>
                <MySearchesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/starred"
            element={
              <ProtectedRoute>
                <StarredPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>

      <footer className="footer">
        <div className="footer-grid">
          <div>
            <div className="row" style={{ gap: 10, marginBottom: 14 }}>
              <ScaleIcon />
              <span className="brand-mark" style={{ color: 'var(--on-dark)' }}>Verilex</span>
            </div>
            <p style={{ maxWidth: 320, fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
              Semantic legal discovery and explanation for Indian law — grounded in retrievable
              statutes, provisions and judgments, never invented.
            </p>
          </div>
          <div>
            <div className="footer-col-title">Application</div>
            <div className="footer-links">
              <Link to={homeHref}>Home</Link>
              <Link to="/login">Sign In</Link>
            </div>
          </div>
          <div>
            <div className="footer-col-title">Trust &amp; Limits</div>
            <div className="footer-links">
              <span>Not a Lawyer</span>
              <span>Not Legal Advice</span>
              <span>Source-Grounded Explanation Only</span>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>Verilex</span>
          <span>The Database Is a Cache &amp; Index, Never the Authority</span>
        </div>
      </footer>
    </div>
  );
}
