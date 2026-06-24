"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Car,
  Check,
  CircleDollarSign,
  Gauge,
  Mail,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
  X,
  Plus,
} from "lucide-react";

/* ─── Data ──────────────────────────────────────────────────── */

const logoCloud = [
  "Northline Auto",
  "Summit Ford",
  "Vista Motors",
  "Prime CDJR",
  "Oak City Toyota",
  "Metro Mazda",
  "Harbor Honda",
  "Canyon Kia",
];

const workflow = [
  {
    icon: Search,
    eyebrow: "Step 1 — Discover",
    title: "Every private listing, zero tab-hopping",
    copy: "Spotr automatically pulls fresh local private-seller listings from Facebook Marketplace, Craigslist, and Autotrader into one clean workspace — updated in real time.",
    color: "#ff7a1a",
  },
  {
    icon: MessageSquare,
    eyebrow: "Step 2 — Engage",
    title: "Call, text, and email from one buying desk",
    copy: "Reach sellers the moment a car hits the market. Log notes, track every reply, and move deals through your pipeline without switching apps.",
    color: "#f59e0b",
  },
  {
    icon: Sparkles,
    eyebrow: "Step 3 — Acquire",
    title: "AI ranks the best opportunities first",
    copy: "Our model scores every listing by fit, age, and margin potential so your buyer always knows which car to call next.",
    color: "#a78bfa",
  },
];

const painPoints = [
  {
    without: "Dozens of browser tabs for each marketplace",
    with: "One clean workspace for every private listing",
  },
  {
    without: "Sellers go cold because follow-up is manual",
    with: "Automated reminders keep every seller warm",
  },
  {
    without: "No idea which cars are worth pursuing",
    with: "AI fit-score tells you exactly which car to call next",
  },
  {
    without: "Cars vanish into spreadsheets & lost sticky notes",
    with: "A live pipeline that tracks every deal from spot to purchase",
  },
];

const stats = [
  { value: "86+", label: "Fresh listings daily", icon: Car },
  { value: "3×", label: "Faster seller contact", icon: Zap },
  { value: "41", label: "Sellers reached today", icon: MessageSquare },
  { value: "AI", label: "Opportunity ranking", icon: Sparkles },
];

const faqs = [
  {
    q: "What problem does Spotr solve?",
    a: "Car dealers lose deals because they're manually browsing dozens of tabs, chasing sellers via personal phones, and tracking opportunities in spreadsheets. Spotr replaces that chaos with one purpose-built acquisition platform.",
  },
  {
    q: "Does this replace our CRM?",
    a: "No. Spotr is laser-focused on the acquisition side: finding private-seller cars, managing outreach, and moving opportunities into inventory before your competitors call first.",
  },
  {
    q: "How do I get started?",
    a: "Use the 'Get a Demo' button to access the live demo workspace — no signup required. Your team can explore the full pipeline experience immediately.",
  },
];

const previewListings = [
  {
    name: "2018 Toyota 4Runner",
    price: "$31,500",
    miles: "54k mi",
    source: "Facebook",
    score: 92,
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=700&q=80",
    badge: "Hot lead",
    badgeColor: "#ef4444",
  },
  {
    name: "2021 Ford F-150",
    price: "$39,200",
    miles: "37k mi",
    source: "Autotrader",
    score: 87,
    image: "https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=700&q=80",
    badge: "New today",
    badgeColor: "#10b981",
  },
];

/* ─── Shared styles ──────────────────────────────────────────── */

const S = {
  card: {
    background: "var(--bg-card)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
  } as React.CSSProperties,
  section: {
    background: "var(--bg-base)",
  } as React.CSSProperties,
};

/* ─── Sub-components ─────────────────────────────────────────── */

function SpotrLogo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Spotr home">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
        style={{ background: "linear-gradient(135deg, #ff7a1a, #f59e0b)" }}
      >
        <Car className="h-5 w-5 text-white" />
      </span>
      <span className="text-xl font-black tracking-tight" style={{ color: "#f0f4ff" }}>
        SPOT<span style={{ color: "#ff7a1a" }}>R</span>
      </span>
    </Link>
  );
}

