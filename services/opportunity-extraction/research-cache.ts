const CACHE_TTL_MS = 30 * 60 * 1_000;
type CacheEntry = { value: unknown; expiresAt: number };
const globalForResearch = globalThis as typeof globalThis & { opportunityResearchCache?: Map<string, CacheEntry> };
const cache = globalForResearch.opportunityResearchCache ?? new Map<string, CacheEntry>();
globalForResearch.opportunityResearchCache = cache;

export async function withOpportunityResearchCache<T>(key: string, run: () => Promise<T>, now = Date.now()): Promise<{ value: T; cacheHit: boolean }> {
  const existing = cache.get(key);
  if (existing && existing.expiresAt > now) return { value: existing.value as T, cacheHit: true };
  const value = await run();
  cache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
  return { value, cacheHit: false };
}

export function clearOpportunityResearchCache() { cache.clear(); }
