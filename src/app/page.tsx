"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import {
  ArrowRight,
  CalendarClock,
  ChevronDown,
  Crosshair,
  Database,
  FileText,
  Gauge,
  LayoutGrid,
  Radar,
  Scale,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { SpotrLogo } from "@/components/ui/SpotrLogo";
import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { spring } from "@/lib/motion";

/* ─── Content ────────────────────────────────────────────────────
   Marketing copy describes only what the product does today: licensed
   provider data (no scraping or marketplace automation), heuristic scores
   labeled as estimates, and no invented customers or usage numbers. */


const PRINCIPLES: { icon: LucideIcon; title: string; copy: string }[] = [
  {
    icon: Gauge,
    title: "Every score shows its math.",
    copy: "A deterministic heuristic with the full point breakdown, risk deductions, and a confidence level on every card. No black box.",
  },
  {
    icon: Scale,
    title: "Asking is never an estimate.",
    copy: "Listing asking prices, Spotr estimates, and your recorded offers are labeled separately, so nobody mistakes one for another.",
  },
  {
    icon: ShieldCheck,
    title: "Sourced the right way.",
    copy: "Listings come from licensed data providers through official APIs, with the source and freshness shown on each one.",
  },
];

type StepKey = "buybox" | "feed" | "dossier" | "pipeline";

const STEPS: { key: StepKey; icon: LucideIcon; eyebrow: string; title: string; copy: string }[] = [
  {
    key: "buybox",
    icon: Crosshair,
    eyebrow: "Define",
    title: "Tell Spotr what your desk buys.",
    copy: "Set years, mileage, price bands, and make priorities in your buy box. Every opportunity is ranked against it — change it, and the feed re-ranks.",
  },
  {
    key: "feed",
    icon: Radar,
    eyebrow: "Discover",
    title: "A feed ranked by fit, not by noise.",
    copy: "Fresh listings from licensed providers arrive scored and sorted. Watch the promising ones, pass on the rest with a reason, and undo a pass anytime.",
  },
  {
    key: "dossier",
    icon: FileText,
    eyebrow: "Decide",
    title: "The whole case for a car, on one sheet.",
    copy: "Asking price, estimated retail band, a conservative max offer, scenarios, risks, and missing data — each figure tagged with where it came from.",
  },
  {
    key: "pipeline",
    icon: LayoutGrid,
    eyebrow: "Acquire",
    title: "Nothing slips through the cracks.",
    copy: "Drag deals across a six-stage pipeline, schedule the next action, log offers, and see what's overdue the moment you sign in.",
  },
];

const FEATURES: { icon: LucideIcon; title: string; copy: string; span?: boolean; tone: string }[] = [
  {
    icon: Radar,
    title: "Opportunity Feed",
    copy: "Heuristic scoring across buy-box fit, estimated margin, price advantage, data confidence, and freshness — with a breakdown one tap away.",
    span: true,
    tone: "var(--tint)",
  },
  {
    icon: FileText,
    title: "Acquisition dossier",
    copy: "Economics, scenarios, risks, activity history, and follow-ups in a single sheet.",
    tone: "var(--blue)",
  },
  {
    icon: CalendarClock,
    title: "Follow-ups that surface themselves",
    copy: "Next actions with due dates. Overdue and due-soon work rises to the top.",
    tone: "var(--orange)",
  },
  {
    icon: Crosshair,
    title: "Buy box",
    copy: "Your acquisition criteria, applied to every recommendation.",
    tone: "var(--green)",
  },
  {
    icon: Database,
    title: "Provenance on every number",
    copy: "Provider data, Spotr estimates, and assumptions are tagged so nobody confuses one for another. Confidence reflects how complete the listing data is.",
    tone: "var(--purple)",
  },
];

const FACTS: { value: number; suffix?: string; label: string }[] = [
  { value: 6, label: "pipeline stages, from new lead to acquired" },
  { value: 5, label: "scoring factors, each with its points shown" },
  { value: 0, label: "scrapers, logins, or CAPTCHA tricks" },
];

