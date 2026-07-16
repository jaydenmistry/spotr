import { describe, expect, it } from "vitest";
import { isSafeHttpUrl } from "./url";

describe("isSafeHttpUrl", () => {
  it("accepts absolute http and https URLs", () => {
    expect(isSafeHttpUrl("https://example.com/listing/123")).toBe(true);
    expect(isSafeHttpUrl("http://dealer.example.com")).toBe(true);
  });

  it("rejects null, empty, and placeholder values", () => {
    expect(isSafeHttpUrl(null)).toBe(false);
    expect(isSafeHttpUrl(undefined)).toBe(false);
    expect(isSafeHttpUrl("")).toBe(false);
    expect(isSafeHttpUrl("#")).toBe(false);
  });

  it("rejects non-http schemes and relative paths", () => {
    expect(isSafeHttpUrl(["javascript", "alert(1)"].join(":"))).toBe(false);
    expect(isSafeHttpUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeHttpUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeHttpUrl("/relative/path")).toBe(false);
  });
});
