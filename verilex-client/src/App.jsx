import { Routes, Route, NavLink } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import ResultsPage from './pages/ResultsPage.jsx';
import SourcePage from './pages/SourcePage.jsx';
import ExplanationPage from './pages/ExplanationPage.jsx';

export default function App() {
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <span className="bracket">[</span>VERILEX<span className="bracket">]</span>
          </span>
          <span className="brand-sub">semantic legal discovery terminal</span>
        </div>
        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            ./situation
          </NavLink>
        </nav>
      </header>

      <div className="container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search/:searchId" element={<ResultsPage />} />
          <Route path="/sources/:sourceId" element={<SourcePage />} />
          <Route path="/explanations/:explanationId" element={<ExplanationPage />} />
        </Routes>
      </div>

      <footer className="footer">
        <span>VERILEX // NOT A LAWYER // NOT LEGAL ADVICE // SOURCE-GROUNDED EXPLANATION ONLY</span>
        <span>DB = CACHE + INDEX, NOT AUTHORITY</span>
      </footer>
    </div>
  );
}
