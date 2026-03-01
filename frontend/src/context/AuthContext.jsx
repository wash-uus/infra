/**
 * AuthContext — holds JWT tokens and decodes the user's role.
 * Provides: token, user { id, email, role }, isAuthenticated, login, logout.
 */
import { createContext, useCallback, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

/** Decode JWT payload without verification (client-side only). */
function decodeToken(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function isExpired(payload) {
  if (!payload?.exp) return true;
  return payload.exp * 1000 <= Date.now();
}

function getValidSession() {
  const access = localStorage.getItem("access_token");
  if (!access) return { token: null, user: null };
  const payload = decodeToken(access);
  if (!payload || isExpired(payload)) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    return { token: null, user: null };
  }
  return { token: access, user: payload };
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getValidSession().token);
  const [user, setUser] = useState(() => getValidSession().user);

  const login = useCallback((access, refresh) => {
    const payload = decodeToken(access);
    if (!payload || isExpired(payload)) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setToken(null);
      setUser(null);
      return;
    }
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
    setToken(access);
    setUser(payload);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,                          // { user_id, email, role, ... }
      role: user?.role ?? null,
      isAuthenticated: !!token && !!user,
      login,
      logout,
    }),
    [token, user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

