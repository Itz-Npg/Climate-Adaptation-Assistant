import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/client';
import { events } from '../lib/tracking';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    authApi
      .me()
      .then(({ data }) => {
        if (active) setUser(data.user);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (payload) => {
    const { data } = await authApi.login(payload);
    // A second factor is required before a session exists.
    if (data.mfaRequired) return data;
    setUser(data.user);
    events.login({ method: 'password' });
    return data.user;
  }, []);

  const verifyMfa = useCallback(async (payload) => {
    const { data } = await authApi.verifyMfa(payload);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await authApi.register(payload);
    setUser(data.user);
    events.signup({ method: 'email' });
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, verifyMfa, register, logout, setUser }),
    [user, loading, login, verifyMfa, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
