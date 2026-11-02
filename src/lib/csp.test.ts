import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { THEME_INIT_SCRIPT_HASH, createNonce, nonceContentSecurityPolicy } from "./csp";

function directives(policy: string) {
  return new Map(policy.split(";").map((part) => {
    const [name, ...values] = part.trim().split(/\s+/);
    return [name, values.join(" ")] as const;
  }));
}

// next.config.ts can't import src/lib/csp.ts, so this keeps the two in step.
async function staticPolicy() {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_ANALYTICS_SRC", "https://stats.example.com/script.js");
  vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://key@o1.ingest.sentry.io/2");
  const { default: config } = await import("../../next.config");
  const rules = await config.headers!();
  const rule = rules.find((r) => r.headers.some((h) => h.key === "Content-Security-Policy"))!;
  return { source: rule.source, policy: rule.headers.find((h) => h.key === "Content-Security-Policy")!.value };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("content security policy", () => {
  it("allows the theme script by its exact hash", () => {
    const hash = createHash("sha256").update(THEME_INIT_SCRIPT).digest("base64");
    expect(THEME_INIT_SCRIPT_HASH).toBe(`'sha256-${hash}'`);
  });

  it("puts a fresh nonce and the theme hash in script-src, without unsafe-inline", () => {
    const nonce = createNonce();
    expect(nonce).not.toBe(createNonce());
    const scriptSrc = directives(nonceContentSecurityPolicy(nonce)).get("script-src");
    expect(scriptSrc).toContain(`'nonce-${nonce}'`);
    expect(scriptSrc).toContain(THEME_INIT_SCRIPT_HASH);
    expect(scriptSrc).not.toContain("unsafe-inline");
  });

  it("matches the static marketing policy in every directive but script-src", async () => {
    const { policy } = await staticPolicy();
    const strict = directives(nonceContentSecurityPolicy("abc"));
    const loose = directives(policy);
    expect([...strict.keys()].sort()).toEqual([...loose.keys()].sort());
    for (const [name, value] of strict) {
      if (name !== "script-src") expect(loose.get(name), name).toBe(value);
    }
    expect(strict.get("connect-src")).toContain("https://o1.ingest.sentry.io");
    expect(strict.get("script-src")).toContain("https://stats.example.com");
  });

  it("leaves exactly the proxy's routes out of the static policy", async () => {
    const { source } = await staticPolicy();
    const pattern = new RegExp(`^${source}$`);
    for (const path of ["/", "/privacy", "/request-access", "/loginx", "/dashboards", "/api/health"]) {
      expect(pattern.test(path), path).toBe(true);
    }
    for (const path of ["/login", "/login/x", "/dashboard", "/dashboard/feed"]) {
      expect(pattern.test(path), path).toBe(false);
    }
  });
});
