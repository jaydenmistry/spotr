"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Car, LogOut, LayoutDashboard, Package, Radar } from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-base)",
          color: "#ff9147",
          fontSize: 15,
          fontWeight: 600,
          gap: 10,
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            border: "2px solid rgba(255,122,26,0.2)",
            borderTopColor: "#ff7a1a",
            animation: "spin 0.8s linear infinite",
          }}
        />
        Loading…
      </div>
    );
  }

  if (status === "authenticated") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
        {/* Sidebar */}
        <nav
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            width: 220,
            background: "rgba(8,12,20,0.95)",
            backdropFilter: "blur(20px)",
            borderRight: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            flexDirection: "column",
            zIndex: 50,
            padding: "24px 0",
          }}
        >
          {/* Logo */}
          <div style={{ padding: "0 20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Link
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  display: "grid",
                  placeItems: "center",
                  background: "linear-gradient(135deg, #ff7a1a, #f59e0b)",
                  flexShrink: 0,
                }}
              >
                <Car style={{ width: 20, height: 20, color: "#fff" }} />
              </span>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                  color: "#f0f4ff",
                }}
              >
                SPOT<span style={{ color: "#ff7a1a" }}>R</span>
              </span>
            </Link>
          </div>

          {/* Nav links */}
          <div style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              { href: "/dashboard", icon: LayoutDashboard, label: "Pipeline" },
              { href: "/dashboard/feed", icon: Radar, label: "Opportunity Feed" },
              { href: "/dashboard/inventory", icon: Package, label: "Inventory" },
            ].map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#8b9ab8",
                  textDecoration: "none",
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.color = "#f0f4ff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "";
                  e.currentTarget.style.color = "#8b9ab8";
                }}
              >
                <Icon style={{ width: 17, height: 17, flexShrink: 0 }} />
                {label}
              </Link>
            ))}
          </div>

          {/* Sign out */}
          <div style={{ padding: "0 12px" }}>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                color: "#4a5670",
                background: "none",
                border: "none",
                cursor: "pointer",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#4a5670")}
            >
              <LogOut style={{ width: 17, height: 17 }} />
              Sign out
            </button>
          </div>
        </nav>

        {/* Main content — offset by sidebar */}
        <main
          style={{
            marginLeft: 220,
            minHeight: "100vh",
            background: "var(--bg-base)",
          }}
        >
          {children}
        </main>
      </div>
    );
  }

  return null;
}
