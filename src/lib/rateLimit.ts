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

  // The leftmost X-Forwarded-For entries are whatever the client sent, so they
  // can't be trusted for rate limiting. Our single reverse proxy (Traefik via
  // Dokploy) appends the address it actually saw, which makes the rightmost
  // entry the real client. Revisit if another proxy/CDN is added in front.
  const forwarded = get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((hop) => hop.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }
  return get("x-real-ip") ?? "unknown";
}
