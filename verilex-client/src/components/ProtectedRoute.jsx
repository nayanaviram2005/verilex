import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, AUTH_STATUS } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === AUTH_STATUS.AUTHENTICATING) {
    return <div className="loading-bar">Checking session</div>;
  }

  if (status !== AUTH_STATUS.AUTHENTICATED) {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  return children;
}
