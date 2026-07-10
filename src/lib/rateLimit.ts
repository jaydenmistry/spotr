// Simple in-memory sliding-window rate limiter.
// Per-instance only, which is fine for a single-container deployment;
// swap for a Redis-backed limiter if the app ever runs multiple replicas.

type Window = { count: number; resetAt: number };

const buckets = new Map<string, Window>();

const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, window] of buckets) {
    if (window.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  cleanup(now);

  const window = buckets.get(key);
  if (!window || window.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  window.count += 1;
  return window.count <= limit;
}

export function clientIp(headers: Headers | Record<string, string | string[] | undefined>): string {
  const get = (name: string): string | undefined => {
    if (headers instanceof Headers) return headers.get(name) ?? undefined;
    const value = headers[name];
    return Array.isArray(value) ? value[0] : value;
  };

  const forwarded = get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return get("x-real-ip") ?? "unknown";
}
