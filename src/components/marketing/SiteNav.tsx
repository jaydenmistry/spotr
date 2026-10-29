"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { SpotrLogo } from "@/components/ui/SpotrLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { spring } from "@/lib/motion";

// Root-relative so the links work from every marketing page, not just "/".
export const NAV_LINKS = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Product", href: "/#product" },
  { label: "FAQ", href: "/#faq" },
];

/** Marketing-site navigation: a full-width bar that tucks into a floating pill on scroll. */
export function SiteNav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  return (
    <header className="lp-nav-wrap">
      <motion.nav
        aria-label="Primary"
        className="material lp-nav"
        animate={{
          maxWidth: scrolled ? 920 : 1200,
          marginTop: scrolled ? 10 : 0,
          borderRadius: scrolled ? 999 : 0,
        }}
        transition={spring.smooth}
        style={{ borderBottom: scrolled ? "none" : "1px solid var(--separator)", boxShadow: scrolled ? "var(--shadow-md)" : "none" }}
      >
        <Link href="/" aria-label="Spotr home" className="pressable" style={{ textDecoration: "none" }}>
          <SpotrLogo size={30} />
        </Link>
        <div className="hide-compact" style={{ display: "flex", gap: 4 }}>
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="pressable hover-fill hover-label" style={{ padding: "7px 12px", borderRadius: 999, fontSize: 14, fontWeight: 500, color: "var(--label-secondary)", textDecoration: "none" }}>
              {link.label}
            </Link>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 64 }}>
            <ThemeToggle label={false} />
          </div>
          <Link href="/login" className="btn btn-sm btn-plain pressable hide-compact">Sign in</Link>
          <Link href="/request-access" className="btn btn-sm btn-primary pressable">
            Request access
          </Link>
        </div>
      </motion.nav>
    </header>
  );
}

