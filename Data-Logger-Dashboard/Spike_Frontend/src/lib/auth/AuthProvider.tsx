import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "@/lib/api/endpoints";
import { tokenStore } from "./tokenStore";
import type { Role, User } from "@/lib/api/types";
import { BootSkeleton } from "@/components/loading/PageSkeleton";

export interface AuthContextValue {
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEngineer: boolean;
  isManager: boolean;
  isViewer: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => tokenStore.getUser());
  const [hydrating, setHydrating] = useState<boolean>(
    () =>
      !!tokenStore.getUser() &&
      !!tokenStore.getRefreshToken() &&
      !tokenStore.getAccessToken(),
  );
  const [showBoot, setShowBoot] = useState(false);

  useEffect(() => tokenStore.subscribe(() => setUser(tokenStore.getUser())), []);

  useEffect(() => {
    function onExpired() {
      tokenStore.clear();
    }
    window.addEventListener("voltra:session-expired", onExpired);
    return () => window.removeEventListener("voltra:session-expired", onExpired);
  }, []);

  // If we have a refresh token but no access token in memory (fresh page load),
  // ask /auth/me — the api client will silently refresh the access token first
  // on the resulting 401.
  useEffect(() => {
    let cancelled = false;
    if (tokenStore.getUser() && tokenStore.getRefreshToken() && !tokenStore.getAccessToken()) {
      (async () => {
        try {
          // trigger a refresh via a lightweight authed call
          const res = await authApi.me().catch(() => null);
          if (!cancelled && res?.user) tokenStore.setUser(res.user);
        } catch {
          if (!cancelled) tokenStore.clear();
        } finally {
          if (!cancelled) setHydrating(false);
        }
      })();
    } else {
      setHydrating(false);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Only reveal the boot skeleton if hydration is genuinely slow.
  // Fast connections finish before this timer fires — no forced skeleton.
  useEffect(() => {
    if (!hydrating) return;
    const id = window.setTimeout(() => setShowBoot(true), 600);
    return () => window.clearTimeout(id);
  }, [hydrating]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    tokenStore.setAccessToken(res.accessToken);
    tokenStore.setRefreshToken(res.refreshToken);
    tokenStore.setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    await authApi.register({ name, email, password });
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = tokenStore.getRefreshToken();
    if (refreshToken) {
      await authApi.logout({ refreshToken }).catch(() => undefined);
    }
    tokenStore.clear();
  }, []);

  const refresh = useCallback(async () => {
    const res = await authApi.me();
    tokenStore.setUser(res.user);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const role = user?.role ?? null;
    return {
      user,
      role,
      isAuthenticated: !!user,
      isAdmin: role === "admin",
      isEngineer: role === "engineer",
      isManager: role === "admin" || role === "engineer",
      isViewer: role === "viewer",
      login,
      register,
      logout,
      refresh,
    };
  }, [user, login, register, logout, refresh]);

  return (
    <AuthContext.Provider value={value}>
      {hydrating && showBoot ? <BootSkeleton /> : children}
    </AuthContext.Provider>
  );
}