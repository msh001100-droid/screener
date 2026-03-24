const globalCache = globalThis.__centroCache || new Map();
if (!globalThis.__centroCache) {
  globalThis.__centroCache = globalCache;
}

export function getCache(key, ttlMs) {
  const item = globalCache.get(key);
  if (!item) return null;
  if (Date.now() - item.time > ttlMs) {
    globalCache.delete(key);
    return null;
  }
  return item.value;
}

export function setCache(key, value) {
  globalCache.set(key, { time: Date.now(), value });
  return value;
}
