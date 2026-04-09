/**
 * Request deduplication and caching utility
 * Prevents duplicate concurrent requests and caches results
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestCache {
  private cache = new Map<string, CacheEntry<any>>();
  private pending = new Map<string, PendingRequest<any>>();

  /**
   * Execute a request with deduplication and optional caching
   */
  async execute<T>(
    key: string,
    fn: () => Promise<T>,
    options?: {
      ttl?: number; // Time to live in milliseconds (0 = no cache)
      dedupWindow?: number; // Deduplication window in milliseconds
    }
  ): Promise<T> {
    const { ttl = 0, dedupWindow = 100 } = options ?? {};

    // Check cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    // Check if request is already pending (deduplication)
    const pending = this.pending.get(key);
    if (pending && Date.now() - pending.timestamp < dedupWindow) {
      return pending.promise;
    }

    // Execute new request
    const promise = fn();
    this.pending.set(key, { promise, timestamp: Date.now() });

    try {
      const data = await promise;

      // Cache result if TTL is set
      if (ttl > 0) {
        this.cache.set(key, { data, timestamp: Date.now(), ttl });
      }

      return data;
    } finally {
      this.pending.delete(key);
    }
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: RegExp | string): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.pending.clear();
  }

  /**
   * Get cache stats for debugging
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pending.size,
    };
  }
}

export const requestCache = new RequestCache();

/**
 * Hook for using request cache in components
 */
import { useCallback } from 'react';

export function useCachedRequest<T>(
  key: string,
  fn: () => Promise<T>,
  options?: {
    ttl?: number;
    dedupWindow?: number;
  }
) {
  return useCallback(() => requestCache.execute(key, fn, options), [key, fn, options]);
}
