import type { User } from "../api/types";

const REFRESH_KEY = "voltra.refreshToken";
const USER_KEY = "voltra.user";

type Listener = () => void;
const listeners = new Set<Listener>();

let accessToken: string | null = null;
let user: User | null = null;

function readLocal<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: unknown | null) {
  if (typeof window === "undefined") return;
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / disabled */
  }
}

let hydrated = false;
function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  user = readLocal<User>(USER_KEY);
}

export const tokenStore = {
  getAccessToken() {
    return accessToken;
  },
  setAccessToken(token: string | null) {
    accessToken = token;
  },
  getRefreshToken(): string | null {
    return readLocal<string>(REFRESH_KEY);
  },
  setRefreshToken(token: string | null) {
    writeLocal(REFRESH_KEY, token);
  },
  getUser(): User | null {
    ensureHydrated();
    return user;
  },
  setUser(next: User | null) {
    user = next;
    writeLocal(USER_KEY, next);
    listeners.forEach((l) => l());
  },
  isAuthenticated(): boolean {
    ensureHydrated();
    return !!user && !!readLocal<string>(REFRESH_KEY);
  },
  clear() {
    accessToken = null;
    user = null;
    writeLocal(REFRESH_KEY, null);
    writeLocal(USER_KEY, null);
    listeners.forEach((l) => l());
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};