const FAQS = [
  {
    q: "What problem does Spotr solve?",
    a: "Buying desks lose good cars to slow, scattered workflows. Spotr ranks opportunities against what you actually buy, lays out the economics, and keeps follow-ups from going cold — in one place.",
  },
  {
    q: "Where do the listings come from?",
    a: "From licensed vehicle-data providers through their official APIs. Spotr does not scrape marketplaces, automate logins, or work around any site's terms. Each listing shows its source and when Spotr found it.",
  },
  {
    q: "Are the scores and values real appraisals?",
    a: "No, and Spotr labels them that way. Scores, estimated ranges, and max offers come from a transparent, deterministic heuristic. They are planning estimates, labeled as such, never a market quote.",
  },
  {
    q: "Does this replace our CRM?",
    a: "No. Spotr focuses on the acquisition side: finding cars, deciding which are worth pursuing, and moving them through to purchase.",
  },
  {
    q: "How do I get access?",
    a: "Request access with a few details about your dealership. We'll reach out to set up your workspace and walk your desk through the feed, the dossier, and the pipeline.",
  },
];

/* ─── Motion helpers ─────────────────────────────────────────── */

function Reveal({ children, delay = 0, y = 24 }: { children: React.ReactNode; delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ ...spring.smooth, duration: 0.7, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Headline that assembles word by word, each settling out of a soft blur. */
function WordsIn({ text, delay = 0, gradient = false }: { text: string; delay?: number; gradient?: boolean }) {
  const reduceMotion = useReducedMotion();
  return (
    <span style={{ display: "block" }}>
      {text.split(" ").map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          // No opacity fade: the headline is the LCP element, so it paints on the
          // first frame and the motion is carried by blur + rise alone.
          initial={reduceMotion ? false : { y: 28, filter: "blur(10px)" }}
          animate={{ y: 0, filter: "blur(0px)" }}
          transition={{ ...spring.smooth, duration: 0.7, delay: delay + index * 0.05 }}
          style={{ display: "inline-block", marginRight: "0.24em" }}
        >
          <span className={gradient ? "lp-gradient-text" : undefined}>{word}</span>
        </motion.span>
      ))}
    </span>
  );
}

/* ─── Product vignettes (sample data, illustrative) ──────────── */

function SampleTag() {
  return (
    <span className="t-eyebrow" style={{ fontSize: 10, color: "var(--yellow)", background: "rgba(var(--yellow-rgb), 0.14)", borderRadius: 999, padding: "3px 8px" }}>
      Sample data
    </span>
  );
}

function ScoreRing({ score, size = 54 }: { score: number; size?: number }) {
  const color = score >= 65 ? "var(--green)" : score >= 45 ? "var(--yellow)" : "var(--red)";
  return (
    <span style={{ position: "relative", width: size, height: size, display: "grid", placeItems: "center", flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 50 50" aria-hidden="true" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <circle cx="25" cy="25" r="21" fill="none" stroke="rgba(var(--ink-rgb), 0.1)" strokeWidth="4.5" />
        <motion.circle
          cx="25"
          cy="25"
          r="21"
          fill="none"
          stroke={color}
          strokeWidth="4.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: score / 100 }}
          viewport={{ once: true }}
          transition={{ ...spring.smooth, duration: 1.2, delay: 0.2 }}
        />
      </svg>
      <span className="tabular" style={{ fontSize: size * 0.32, fontWeight: 700, color: "var(--label)" }}>{score}</span>
    </span>
  );
}

function MockCard({ title, meta, asking, maxOffer, score, rec }: { title: string; meta: string; asking: string; maxOffer: string; score: number; rec: "BUY" | "INVESTIGATE" | "WATCH" }) {
  const recColor = rec === "BUY" ? "var(--green)" : rec === "INVESTIGATE" ? "var(--yellow)" : "var(--blue)";
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center", padding: 14, borderRadius: "var(--radius-lg)", background: "var(--bg-card)", border: "1px solid var(--separator)", boxShadow: "var(--shadow-sm)" }}>
      <div aria-hidden="true" className="lp-car-thumb" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span className="t-eyebrow" style={{ fontSize: 11, color: recColor, background: `color-mix(in srgb, ${recColor} 14%, transparent)`, borderRadius: 999, padding: "2px 8px" }}>{rec}</span>
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--label)", marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</p>
        <p style={{ fontSize: 12, color: "var(--label-secondary)" }}>{meta}</p>
        <div className="tabular" style={{ display: "flex", flexWrap: "wrap", columnGap: 14, rowGap: 2, marginTop: 6, fontSize: 12 }}>
          <span style={{ color: "var(--label-secondary)" }}>Asking <b style={{ color: "var(--label)" }}>{asking}</b></span>
          <span style={{ color: "var(--label-secondary)" }}>Max offer <b style={{ color: "var(--tint-text)" }}>{maxOffer}</b> <span style={{ fontSize: 11 }}>est.</span></span>
        </div>
      </div>
      <ScoreRing score={score} />
    </div>
  );
}

