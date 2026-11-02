import { describe, expect, it } from "vitest";
import { safePhotoUrl, isSafeHttpUrl } from "./url";

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

describe("safePhotoUrl", () => {
  it("keeps https and upgrades http", () => {
    expect(safePhotoUrl("https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
    expect(safePhotoUrl("http://cdn.example.com/a.jpg?w=640")).toBe("https://cdn.example.com/a.jpg?w=640");
  });

  it("keeps inline data:image fixtures", () => {
    expect(safePhotoUrl("data:image/svg+xml,<svg/>")).toBe("data:image/svg+xml,<svg/>");
  });

  it("drops missing, non-image, credentialed, and unupgradeable values", () => {
    expect(safePhotoUrl(null)).toBeNull();
    expect(safePhotoUrl("")).toBeNull();
    expect(safePhotoUrl("data:text/html,<p>hi</p>")).toBeNull();
    expect(safePhotoUrl("/relative.jpg")).toBeNull();
    expect(safePhotoUrl("https://user:pass@cdn.example.com/a.jpg")).toBeNull();
    expect(safePhotoUrl("http://cdn.example.com:8080/a.jpg")).toBeNull();
  });
});
