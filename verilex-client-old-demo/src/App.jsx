import { useState } from 'react';
import { Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import AppHomePage from './pages/AppHomePage.jsx';
import ResultsPage from './pages/ResultsPage.jsx';
import SourcePage from './pages/SourcePage.jsx';
import ExplanationPage from './pages/ExplanationPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MySearchesPage from './pages/MySearchesPage.jsx';
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
        <span className="mono small">{(user.name || user.email || 'ACCOUNT').toUpperCase()}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="panel"
          style={{ position: 'absolute', right: 0, top: '110%', minWidth: 220, padding: 0, zIndex: 30 }}
        >
          <div className="mono small muted" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            {user.email || 'signed in via google'}
          </div>
          <Link
            to="/account/searches"
            role="menuitem"
            className="mono small"
            style={{ display: 'block', padding: '10px 14px', color: 'var(--ink)' }}
            onClick={() => setOpen(false)}
          >
            ./my_searches
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
            SIGN OUT →
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

  // Single "Get Started" entry point (lands on /login — Google + email/
  // password, with a sign-in/sign-up toggle) rather than jumping straight
  // into the Google redirect.
  return (
    <Link to="/login?returnTo=%2Fapp" className="btn primary">
      Get Started
    </Link>
  );
}

export default function App() {
  const { status } = useAuth();
  const location = useLocation();
  const homeHref = status === AUTH_STATUS.AUTHENTICATED ? '/app' : '/';
  const isLanding = location.pathname === '/';

  return (
    <div className="shell">
      <header className="topbar">
        <Link to={homeHref} className="brand" style={{ textDecoration: 'none' }}>
          <span className="brand-mark">Verilex</span>
        </Link>
        <div className="row" style={{ gap: 20 }}>
          <nav>
            {isLanding && status !== AUTH_STATUS.AUTHENTICATED && (
              <>
                <a href="#features">Features</a>
                <a href="#pricing">Pricing</a>
                <a href="#about">About</a>
                <a href="#contact">Contact</a>
              </>
            )}
            {status === AUTH_STATUS.AUTHENTICATED && (
              <NavLink to="/app" end className={({ isActive }) => (isActive ? 'active' : '')}>
                Situation Search
              </NavLink>
            )}
          </nav>
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
        </Routes>
      </div>

      <footer className="footer">
        <span>VERILEX // NOT A LAWYER // NOT LEGAL ADVICE // SOURCE-GROUNDED EXPLANATION ONLY</span>
        <span>DB = CACHE + INDEX, NOT AUTHORITY</span>
      </footer>
    </div>
  );
}