function HeroProduct() {
  return (
    <div className="lp-window" role="img" aria-label="Illustrative preview of the Opportunity Feed with sample data">
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: "1px solid var(--separator)" }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <span key={c} style={{ width: 11, height: 11, borderRadius: 999, background: c }} />
        ))}
        <span style={{ flex: 1 }} />
        <SampleTag />
      </div>
      <div className="lp-window-body">
        <div className="lp-window-side hide-compact" aria-hidden="true">
          <SpotrLogo size={22} />
          {["Opportunity Feed", "Pipeline", "Inventory", "Buy Box"].map((label, i) => (
            <span key={label} style={{ display: "block", marginTop: i === 0 ? 18 : 4, padding: "7px 10px", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: i === 0 ? 600 : 500, color: i === 0 ? "var(--label)" : "var(--label-secondary)", background: i === 0 ? "rgba(var(--tint-rgb), 0.14)" : "transparent" }}>
              {label}
            </span>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
          <p className="t-title3" style={{ color: "var(--label)", marginBottom: 4 }}>Opportunity Feed</p>
          <MockCard title="2019 Porsche 911 Carrera S" meta="21,800 mi · 12 mi away · found today" asking="$118,500" maxOffer="$112,000" score={91} rec="BUY" />
          <MockCard title="2021 Toyota Tacoma TRD Off-Road" meta="34,100 mi · 28 mi away · found 2 days ago" asking="$38,900" maxOffer="$36,400" score={78} rec="BUY" />
          <MockCard title="2017 BMW M3 Competition" meta="Mileage missing · 41 mi away" asking="$44,500" maxOffer="$39,000" score={56} rec="INVESTIGATE" />
        </div>
      </div>
    </div>
  );
}

function StepVisual({ step }: { step: StepKey }) {
  if (step === "buybox") {
    return (
      <div className="lp-visual" role="img" aria-label="Illustrative buy box with sample criteria">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p className="t-eyebrow" style={{ color: "var(--label-secondary)" }}>Buy box</p>
          <SampleTag />
        </div>
        {[
          ["Years", "2016 – 2023"],
          ["Max mileage", "60,000 mi"],
          ["Acquisition price", "$20k – $150k"],
        ].map(([label, value], i) => (
          <motion.div key={label} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring.smooth, delay: 0.06 * i }} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--separator)", fontSize: 14 }}>
            <span style={{ color: "var(--label-secondary)" }}>{label}</span>
            <span className="tabular" style={{ fontWeight: 600, color: "var(--label)" }}>{value}</span>
          </motion.div>
        ))}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
          {[
            ["Porsche", "Core", "var(--green)"],
            ["Toyota", "Core", "var(--green)"],
            ["BMW", "Opportunistic", "var(--blue)"],
            ["Maserati", "Avoid", "var(--red)"],
          ].map(([make, priority, color], i) => (
            <motion.span key={make} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...spring.bouncy, delay: 0.2 + 0.06 * i }} style={{ fontSize: 13, fontWeight: 600, padding: "6px 12px", borderRadius: 999, color, background: `color-mix(in srgb, ${color} 13%, transparent)` }}>
              {make} · {priority}
            </motion.span>
          ))}
        </div>
      </div>
    );
  }
  if (step === "feed") {
    return (
      <div className="lp-visual" style={{ gap: 10 }} role="img" aria-label="Illustrative ranked feed with sample listings">
        {[
          { title: "2019 Porsche 911 Carrera S", meta: "found today", asking: "$118,500", maxOffer: "$112,000", score: 91, rec: "BUY" as const },
          { title: "2021 Toyota Tacoma TRD", meta: "found 2 days ago", asking: "$38,900", maxOffer: "$36,400", score: 78, rec: "BUY" as const },
          { title: "2020 Audi RS5 Sportback", meta: "found 5 days ago", asking: "$61,200", maxOffer: "$55,900", score: 63, rec: "WATCH" as const },
        ].map((card, i) => (
          <motion.div key={card.title} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.smooth, delay: 0.08 * i }}>
            <MockCard {...card} meta={`${card.meta} · sample`} />
          </motion.div>
        ))}
      </div>
    );
  }
  if (step === "dossier") {
    const rows = [
      ["Asking price", "$118,500", "Provider"],
      ["Est. retail (low end)", "$131,000", "Spotr estimate"],
      ["Reconditioning", "−$2,500", "Assumption"],
      ["Transport / fees", "−$1,500", "Assumption"],
      ["Uncertainty buffer", "−$3,000", "Assumption"],
      ["Target gross", "−$12,000", "Assumption"],
    ];
    return (
      <div className="lp-visual" role="img" aria-label="Illustrative acquisition economics with sample figures">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p className="t-headline" style={{ color: "var(--label)" }}>Acquisition economics</p>
          <SampleTag />
        </div>
        {rows.map(([label, value, source], i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.smooth, delay: 0.07 * i }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: "1px solid var(--separator)", fontSize: 14 }}>
            <span style={{ color: "var(--label-secondary)", flex: 1 }}>{label}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: source === "Provider" ? "var(--blue)" : "var(--purple)", background: source === "Provider" ? "rgba(var(--blue-rgb), 0.12)" : "rgba(var(--purple-rgb), 0.12)", padding: "2px 8px", borderRadius: 999 }}>{source}</span>
            <span className="tabular" style={{ fontWeight: 600, color: "var(--label)", minWidth: 80, textAlign: "right" }}>{value}</span>
          </motion.div>
        ))}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...spring.bouncy, delay: 0.35 }} style={{ marginTop: 16, padding: "14px 16px", borderRadius: "var(--radius-md)", background: "rgba(var(--tint-rgb), 0.1)", boxShadow: "inset 0 0 0 1px rgba(var(--tint-rgb), 0.25)" }}>
          <p className="t-eyebrow" style={{ color: "var(--label-secondary)" }}>Recommended max offer · Spotr estimate</p>
          <p className="t-title1 tabular" style={{ color: "var(--tint-text)", marginTop: 4 }}>$112,000</p>
        </motion.div>
      </div>
    );
  }
  const columns = [
    { stage: "New Leads", color: "var(--blue)", cards: ["2021 Tacoma TRD", "2020 Audi RS5"] },
    { stage: "Contacted", color: "var(--teal)", cards: ["2019 911 Carrera S"] },
    { stage: "Offer Made", color: "var(--orange)", cards: ["2018 Lexus GX 460"] },
  ];
  return (
    <div className="lp-visual" role="img" aria-label="Illustrative pipeline board with sample deals" style={{ gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p className="t-eyebrow" style={{ color: "var(--label-secondary)" }}>Pipeline</p>
        <SampleTag />
      </div>
      <div className="lp-kanban">
      {columns.map((column, ci) => (
        <div key={column.stage} style={{ flex: 1, minWidth: 0, padding: 10, borderRadius: "var(--radius-md)", background: "rgba(var(--ink-rgb), 0.03)", border: "1px solid var(--separator)" }}>
          <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--label)", marginBottom: 10 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: column.color }} />
            {column.stage}
          </p>
          {column.cards.map((card, i) => (
            <motion.div
              key={card}
              initial={{ opacity: 0, y: 16, rotate: ci === 1 ? -3 : 0 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ ...spring.bouncy, delay: 0.1 * ci + 0.05 * i }}
              style={{ padding: "10px 10px", marginBottom: 8, borderRadius: "var(--radius-sm)", background: "var(--bg-card)", border: "1px solid var(--separator)", fontSize: 12, fontWeight: 500, color: "var(--label)", boxShadow: ci === 1 ? "var(--shadow-md)" : "var(--shadow-sm)" }}
            >
              {card}
              {ci === 1 && <span style={{ display: "block", marginTop: 4, fontSize: 11, fontWeight: 600, color: "var(--red)" }}>Follow-up overdue</span>}
            </motion.div>
          ))}
        </div>
      ))}
      </div>
    </div>
  );
}

