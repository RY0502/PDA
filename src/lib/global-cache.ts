const GLOBAL_SYMBOL = '__PDA_GLOBAL_CACHE__';

type CacheEntry = {
  value: string;
  expiresAt: number;
};

export type CacheKV = {
  key: string;
  value: string;
  expiresAt: number;
};

function getStore(): Map<string, CacheEntry> {
  const g = globalThis as any;
  if (!g[GLOBAL_SYMBOL]) {
    g[GLOBAL_SYMBOL] = new Map<string, CacheEntry>();
  }
  return g[GLOBAL_SYMBOL] as Map<string, CacheEntry>;
}

function now(): number {
  return Date.now();
}

function ttlMs(): number {
  return 24 * 60 * 60 * 1000;
}

function cleanupExpired(store: Map<string, CacheEntry>): void {
  const t = now();
  for (const [k, v] of store.entries()) {
    if (!v || v.expiresAt <= t) {
      store.delete(k);
    }
  }
}

export function registerKey(key: string): void {
  const store = getStore();
  cleanupExpired(store);
  const expiresAt = now() + ttlMs();
  const existing = store.get(key);
  if (existing) {
    store.set(key, { value: existing.value || '', expiresAt });
  } else {
    store.set(key, { value: '', expiresAt });
  }
}

export function setValue(key: string, value: string): void {
  const store = getStore();
  cleanupExpired(store);
  const expiresAt = now() + ttlMs();
  store.set(key, { value, expiresAt });
}

export function getValue(key: string): string | null {
  const store = getStore();
  cleanupExpired(store);
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now()) {
    store.delete(key);
    return null;
  }
  const v = entry.value;
  if (!v) return null;
  if (typeof v !== 'string') return null;
  if (v.trim().length === 0) return null;
  return v;
}

export function getKeys(): string[] {
  const store = getStore();
  cleanupExpired(store);
  const out: string[] = [];
  for (const [k] of store.entries()) {
    out.push(k);
  }
  return out;
}

export function getEntries(): CacheKV[] {
  const store = getStore();
  cleanupExpired(store);
  const res: CacheKV[] = [];
  for (const [k, v] of store.entries()) {
    res.push({ key: k, value: v?.value ?? '', expiresAt: v?.expiresAt ?? 0 });
  }
  return res;
}

export function clearAll(): void {
  const store = getStore();
  store.clear();
}

export function clearValuesOnly(): void {
  const store = getStore();
  cleanupExpired(store);
  for (const [k, v] of store.entries()) {
    if (!v) continue;
    store.set(k, { value: '', expiresAt: v.expiresAt });
  }
}
