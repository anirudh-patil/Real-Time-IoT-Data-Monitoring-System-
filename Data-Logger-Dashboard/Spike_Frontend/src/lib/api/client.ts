import { env } from "@/env";
import { tokenStore } from "@/lib/auth/tokenStore";
import { ApiError } from "./errors";
import type { Envelope } from "./types";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  skipAuth?: boolean;
  isFormData?: boolean;
};

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const base = env.API_BASE_URL.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${p}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

let refreshPromise: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) return false;
  refreshPromise = (async () => {
    try {
      const res = await fetch(buildUrl("/auth/refresh-token"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      const envelope = (await res.json().catch(() => null)) as Envelope<{
        user: import("./types").User;
        accessToken: string;
        refreshToken: string;
      }> | null;
      if (!res.ok || !envelope?.success || !envelope.data) {
        tokenStore.clear();
        return false;
      }
      tokenStore.setAccessToken(envelope.data.accessToken);
      tokenStore.setRefreshToken(envelope.data.refreshToken);
      tokenStore.setUser(envelope.data.user);
      return true;
    } catch {
      tokenStore.clear();
      return false;
    } finally {
      // reset after microtask so concurrent callers share result
      queueMicrotask(() => {
        refreshPromise = null;
      });
    }
  })();
  return refreshPromise;
}

async function doFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, skipAuth, isFormData, headers, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    accept: "application/json",
    ...(isFormData ? {} : { "content-type": "application/json" }),
    ...(headers as Record<string, string> | undefined),
  };
  if (!skipAuth) {
    const token = tokenStore.getAccessToken();
    if (token) finalHeaders["authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(buildUrl(path, query), {
    ...rest,
    headers: finalHeaders,
    body: isFormData
      ? (body as BodyInit)
      : body !== undefined
        ? JSON.stringify(body)
        : undefined,
  });
  let envelope: Envelope<T> | null = null;
  try {
    envelope = (await res.json()) as Envelope<T>;
  } catch {
    // fall through — treat as error below
  }
  if (!res.ok || !envelope?.success) {
    throw new ApiError({
      message: envelope?.message ?? `Request failed (${res.status})`,
      status: res.status,
      errorCode: envelope?.errorCode,
      requestId: envelope?.requestId,
    });
  }
  return envelope.data as T;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await doFetch<T>(path, options);
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.isUnauthorized &&
      !options.skipAuth &&
      err.isTokenExpired
    ) {
      const refreshed = await attemptRefresh();
      if (refreshed) return doFetch<T>(path, options);
      // hard sign-out signal for the auth layer to observe
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("voltra:session-expired"));
      }
    }
    throw err;
  }
}

export const apiClient = {
  get: <T>(path: string, opts?: RequestOptions) =>
    apiRequest<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiRequest<T>(path, { ...opts, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiRequest<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    apiRequest<T>(path, { ...opts, method: "DELETE" }),
};