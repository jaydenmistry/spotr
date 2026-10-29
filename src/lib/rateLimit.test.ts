import { describe, expect, it } from "vitest";
import { clientIp, rateLimit } from "./rateLimit";

describe("clientIp", () => {
  it("uses the rightmost X-Forwarded-For hop (the one our proxy appended)", () => {
    const headers = new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 203.0.113.7" });
    expect(clientIp(headers)).toBe("203.0.113.7");
  });

  it("can't be spoofed by prepending fake hops", () => {
    const spoofed = new Headers({ "x-forwarded-for": "9.9.9.9, 203.0.113.7" });
    const honest = new Headers({ "x-forwarded-for": "203.0.113.7" });
    expect(clientIp(spoofed)).toBe(clientIp(honest));
  });

  it("falls back to X-Real-IP, then unknown", () => {
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientIp({})).toBe("unknown");
  });

  it("reads plain header objects (NextAuth authorize)", () => {
    expect(clientIp({ "x-forwarded-for": ["10.0.0.1, 10.0.0.2"] })).toBe("10.0.0.2");
  });
});

describe("rateLimit", () => {
  it("allows up to the limit within a window", () => {
    const key = `test-${Math.random()}`;
    expect([1, 2, 3].map(() => rateLimit(key, 2, 60_000))).toEqual([true, true, false]);
  });
});
