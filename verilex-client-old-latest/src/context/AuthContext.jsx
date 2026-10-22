import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, BASE_URL } from '../api/client.js';

export const AUTH_STATUS = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  AUTHENTICATING: 'AUTHENTICATING',
  AUTHENTICATED: 'AUTHENTICATED',
  AUTH_ERROR: 'AUTH_ERROR',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [status, setStatus] = useState(AUTH_STATUS.AUTHENTICATING);
  const [user, setUser] = useState(null);
  const [googleEnabled, setGoogleEnabled] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [{ user: me }, { googleEnabled: enabled }] = await Promise.all([api.me(), api.authStatus()]);
      setGoogleEnabled(enabled);
      if (me) {
        setUser(me);
        setStatus(AUTH_STATUS.AUTHENTICATED);
      } else {
        setUser(null);
        setStatus(AUTH_STATUS.UNAUTHENTICATED);
      }
    } catch (_err) {
      setUser(null);
      setStatus(AUTH_STATUS.UNAUTHENTICATED);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signIn = useCallback((returnTo) => {
    const dest = returnTo || `${window.location.pathname}${window.location.search}`;
    window.location.href = `${BASE_URL}/api/auth/google?returnTo=${encodeURIComponent(dest)}`;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setStatus(AUTH_STATUS.UNAUTHENTICATED);
    }
  }, []);

  const markSessionExpired = useCallback(() => {
    setUser(null);
    setStatus(AUTH_STATUS.SESSION_EXPIRED);
  }, []);

  // Email/password fallback — credential verification happens entirely
  // server-side (see verilex-backend/src/routes/auth.js); this just relays
  // the request and reflects the resulting session, or lets the caller
  // catch and display the server's error.
  const signInWithPassword = useCallback(async ({ email, password }) => {
    const { user: loggedInUser } = await api.login({ email, password });
    setUser(loggedInUser);
    setStatus(AUTH_STATUS.AUTHENTICATED);
    return loggedInUser;
  }, []);

  const signUp = useCallback(async ({ email, password, confirmPassword }) => {
    const { user: newUser } = await api.signup({ email, password, confirmPassword });
    setUser(newUser);
    setStatus(AUTH_STATUS.AUTHENTICATED);
    return newUser;
  }, []);

  const value = useMemo(
    () => ({ status, user, googleEnabled, signIn, signInWithPassword, signUp, signOut, refresh, markSessionExpired }),
    [status, user, googleEnabled, signIn, signInWithPassword, signUp, signOut, refresh, markSessionExpired]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
