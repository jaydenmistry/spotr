import Link from "next/link";
import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main style={{ position: "relative", overflowX: "clip", minHeight: "78vh", display: "grid", placeItems: "center", padding: "140px 20px 80px", textAlign: "center" }}>
        <div aria-hidden="true" className="lp-hero-glow" style={{ opacity: 0.7 }} />
        <div style={{ position: "relative" }}>
          <p className="lp-fact-value tabular" style={{ fontSize: "clamp(5rem, 16vw, 9rem)" }}>404</p>
          <h1 className="lp-h2" style={{ margin: "8px auto 12px" }}>This one got away.</h1>
          <p className="lp-lede" style={{ marginTop: 0 }}>The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 28 }}>
            <Link href="/" className="btn btn-lg btn-primary pressable">Back to home</Link>
            <Link href="/dashboard" className="btn btn-lg btn-secondary pressable">Open dashboard</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
