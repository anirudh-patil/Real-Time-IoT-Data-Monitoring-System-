import { useQuery, type QueryKey, type UseQueryOptions } from "@tanstack/react-query";
import { useEffect, useState } from "react";

// Namespaced localStorage cache so we can serve last-known data instantly
// on the very first render, then let TanStack Query refetch in the
// background (stale-while-revalidate).
const NS = "voltra:swr:";

interface Envelope<T> {
  data: T;
  savedAt: number;
}

function readCache<T>(key: string): Envelope<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(NS + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Envelope<T>;
    if (!parsed || typeof parsed.savedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      NS + key,
      JSON.stringify({ data, savedAt: Date.now() } satisfies Envelope<T>),
    );
  } catch {
    // Quota exceeded / disabled storage — ignore, memory cache still works.
  }
}

/**
 * Stale-while-revalidate query backed by localStorage.
 *
 * - Serves cached data instantly on first mount (no skeleton, no flash).
 * - Marks the entry stale so TanStack Query refetches in the background.
 * - Persists the fresh response so the next visit is instant too.
 *
 * Expose `isRevalidating` for a subtle UI signal while background fetches
 * are in flight (isFetching && !isLoading).
 */
export function usePersistedQuery<T>(
  cacheKey: string,
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn" | "initialData">,
) {
  const [seed] = useState(() => readCache<T>(cacheKey));

  const query = useQuery<T>({
    queryKey,
    queryFn,
    // Serve cached data instantly on first render.
    initialData: seed ? (seed.data as T) : undefined,
    initialDataUpdatedAt: seed?.savedAt,
    // SWR: always consider seeded data stale so we refetch on mount.
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    ...options,
  });

  // Persist fresh responses so the next visit is instant.
  useEffect(() => {
    if (query.data !== undefined && query.isSuccess && !query.isFetching) {
      writeCache(cacheKey, query.data);
    }
  }, [cacheKey, query.data, query.isSuccess, query.isFetching]);

  return {
    ...query,
    isRevalidating: query.isFetching && !query.isLoading,
    fromCache: seed !== null && query.isLoading === false && query.isFetching,
    cachedAt: seed?.savedAt ?? null,
  };
}