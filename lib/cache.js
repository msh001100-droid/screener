
const g = globalThis;

if (!g.__centroCache) {
  g.__centroCache = new Map();
}

export function getCache(key, ttlMs = 0) {
  const item = g.__centroCache.get(key);
  if (!item) return null;
  if (ttlMs > 0 && Date.now() - item.time > ttlMs) {
    g.__centroCache.delete(key);
    return null;
  }
  return item.value;
}

export function setCache(key, value) {
  g.__centroCache.set(key, { time: Date.now(), value });
  return value;
}
