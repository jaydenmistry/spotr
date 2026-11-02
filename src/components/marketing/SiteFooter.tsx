import Link from "next/link";
import { SpotrLogo } from "@/components/ui/SpotrLogo";
import { CONTACT_EMAIL } from "@/lib/site";

const FOOTER_GROUPS = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "Features", href: "/#product" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Request access", href: "/request-access" },
      { label: "Data sources", href: "/data-sources" },
      { label: "Contact", href: `mailto:${CONTACT_EMAIL}` },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Sign in", href: "/login" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer style={{ borderTop: "1px solid var(--separator)", padding: "48px 20px 40px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="site-footer-grid">
          <div>
            <SpotrLogo size={28} />
            <p style={{ marginTop: 14, maxWidth: 300, fontSize: 14, lineHeight: 1.5, color: "var(--label-secondary)" }}>
              Acquisition intelligence for dealer buying desks.
            </p>
          </div>
          {FOOTER_GROUPS.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <p className="t-eyebrow" style={{ color: "var(--label-secondary)", marginBottom: 12 }}>{group.title}</p>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="hover-label" style={{ display: "inline-block", padding: "4px 0", fontSize: 14, color: "var(--label-secondary)", textDecoration: "none" }}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid var(--separator)", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, fontSize: 12, color: "var(--label-secondary)" }}>
          <p>© {new Date().getFullYear()} Spotr. All rights reserved.</p>
          <p>Scores, estimated values, and max offers are Spotr heuristic estimates, not appraisals or market quotes.</p>
        </div>
      </div>
    </footer>
  );
}