function NavBar() {
  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "rgba(8,12,20,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 24px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <SpotrLogo />

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
            fontSize: 14,
            fontWeight: 500,
            color: "#8b9ab8",
          }}
          className="hidden lg:flex"
        >
          {["How it Works", "Product", "FAQ"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replaceAll(" ", "-")}`}
              style={{ transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f0f4ff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#8b9ab8")}
            >
              {item}
            </a>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link
            href="/login"
            style={{
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 600,
              color: "#8b9ab8",
              borderRadius: 10,
              transition: "color 0.15s",
            }}
          >
            Login
          </Link>
          <Link
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 20px",
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
              borderRadius: 10,
              background: "linear-gradient(135deg, #ff7a1a, #f59e0b)",
              boxShadow: "0 4px 20px rgba(255,122,26,0.4)",
              transition: "opacity 0.15s, transform 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            Get a Demo
            <ArrowRight style={{ width: 15, height: 15 }} />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ─── Hero ───────────────────────────────────────────────────── */

function HeroSection() {
  return (
    <section
      style={{
        background: "var(--bg-base)",
        paddingTop: 130, // clear fixed nav
        paddingBottom: 80,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient orbs — purely decorative, contained */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,122,26,0.14) 0%, transparent 70%)",
          top: -100,
          left: -100,
          pointerEvents: "none",
          animation: "orb-move 18s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(167,139,250,0.09) 0%, transparent 70%)",
          bottom: 0,
          right: -80,
          pointerEvents: "none",
          animation: "orb-move 22s ease-in-out infinite reverse",
        }}
      />

      {/* Grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          pointerEvents: "none",
        }}
      />

      {/* Hero copy */}
      <div
        style={{
          position: "relative",
          maxWidth: 900,
          margin: "0 auto",
          padding: "0 24px",
          textAlign: "center",
        }}
      >
        {/* Eyebrow badge */}
        <div
          className="animate-fade-up"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            borderRadius: 100,
            border: "1px solid rgba(255,122,26,0.4)",
            background: "rgba(255,122,26,0.1)",
            color: "#ff9147",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 28,
          }}
        >
          <span
            style={{
              position: "relative",
              width: 8,
              height: 8,
              display: "inline-flex",
            }}
          >
            <span
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: "#ff7a1a",
                animation: "pulse-ring 1.5s ease-out infinite",
                opacity: 0,
              }}
            />
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#ff7a1a",
                display: "block",
              }}
            />
          </span>
          Built for car dealerships — live demo available
        </div>

        {/* H1 */}
        <h1
          className="animate-fade-up-delay-1"
          style={{
            fontSize: "clamp(2.5rem, 6vw, 5rem)",
            fontWeight: 900,
            lineHeight: 1.06,
            letterSpacing: "-0.02em",
            color: "#f0f4ff",
            margin: "0 0 24px",
          }}
        >
          Your competitors are calling{" "}
          <span className="shimmer-text">private sellers</span>{" "}
          right now.
        </h1>

        {/* Sub-headline */}
        <p
          className="animate-fade-up-delay-2"
          style={{
            fontSize: "clamp(1rem, 2vw, 1.2rem)",
            lineHeight: 1.7,
            color: "#8b9ab8",
            maxWidth: 680,
            margin: "0 auto 36px",
          }}
        >
          Dealers lose used-car deals because they&apos;re buried in tabs, missing
          seller replies, and buying blind.{" "}
          <span style={{ color: "#f0f4ff", fontWeight: 600 }}>
            Spotr gives your buying desk one workspace to find, contact, and
            acquire private-seller inventory before anyone else does.
          </span>
        </p>

        {/* CTAs */}
        <div
          className="animate-fade-up-delay-3"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <Link
            href="/login"
            id="hero-demo-cta"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 32px",
              fontSize: 16,
              fontWeight: 700,
              color: "#fff",
              borderRadius: 12,
              background: "linear-gradient(135deg, #ff7a1a, #f59e0b)",
              boxShadow: "0 8px 28px rgba(255,122,26,0.45)",
              transition: "transform 0.15s, opacity 0.15s",
            }}
          >
            Get a Demo
            <ArrowRight style={{ width: 18, height: 18 }} />
          </Link>
          <Link
            href="/dashboard"
            id="hero-pipeline-cta"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 32px",
              fontSize: 16,
              fontWeight: 700,
              color: "#f0f4ff",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.05)",
              transition: "border-color 0.15s",
            }}
          >
            View Live Pipeline
          </Link>
        </div>

        <p
          className="animate-fade-up-delay-4"
          style={{ fontSize: 13, color: "#4a5670" }}
        >
          No signup required · Demo data preloaded · Takes 30 seconds
        </p>
      </div>

      {/* Dashboard preview — BELOW the text, not floating over it */}
      <div
        style={{
          position: "relative",
          maxWidth: 1200,
          margin: "64px auto 0",
          padding: "0 24px",
        }}
      >
        {/* Dashboard shell */}
        <div
          style={{
            borderRadius: 20,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "#0f1520",
            boxShadow: "0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
          }}
        >
          {/* Title bar */}
          <div
            style={{
              height: 52,
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "0 20px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(8,12,20,0.8)",
            }}
          >
            <div style={{ display: "flex", gap: 8, marginRight: 8 }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444", display: "block" }} />
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#f59e0b", display: "block" }} />
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#10b981", display: "block" }} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 900, color: "#f0f4ff" }}>
              SPOT<span style={{ color: "#ff7a1a" }}>R</span>
            </span>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 12px",
                borderRadius: 8,
                background: "rgba(255,122,26,0.15)",
                color: "#ff9147",
                fontSize: 13,
                fontWeight: 600,
                marginLeft: 4,
              }}
            >
              <Car style={{ width: 14, height: 14 }} />
              Fresh Listings
              <span
                style={{
                  background: "#ff7a1a",
                  color: "white",
                  borderRadius: 100,
                  padding: "1px 7px",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                +86
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: "#8b9ab8",
                marginLeft: 8,
              }}
              className="hidden md:flex"
            >
              <CalendarDays style={{ width: 14, height: 14 }} />
              Appraisals
              <span
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "#f0f4ff",
                  borderRadius: 100,
                  padding: "1px 7px",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                18
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto", color: "#4a5670" }}>
              <MapPin style={{ width: 16, height: 16 }} />
              <Bell style={{ width: 16, height: 16 }} />
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #ff7a1a, #f59e0b)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 11,
                  fontWeight: 900,
                  color: "white",
                }}
              >
                SR
              </span>
            </div>
          </div>

          {/* Dashboard body — 3 col */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
              padding: 16,
              background: "linear-gradient(135deg, #0f1520 0%, rgba(255,122,26,0.04) 50%, #0f1520 100%)",
            }}
            className="md:grid-cols-3 grid-cols-1"
          >
            {/* Col 1: listings */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {previewListings.map(({ name, price, miles, source, score, image, badge, badgeColor }) => (
                <div
                  key={name}
                  style={{
                    borderRadius: 12,
                    padding: 14,
                    background: "var(--bg-card)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div style={{ position: "relative", marginBottom: 10, borderRadius: 8, overflow: "hidden" }}>
                    <Image
                      src={image}
                      alt={`${name} private seller listing`}
                      width={700}
                      height={420}
                      style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: 6,
                        left: 6,
                        background: badgeColor,
                        color: "white",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 6,
                      }}
                    >
                      {badge}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#f0f4ff", marginBottom: 3 }}>{name}</p>
                      <p style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#8b9ab8" }}>
                        <Gauge style={{ width: 11, height: 11 }} />
                        {miles} · {source}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#ff9147" }}>{price}</span>
                      <p style={{ fontSize: 11, color: "#8b9ab8", marginTop: 2 }}>Score: {score}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Col 2: AI ranked */}
            <div
              style={{
                borderRadius: 12,
                padding: 14,
                background: "var(--bg-card)",
                border: "1px solid rgba(255,122,26,0.2)",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 12,
                  padding: "5px 12px",
                  borderRadius: 8,
                  background: "rgba(255,122,26,0.15)",
                  color: "#ff9147",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <Sparkles style={{ width: 13, height: 13 }} />
                AI ranked #1 opportunity
              </div>
              <div style={{ borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
                <Image
                  src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1000&q=80"
                  alt="Black coupe listed by a private seller"
                  width={1000}
                  height={640}
                  style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {[["92", "Fit score"], ["6h", "Listed"], ["$2.8k", "Margin gap"]].map(([value, label]) => (
                  <div
                    key={label}
                    style={{
                      borderRadius: 8,
                      padding: "10px 6px",
                      textAlign: "center",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <p style={{ fontSize: 16, fontWeight: 900, color: "#ff9147" }}>{value}</p>
                    <p style={{ fontSize: 10, color: "#8b9ab8", marginTop: 2 }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Col 3: tasks + pipeline */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  borderRadius: 12,
                  padding: 14,
                  background: "var(--bg-card)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 700, color: "#f0f4ff", marginBottom: 12 }}>Buyer tasks</p>
                {["Send range offer", "Book inspection", "Pull history report"].map((task, index) => (
                  <div key={task} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: index < 2 ? 10 : 0 }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                        background: index === 0 ? "rgba(255,122,26,0.2)" : "rgba(255,255,255,0.06)",
                      }}
                    >
                      <Check
                        style={{
                          width: 12,
                          height: 12,
                          color: index === 0 ? "#ff7a1a" : "#4a5670",
                        }}
                      />
                    </span>
                    <span style={{ fontSize: 12, color: index === 0 ? "#f0f4ff" : "#8b9ab8", flex: 1 }}>{task}</span>
                    {index === 0 && (
                      <span
                        style={{
                          background: "#ff7a1a",
                          color: "white",
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: 5,
                        }}
                      >
                        next
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div
                style={{
                  borderRadius: 12,
                  padding: 14,
                  background: "linear-gradient(135deg, rgba(255,122,26,0.15), rgba(245,158,11,0.08))",
                  border: "1px solid rgba(255,122,26,0.25)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Zap style={{ width: 28, height: 28, color: "#f59e0b", flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 11, color: "#8b9ab8" }}>Today&apos;s activity</p>
                  <p style={{ fontSize: 18, fontWeight: 900, color: "#f0f4ff" }}>41 sellers contacted</p>
                </div>
              </div>

              <div
                style={{
                  borderRadius: 12,
                  padding: 14,
                  background: "var(--bg-card)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 700, color: "#f0f4ff", marginBottom: 12 }}>Pipeline health</p>
                {[["New Leads", 78], ["Contacted", 48], ["Offer Made", 32]].map(([stage, pct]) => (
                  <div key={stage as string} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8b9ab8", marginBottom: 4 }}>
                      <span>{stage}</span>
                      <span>{pct}%</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 100, background: "rgba(255,255,255,0.07)" }}>
                      <div
                        style={{
                          height: 5,
                          width: `${pct}%`,
                          borderRadius: 100,
                          background: "linear-gradient(90deg, #ff7a1a, #f59e0b)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Logo cloud ─────────────────────────────────────────────── */

function LogoCloud() {
  return (
    <section style={{ ...S.section, padding: "72px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#4a5670", marginBottom: 28 }}>
          Trusted by growth-minded dealerships
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
          {logoCloud.map((logo) => (
            <div
              key={logo}
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                background: "var(--bg-card)",
                border: "1px solid rgba(255,255,255,0.07)",
                fontSize: 13,
                fontWeight: 700,
                color: "#4a5670",
              }}
            >
              {logo}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Problem section ────────────────────────────────────────── */

function ProblemSection() {
  return (
    <section id="how-it-works" style={{ ...S.section, padding: "96px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 56px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ff7a1a", marginBottom: 16 }}>
            The problem
          </p>
          <h2
            style={{
              fontSize: "clamp(2rem, 4.5vw, 3.25rem)",
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "#f0f4ff",
              marginBottom: 20,
            }}
          >
            Dealers are losing cars to competitors{" "}
            <span className="shimmer-text">every single day</span>
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: "#8b9ab8" }}>
            Private-seller vehicles sell fast. The dealership that contacts the
            seller first usually wins. Right now, that&apos;s probably not you.
          </p>
        </div>

        {/* Two-column comparison */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {/* Without */}
          <div
            style={{
              borderRadius: 16,
              padding: "28px 28px 32px",
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.18)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(239,68,68,0.15)",
                }}
              >
                <X style={{ width: 18, height: 18, color: "#ef4444" }} />
              </span>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f0f4ff" }}>Without Spotr</h3>
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
              {painPoints.map((pt) => (
                <li key={pt.without} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#8b9ab8", lineHeight: 1.5 }}>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      marginTop: 1,
                      background: "rgba(239,68,68,0.2)",
                    }}
                  >
                    <X style={{ width: 10, height: 10, color: "#ef4444" }} />
                  </span>
                  {pt.without}
                </li>
              ))}
            </ul>
          </div>

          {/* With */}
          <div
            style={{
              borderRadius: 16,
              padding: "28px 28px 32px",
              background: "rgba(255,122,26,0.07)",
              border: "1px solid rgba(255,122,26,0.22)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(255,122,26,0.2)",
                }}
              >
                <Check style={{ width: 18, height: 18, color: "#ff7a1a" }} />
              </span>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f0f4ff" }}>With Spotr</h3>
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
              {painPoints.map((pt) => (
                <li key={pt.with} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#f0f4ff", lineHeight: 1.5 }}>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      marginTop: 1,
                      background: "rgba(255,122,26,0.2)",
                    }}
                  >
                    <Check style={{ width: 10, height: 10, color: "#ff7a1a" }} />
                  </span>
                  {pt.with}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Workflow section ───────────────────────────────────────── */

function WorkflowSection() {
  return (
    <section id="product" style={{ ...S.section, padding: "96px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 56px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ff7a1a", marginBottom: 16 }}>
            How it works
          </p>
          <h2
            style={{
              fontSize: "clamp(2rem, 4.5vw, 3rem)",
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "#f0f4ff",
            }}
          >
            Three steps from listing to acquisition
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {workflow.map((item, i) => (
            <article
              key={item.title}
              style={{
                position: "relative",
                borderRadius: 16,
                padding: "28px 28px 32px",
                background: "var(--bg-card)",
                border: "1px solid rgba(255,255,255,0.08)",
                overflow: "hidden",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "";
              }}
            >
              {/* Step watermark */}
              <div
                style={{
                  position: "absolute",
                  right: -8,
                  top: -12,
                  fontSize: 96,
                  fontWeight: 900,
                  color: "rgba(255,255,255,0.02)",
                  lineHeight: 1,
                  userSelect: "none",
                }}
              >
                {i + 1}
              </div>

              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  display: "grid",
                  placeItems: "center",
                  marginBottom: 20,
                  background: `${item.color}1a`,
                  border: `1px solid ${item.color}30`,
                }}
              >
                <item.icon style={{ width: 22, height: 22, color: item.color }} />
              </div>

              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: item.color, marginBottom: 10 }}>
                {item.eyebrow}
              </p>
              <h3 style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.25, letterSpacing: "-0.01em", color: "#f0f4ff", marginBottom: 12 }}>
                {item.title}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "#8b9ab8" }}>
                {item.copy}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Stats section ──────────────────────────────────────────── */

function StatsSection() {
  return (
    <section style={{ ...S.section, padding: "0 24px 96px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            borderRadius: 20,
            padding: "56px 40px",
            background: "linear-gradient(135deg, var(--bg-card) 0%, rgba(255,122,26,0.06) 50%, var(--bg-card) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 40,
          }}
        >
          {stats.map(({ value, label, icon: Icon }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 16px",
                  background: "rgba(255,122,26,0.15)",
                }}
              >
                <Icon style={{ width: 22, height: 22, color: "#ff7a1a" }} />
              </div>
              <p style={{ fontSize: "clamp(2.5rem, 5vw, 3.5rem)", fontWeight: 900, color: "#ff9147", lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#8b9ab8", marginTop: 8 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features banner ────────────────────────────────────────── */

function FeaturesBannerSection() {
  return (
    <section id="solutions" style={{ ...S.section, padding: "0 24px 96px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            borderRadius: 24,
            overflow: "hidden",
            background: "linear-gradient(135deg, #0f1520 0%, #1a0a00 60%, #0f1520 100%)",
            border: "1px solid rgba(255,122,26,0.2)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 48,
              padding: "56px 48px",
            }}
          >
            {/* Left */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ff7a1a", marginBottom: 16 }}>
                Built for the buying desk
              </p>
              <h2
                style={{
                  fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
                  fontWeight: 900,
                  lineHeight: 1.15,
                  letterSpacing: "-0.02em",
                  color: "#f0f4ff",
                  marginBottom: 20,
                }}
              >
                Give one buyer the leverage of a full acquisition team.
              </h2>
              <p style={{ fontSize: 16, lineHeight: 1.7, color: "#8b9ab8", marginBottom: 32 }}>
                Prioritized listings, seller messaging, appraisal tasks, and
                pipeline status all connected. Promising cars never vanish into
                spreadsheets.
              </p>
              <Link
                href="/login"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "13px 24px",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#fff",
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #ff7a1a, #f59e0b)",
                  boxShadow: "0 8px 24px rgba(255,122,26,0.35)",
                  transition: "opacity 0.15s",
                }}
              >
                Start sourcing smarter
                <ArrowRight style={{ width: 16, height: 16 }} />
              </Link>
            </div>

            {/* Right */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                [Users, "Assign buyers and track ownership", "#60a5fa"],
                [Mail, "Centralize every seller conversation", "#a78bfa"],
                [TrendingUp, "Measure acquisition pipeline value", "#34d399"],
                [ShieldCheck, "Keep every deal step visible", "#f59e0b"],
              ].map(([Icon, label, color]) => (
                <div
                  key={label as string}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 16px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <span
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      background: `${color as string}20`,
                    }}
                  >
                    <Icon style={{ width: 18, height: 18, color: color as string }} />
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#f0f4ff" }}>{label as string}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ section ────────────────────────────────────────────── */

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" style={{ ...S.section, padding: "0 24px 96px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 64,
            alignItems: "start",
          }}
        >
          {/* Left */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ff7a1a", marginBottom: 16 }}>
              FAQ
            </p>
            <h2
              style={{
                fontSize: "clamp(2rem, 4vw, 2.75rem)",
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "#f0f4ff",
                marginBottom: 20,
              }}
            >
              Quick answers.
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "#8b9ab8", marginBottom: 32 }}>
              The demo account is already wired into the live Spotr app — your
              team can go from this page to the working product in seconds.
            </p>
            <Link
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "13px 24px",
                fontSize: 14,
                fontWeight: 700,
                color: "#f0f4ff",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.05)",
                transition: "border-color 0.15s",
              }}
            >
              Enter the demo
              <ArrowRight style={{ width: 16, height: 16 }} />
            </Link>
          </div>

          {/* Right — accordion */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {faqs.map(({ q, a }, i) => (
              <div
                key={q}
                style={{
                  borderRadius: 14,
                  overflow: "hidden",
                  background: openIndex === i ? "rgba(255,122,26,0.07)" : "var(--bg-card)",
                  border: `1px solid ${openIndex === i ? "rgba(255,122,26,0.25)" : "rgba(255,255,255,0.07)"}`,
                  transition: "background 0.2s, border-color 0.2s",
                }}
              >
                <button
                  id={`faq-btn-${i}`}
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "18px 20px",
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#f0f4ff" }}>{q}</span>
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      background: "rgba(255,255,255,0.06)",
                      transition: "transform 0.2s",
                      transform: openIndex === i ? "rotate(45deg)" : "rotate(0deg)",
                    }}
                  >
                    <Plus style={{ width: 14, height: 14, color: "#ff7a1a" }} />
                  </span>
                </button>
                {openIndex === i && (
                  <p style={{ padding: "0 20px 18px", fontSize: 14, lineHeight: 1.7, color: "#8b9ab8" }}>
                    {a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Bottom CTA ─────────────────────────────────────────────── */

function CtaBanner() {
  return (
    <section style={{ ...S.section, padding: "0 24px 80px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 24,
            padding: "72px 40px",
            textAlign: "center",
            background: "linear-gradient(135deg, #ff7a1a 0%, #f59e0b 100%)",
          }}
        >
          {/* Decorative circles */}
          <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.1)", top: -80, left: -80, pointerEvents: "none" }} />
          <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.06)", bottom: -60, right: -40, pointerEvents: "none" }} />

          <div style={{ position: "relative" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.75)", marginBottom: 16 }}>
              Ready to stop losing cars?
            </p>
            <h2
              style={{
                fontSize: "clamp(2rem, 4.5vw, 3rem)",
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "#fff",
                marginBottom: 16,
                maxWidth: 600,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              Start buying smarter today.
            </h2>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.85)", marginBottom: 32, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
              Jump into the demo workspace — no signup, no credit card. Your
              team can explore the full pipeline in under a minute.
            </p>
            <Link
              href="/login"
              id="bottom-cta"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "16px 36px",
                fontSize: 16,
                fontWeight: 900,
                color: "#c2410c",
                borderRadius: 12,
                background: "#fff",
                boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                transition: "transform 0.15s, opacity 0.15s",
              }}
            >
              Enter Demo Workspace
              <ArrowRight style={{ width: 18, height: 18 }} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(255,255,255,0.07)",
        background: "var(--bg-surface)",
        padding: "28px 24px",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <SpotrLogo />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, fontSize: 13, fontWeight: 600 }}>
          {[
            ["Product", "#product"],
            ["Solutions", "#solutions"],
            ["FAQ", "#faq"],
          ].map(([label, href]) => (
            <a key={label} href={href} style={{ color: "#4a5670", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f0f4ff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#4a5670")}
            >
              {label}
            </a>
          ))}
          <Link href="/login" style={{ color: "#4a5670", transition: "color 0.15s" }}>Login</Link>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ────────────────────────────────────────────────────── */

export default function Home() {
  return (
    <>
      <NavBar />
      <main style={{ background: "var(--bg-base)", minHeight: "100vh" }}>
        <HeroSection />
        <LogoCloud />
        <ProblemSection />
        <WorkflowSection />
        <StatsSection />
        <FeaturesBannerSection />
        <FAQSection />
        <CtaBanner />
        <Footer />
      </main>
    </>
  );
}
