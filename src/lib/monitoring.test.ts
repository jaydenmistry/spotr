import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { SENTRY_OPTIONS, scrubEvent } from "./monitoring";

describe("SENTRY_OPTIONS", () => {
  it("turns every data-collection channel off and disables tracing", () => {
    const dc = SENTRY_OPTIONS.dataCollection;
    expect(dc.userInfo).toBe(false);
    expect(dc.cookies).toBe(false);
    expect(dc.httpHeaders).toBe(false);
    expect(dc.httpBodies).toEqual([]);
    expect(dc.urlQueryParams).toBe(false);
    expect(dc.databaseQueryData).toBe(false);
    expect(dc.stackFrameVariables).toBe(false);
    expect(dc.genAI).toEqual({ inputs: false, outputs: false });
    expect(SENTRY_OPTIONS.tracesSampleRate).toBe(0);
    expect(SENTRY_OPTIONS.beforeSend).toBe(scrubEvent);
  });
});

describe("scrubEvent", () => {
  it("drops request, user, and extra context", () => {
    const event = scrubEvent({
      type: undefined,
      request: { url: "https://spotrcars.com/dashboard?q=porsche", cookies: { session: "x" } },
      user: { ip_address: "203.0.113.7", email: "a@b.com" },
      extra: { lead: { sellerName: "Jane" } },
    } as ErrorEvent);
    expect(event.request).toBeUndefined();
    expect(event.user).toBeUndefined();
    expect(event.extra).toBeUndefined();
  });

  it("redacts emails and VINs from messages and exceptions", () => {
    const event = scrubEvent({
      type: undefined,
      message: "Failed for dana@northside.com",
      exception: { values: [{ type: "Error", value: "Unique constraint failed on vin WP0AB2A99MS220001 and SPOTR-FEED-0004" }] },
      breadcrumbs: [{ message: "POST by sam@ortiz.example", data: { body: "secret" } }],
    } as ErrorEvent);
    expect(event.message).toBe("Failed for [email]");
    expect(event.exception?.values?.[0].value).toBe("Unique constraint failed on vin [vin] and [vin]");
    expect(event.breadcrumbs?.[0]).toEqual({ message: "POST by [email]" });
  });
});
