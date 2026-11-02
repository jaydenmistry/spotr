import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./SiteFooter";

/** Shared shell for long-form public pages (privacy, terms, data sources). */
export function LegalPage({
  eyebrow,
  title,
  updated,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  updated?: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteNav />
      <main style={{ position: "relative", overflowX: "clip", background: "var(--bg-base)" }}>
        <div aria-hidden="true" className="lp-hero-glow" style={{ height: 600, opacity: 0.6 }} />
        <article className="prose-page">
          <header style={{ marginBottom: 40 }}>
            <p className="t-eyebrow lp-eyebrow">{eyebrow}</p>
            <h1 className="lp-h2">{title}</h1>
            {updated && (
              <p className="t-footnote" style={{ marginTop: 14, color: "var(--label-secondary)" }}>
                Last updated {updated}
              </p>
            )}
            {intro && <p className="prose-intro">{intro}</p>}
          </header>
          <div className="prose">{children}</div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
