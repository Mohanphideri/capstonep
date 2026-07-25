import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authService } from '../services/api.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      // Corrupted/stale localStorage value - don't let this crash the whole app on load.
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);

  // True only while we're re-validating a persisted token against the backend
  // on first load (page refresh / app startup). Starts true whenever a token
  // is already sitting in localStorage, so route guards can hold off on any
  // redirect decision until this settles - that's what stops a refresh from
  // bouncing straight to /login before we've even asked the backend.
  const [initializing, setInitializing] = useState(() => !!localStorage.getItem('token'));

  const login = useCallback((token, userData) => {
    setToken(token);
    setUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  // On first mount, if a token was persisted from a previous session, ask the
  // backend to confirm it's still valid and pull the *current* user record
  // (name/role/active-status) rather than trusting whatever was cached in
  // localStorage. This is what makes "refresh the browser" behave correctly:
  // we don't redirect anywhere while this is in flight, and we only clear the
  // session if the backend explicitly says the token is invalid/expired/the
  // account no longer exists - never just because the app remounted.
  useEffect(() => {
    const existingToken = localStorage.getItem('token');
    if (!existingToken) {
      setInitializing(false);
      return;
    }

    let cancelled = false;

    authService
      .getMe()
      .then((response) => {
        if (cancelled) return;
        const { role, user: staffUser, patient } = response.data;
        const restoredUser =
          role === 'patient'
            ? { _id: patient._id, phone: patient.phone, name: patient.name, role: 'patient' }
            : staffUser;

        setUser(restoredUser);
        setToken(existingToken);
        localStorage.setItem('user', JSON.stringify(restoredUser));
      })
      .catch(() => {
        if (cancelled) return;
        // Token is genuinely invalid/expired, or the account was deactivated/removed.
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      })
      .finally(() => {
        if (!cancelled) setInitializing(false);
      });

    return () => {
      cancelled = true;
    };
    // Intentionally runs once on mount only - login()/logout() manage state afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated, login, logout, loading, setLoading, initializing }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