/* ─── Sections ──────────────────────────────────────────────── */

function Hero() {
  const reduceMotion = useReducedMotion();
  const productRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: productRef, offset: ["start end", "center center"] });
  // The product tilts up to meet you as it scrolls into view.
  const rotateX = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [24, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], reduceMotion ? [1, 1] : [0.88, 1]);
  const glowOpacity = useTransform(scrollYProgress, [0, 1], [0.35, 1]);

  return (
    <section style={{ position: "relative", padding: "150px 20px 40px" }}>
      <div aria-hidden="true" className="lp-hero-glow" />
      <div style={{ position: "relative", maxWidth: 980, margin: "0 auto", textAlign: "center" }}>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.smooth}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, color: "var(--tint-text)", background: "rgba(var(--tint-rgb), 0.12)", boxShadow: "inset 0 0 0 1px rgba(var(--tint-rgb), 0.25)", marginBottom: 26 }}
        >
          <Radar size={14} /> Acquisition intelligence for dealer buying desks
        </motion.p>
        <h1 className="lp-display">
          <WordsIn text="Spot it first." delay={0.05} />
          <WordsIn text="Buy it right." delay={0.2} gradient />
        </h1>
        {/* Paints on the first frame (it's often the LCP element); only rises. */}
        <motion.p
          initial={{ y: 16 }}
          animate={{ y: 0 }}
          transition={{ ...spring.smooth, delay: 0.25 }}
          className="lp-lede"
        >
          Spotr ranks vehicle listings against what your desk actually buys, shows the math behind every number, and keeps each deal moving until it&apos;s on your lot.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.smooth, delay: 0.7 }}
          style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 34 }}
        >
          <Link href="/request-access" className="btn btn-lg btn-primary pressable">
            Request access <ArrowRight size={17} />
          </Link>
          <a href="#how-it-works" className="btn btn-lg btn-secondary pressable">
            See how it works
          </a>
        </motion.div>
      </div>

      <div ref={productRef} style={{ position: "relative", maxWidth: 1100, margin: "80px auto 0", perspective: 1400 }}>
        <motion.div aria-hidden="true" className="lp-product-glow" style={{ opacity: glowOpacity }} />
        <motion.div style={{ rotateX, scale, transformOrigin: "center top" }}>
          <HeroProduct />
        </motion.div>
      </div>
    </section>
  );
}

