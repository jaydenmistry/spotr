import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { RequestAccessForm } from "./RequestAccessForm";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Request access",
  description: "Tell us about your buying desk and we'll set up a Spotr workspace for your team.",
};

const NEXT_STEPS = [
  { title: "We review your request", copy: "Usually within one business day." },
  { title: "We set up your workspace", copy: "Your buy box, market radius, and licensed listing feed." },
  { title: "We walk your desk through it", copy: "A short session on the feed, the dossier, and the pipeline." },
];

export default function RequestAccessPage() {
  return (
    <>
      <SiteNav />
      <main style={{ position: "relative", overflowX: "clip", background: "var(--bg-base)" }}>
        <div aria-hidden="true" className="lp-hero-glow" />
        <div className="access-layout">
          <div>
            <p className="t-eyebrow lp-eyebrow">Request access</p>
            <h1 className="lp-h2" style={{ marginBottom: 16 }}>Bring Spotr to your buying desk.</h1>
            <p className="lp-lede" style={{ margin: 0, textAlign: "left" }}>
              Tell us a little about your dealership. We&apos;ll set up a workspace for your team and show you around.
            </p>
            <ol style={{ listStyle: "none", marginTop: 36, display: "flex", flexDirection: "column", gap: 18 }}>
              {NEXT_STEPS.map((step, index) => (
                <li key={step.title} style={{ display: "flex", gap: 14 }}>
                  <span
                    aria-hidden="true"
                    className="tabular"
                    style={{ width: 30, height: 30, borderRadius: 999, flexShrink: 0, display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, color: "var(--tint-text)", background: "rgba(var(--tint-rgb), 0.12)" }}
                  >
                    {index + 1}
                  </span>
                  <span>
                    <span className="t-headline" style={{ display: "block", color: "var(--label)" }}>{step.title}</span>
                    <span style={{ fontSize: 14, color: "var(--label-secondary)" }}>{step.copy}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p style={{ marginTop: 32, fontSize: 14, color: "var(--label-secondary)" }}>
              Questions first? Email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--tint-text)", fontWeight: 600, textDecoration: "none" }}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </div>
          <RequestAccessForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
