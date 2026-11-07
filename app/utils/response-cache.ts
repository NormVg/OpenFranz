interface CacheEntry {
  expiresAt: number;
  value: Promise<unknown>;
}

const entries = new Map<string, CacheEntry>();

function cacheEnabled(): boolean {
  return typeof window !== "undefined";
}

/**
 * Returns a cached promise for `key` until `ttlMs` elapses. Concurrent callers
 * share the in-flight request, so a burst of components mounting at once still
 * produces one network call.
 */
export function cachedResponse<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  if (!cacheEnabled()) return loader();

  const hit = entries.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as Promise<T>;

  const pending = loader().then(
    (value) => {
      entries.set(key, {
        value: Promise.resolve(value),
        expiresAt: Date.now() + ttlMs,
      });
      return value;
    },
    (error: unknown) => {
      entries.delete(key);
      throw error;
    },
  );

  entries.set(key, { value: pending, expiresAt: Number.POSITIVE_INFINITY });
  return pending;
}

export function invalidateResponseCache(prefix?: string): void {
  if (!prefix) {
    entries.clear();
    return;
  }

  for (const key of entries.keys()) {
    if (key.startsWith(prefix)) entries.delete(key);
  }
}