function Principles() {
  return (
    <section className="lp-section">
      <div className="lp-grid-3">
        {PRINCIPLES.map(({ icon: Icon, title, copy }, i) => (
          <Reveal key={title} delay={i * 0.08}>
            <div className="lp-principle">
              <span style={{ width: 44, height: 44, borderRadius: 14, display: "grid", placeItems: "center", color: "var(--tint-text)", background: "rgba(var(--tint-rgb), 0.12)", marginBottom: 18 }}>
                <Icon size={21} />
              </span>
              <h2 className="t-title3" style={{ color: "var(--label)", marginBottom: 8 }}>{title}</h2>
              <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--label-secondary)" }}>{copy}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/** Scroll-driven story: the copy scrolls, the product stays pinned and changes with it. */
function HowItWorks() {
  const [active, setActive] = useState<StepKey>("buybox");

  return (
    <section id="how-it-works" className="lp-section" style={{ scrollMarginTop: 80 }}>
      <Reveal>
        <p className="t-eyebrow lp-eyebrow">How it works</p>
        <h2 className="lp-h2">From criteria to keys, in four moves.</h2>
      </Reveal>
      <div className="lp-story">
        <div className="lp-story-steps">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = active === step.key;
            return (
              <motion.div
                key={step.key}
                className="lp-story-step"
                onViewportEnter={() => setActive(step.key)}
                // A thin band across the middle of the screen: the step crossing it is the active one.
                viewport={{ margin: "-45% 0px -45% 0px" }}
                animate={{ opacity: isActive ? 1 : 0.55 }}
                transition={spring.smooth}
              >
                <p className="t-eyebrow" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--tint-text)", marginBottom: 12 }}>
                  <Icon size={15} /> {String(index + 1).padStart(2, "0")} · {step.eyebrow}
                </p>
                <h3 className="t-title1" style={{ color: "var(--label)", marginBottom: 12 }}>{step.title}</h3>
                <p style={{ fontSize: 17, lineHeight: 1.55, color: "var(--label-secondary)", maxWidth: 460 }}>{step.copy}</p>
                <div className="show-compact" style={{ marginTop: 24 }}>
                  <StepVisual step={step.key} />
                </div>
              </motion.div>
            );
          })}
        </div>
        <div className="lp-story-stage hide-compact">
          <div className="lp-story-sticky">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 30, scale: 0.96, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -20, scale: 0.98, filter: "blur(6px)" }}
                transition={{ ...spring.smooth, duration: 0.5 }}
              >
                <StepVisual step={active} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="product" className="lp-section" style={{ scrollMarginTop: 80 }}>
      <Reveal>
        <p className="t-eyebrow lp-eyebrow">Product</p>
        <h2 className="lp-h2">Built for the way buyers actually work.</h2>
      </Reveal>
      <div className="lp-bento">
        {FEATURES.map(({ icon: Icon, title, copy, span, tone }, i) => (
          <Reveal key={title} delay={(i % 3) * 0.07}>
            <article className={`lp-tile hover-lift${span ? " lp-tile-wide" : ""}`} style={{ ["--tile-tone" as string]: tone }}>
              <span style={{ width: 42, height: 42, borderRadius: 13, display: "grid", placeItems: "center", color: tone, background: `color-mix(in srgb, ${tone} 13%, transparent)`, marginBottom: 20 }}>
                <Icon size={20} />
              </span>
              <h3 className="t-title3" style={{ color: "var(--label)", marginBottom: 8 }}>{title}</h3>
              <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--label-secondary)", maxWidth: 520 }}>{copy}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Facts() {
  const [visible, setVisible] = useState(false);
  return (
    <section className="lp-section">
      <motion.div className="lp-facts" onViewportEnter={() => setVisible(true)} viewport={{ once: true, amount: 0.5 }}>
        {FACTS.map((fact) => (
          <div key={fact.label} style={{ textAlign: "center" }}>
            <p className="lp-fact-value tabular">
              {/* Final value server-side and before scrolling in; counts up once visible. */}
              <AnimatedNumber key={visible ? "count" : "static"} countUp={visible} value={fact.value} duration={1.4} />
              {fact.suffix}
            </p>
            <p style={{ fontSize: 14, color: "var(--label-secondary)", maxWidth: 200, margin: "6px auto 0" }}>{fact.label}</p>
          </div>
        ))}
      </motion.div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="lp-section" style={{ scrollMarginTop: 80, maxWidth: 820 }}>
      <Reveal>
        <p className="t-eyebrow lp-eyebrow">FAQ</p>
        <h2 className="lp-h2">Questions, answered plainly.</h2>
      </Reveal>
      <div style={{ marginTop: 32 }}>
        {FAQS.map((item, index) => {
          const isOpen = open === index;
          return (
            <div key={item.q} style={{ borderBottom: "1px solid var(--separator)" }}>
              <h3 style={{ margin: 0 }}>
              <button
                type="button"
                id={`faq-q-${index}`}
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : index)}
                className="pressable"
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "22px 4px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", color: "var(--label)" }}
              >
                <span className="t-headline">{item.q}</span>
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={spring.snappy} style={{ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 999, background: "var(--fill)", flexShrink: 0 }}>
                  <ChevronDown size={16} />
                </motion.span>
              </button>
              </h3>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    role="region"
                    aria-labelledby={`faq-q-${index}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={spring.smooth}
                    style={{ overflow: "hidden" }}
                  >
                    <p style={{ padding: "0 4px 24px", fontSize: 16, lineHeight: 1.6, color: "var(--label-secondary)", maxWidth: 680 }}>{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="lp-section">
      <Reveal>
        <div className="lp-cta">
          <h2 className="lp-h2" style={{ color: "#fff", margin: "0 auto 14px" }}>Your next great buy is already listed.</h2>
          <p style={{ fontSize: 18, color: "#fff", maxWidth: 560, margin: "0 auto 30px" }}>
            Tell us about your buying desk and we&apos;ll set up a workspace for your team.
          </p>
          <Link href="/request-access" className="btn btn-lg pressable" style={{ background: "#fff", color: "#2a1f8f", boxShadow: "0 10px 30px rgba(0,0,0,0.25)" }}>
            Request access <ArrowRight size={17} />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <SiteNav />
      <main style={{ background: "var(--bg-base)", minHeight: "100vh", overflowX: "clip" }}>
        <Hero />
        <Principles />
        <HowItWorks />
        <Features />
        <Facts />
        <FAQ />
        <ClosingCta />
      </main>
      <SiteFooter />
    </>
  );
}
