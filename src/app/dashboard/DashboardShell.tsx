"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "motion/react";
import { Crosshair, Inbox, LayoutGrid, LogOut, Package, Radar, Search, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { SpotrLogo } from "@/components/ui/SpotrLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { CommandPaletteProvider, useCommandPalette } from "@/components/command/CommandPaletteProvider";
import { Kbd, usePaletteShortcutLabel } from "@/components/ui/Kbd";
import { spring } from "@/lib/motion";
import { isAdmin, isAdminOnlyPath } from "@/lib/roles";

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  /** Shorter label for the compact tab bar. */
  short: string;
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Acquire",
    items: [
      { href: "/dashboard/feed", icon: Radar, label: "Opportunity Feed", short: "Feed" },
      { href: "/dashboard", icon: LayoutGrid, label: "Pipeline", short: "Pipeline" },
    ],
  },
  {
    title: "Market",
    items: [
      { href: "/dashboard/inventory", icon: Package, label: "Inventory", short: "Inventory" },
      { href: "/dashboard/buybox", icon: Crosshair, label: "Buy Box", short: "Buy Box" },
    ],
  },
  {
    title: "Team",
    items: [{ href: "/dashboard/requests", icon: Inbox, label: "Access requests", short: "Requests" }],
  },
];

function navSectionsFor(admin: boolean) {
  return NAV_SECTIONS.map((section) => ({ ...section, items: section.items.filter((item) => admin || !isAdminOnlyPath(item.href)) })).filter(
    (section) => section.items.length > 0
  );
}

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
}

function ShellSkeleton() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }} aria-busy="true" aria-label="Loading Spotr">
      <div
        className="app-sidebar"
        style={{
          position: "fixed",
          inset: "0 auto 0 0",
          width: 240,
          flexDirection: "column",
          gap: 10,
          padding: "22px 14px",
          borderRight: "1px solid var(--separator)",
        }}
      >
        <div className="skeleton" style={{ width: 110, height: 30, marginBottom: 20 }} />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 34, borderRadius: "var(--radius-sm)" }} />
        ))}
      </div>
      <div className="app-main">
        <div className="page">
          <div className="skeleton" style={{ width: 240, height: 34, marginBottom: 10 }} />
          <div className="skeleton" style={{ width: 360, maxWidth: "80%", height: 16, marginBottom: 32 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton" style={{ height: 180, borderRadius: "var(--radius-lg)" }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={active ? "pressable" : "pressable hover-fill hover-label"}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 11,
        height: 36,
        padding: "0 11px",
        borderRadius: "var(--radius-sm)",
        fontSize: 14,
        fontWeight: active ? 600 : 500,
        color: active ? "var(--label)" : "var(--label-secondary)",
        textDecoration: "none",
      }}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          transition={spring.snappy}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "var(--radius-sm)",
            background: "rgba(var(--tint-rgb), 0.14)",
            boxShadow: "inset 0 0 0 1px rgba(var(--tint-rgb), 0.22)",
          }}
        />
      )}
      <Icon
        size={17}
        strokeWidth={active ? 2.3 : 2}
        style={{ position: "relative", flexShrink: 0, color: active ? "var(--tint-text)" : "currentColor" }}
      />
      <span style={{ position: "relative" }}>{item.label}</span>
    </Link>
  );
}

/** Opens the command palette; looks like a search field so it's findable without the shortcut. */
function PaletteButton() {
  const { openPalette } = useCommandPalette();
  const keys = usePaletteShortcutLabel();
  return (
    <button
      type="button"
      onClick={openPalette}
      aria-label="Search or jump to…"
      aria-haspopup="dialog"
      aria-keyshortcuts={keys[0] === "⌘" ? "Meta+K" : "Control+K"}
      className="pressable hover-fill"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        width: "100%",
        height: 36,
        padding: "0 8px 0 11px",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--separator)",
        background: "var(--fill)",
        color: "var(--label-secondary)",
        fontSize: 14,
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      <Search size={15} aria-hidden="true" />
      <span style={{ flex: 1, textAlign: "left" }}>Search</span>
      <span className="keyboard-only">
        <Kbd keys={keys} />
      </span>
    </button>
  );
}

function Sidebar({ pathname, email, admin }: { pathname: string; email?: string | null; admin: boolean }) {
  return (
    <nav
      aria-label="Primary"
      className="app-sidebar material"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: 240,
        flexDirection: "column",
        zIndex: 50,
        borderRight: "1px solid var(--separator)",
      }}
    >
      <div style={{ padding: "22px 20px 18px" }}>
        <Link href="/" aria-label="Spotr home" style={{ textDecoration: "none" }} className="pressable">
          <SpotrLogo size={30} />
        </Link>
      </div>

      <div style={{ padding: "0 12px 14px" }}>
        <PaletteButton />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 12px" }}>
        {navSectionsFor(admin).map((section) => (
          <div key={section.title} style={{ marginBottom: 18 }}>
            <p className="t-eyebrow" style={{ color: "var(--label-secondary)", padding: "0 11px 8px" }}>
              {section.title}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {section.items.map((item) => (
                <SidebarLink key={item.href} item={item} active={isActive(pathname, item.href)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: "12px", borderTop: "1px solid var(--separator)", display: "flex", flexDirection: "column", gap: 4 }}>
        <ThemeToggle />
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px" }}>
          <span
            aria-hidden="true"
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              background: "var(--brand-gradient)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {(email?.[0] ?? "S").toUpperCase()}
          </span>
          <span
            title={email ?? undefined}
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 13,
              color: "var(--label-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {email ?? "Signed in"}
          </span>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            aria-label="Sign out"
            title="Sign out"
            className="pressable hover-danger"
            style={{
              width: 30,
              height: 30,
              display: "grid",
              placeItems: "center",
              borderRadius: 999,
              border: "none",
              background: "transparent",
              color: "var(--label-secondary)",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </nav>
  );
}

/** Compact layouts: a translucent tab bar along the bottom, iOS-style. */
function TabBar({ pathname, admin }: { pathname: string; admin: boolean }) {
  return (
    <nav
      aria-label="Primary"
      className="app-tabbar material"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        justifyContent: "space-around",
        padding: "6px 6px calc(6px + env(safe-area-inset-bottom))",
        borderTop: "1px solid var(--separator)",
      }}
    >
      {navSectionsFor(admin).flatMap((section) => section.items).map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="pressable"
            style={{
              position: "relative",
              flex: 1,
              maxWidth: 110,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              padding: "7px 0 5px",
              borderRadius: "var(--radius-md)",
              fontSize: 11,
              fontWeight: active ? 600 : 500,
              color: active ? "var(--tint-text)" : "var(--label-secondary)",
              textDecoration: "none",
            }}
          >
            {active && (
              <motion.span
                layoutId="tabbar-active"
                transition={spring.snappy}
                style={{ position: "absolute", inset: 0, borderRadius: "var(--radius-md)", background: "rgba(var(--tint-rgb), 0.12)" }}
              />
            )}
            <Icon size={21} strokeWidth={active ? 2.3 : 1.9} style={{ position: "relative" }} />
            <span style={{ position: "relative" }}>{item.short}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Compact layouts: brand + appearance switch above the content. */
function CompactTopBar() {
  const { openPalette } = useCommandPalette();
  return (
    <div
      className="show-compact material"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "calc(10px + env(safe-area-inset-top)) 16px 10px",
        borderBottom: "1px solid var(--separator)",
      }}
    >
      <Link href="/" aria-label="Spotr home" style={{ textDecoration: "none" }}>
        <SpotrLogo size={28} />
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          type="button"
          onClick={openPalette}
          aria-label="Search or jump to…"
          aria-haspopup="dialog"
          className="pressable hover-fill"
          style={{
            width: 36,
            height: 36,
            display: "grid",
            placeItems: "center",
            borderRadius: 999,
            border: "none",
            background: "var(--fill)",
            color: "var(--label-secondary)",
            cursor: "pointer",
          }}
        >
          <Search size={17} aria-hidden="true" />
        </button>
        <div style={{ width: 64 }}>
          <ThemeToggle label={false} />
        </div>
      </div>
    </div>
  );
}

export function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status, data } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") return <ShellSkeleton />;

  if (status === "authenticated") {
    const admin = isAdmin(data?.user?.role);
    return (
      <CommandPaletteProvider isAdmin={admin}>
        <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
          <Sidebar pathname={pathname} email={data?.user?.email} admin={admin} />
          <TabBar pathname={pathname} admin={admin} />
          <main className="app-main">
            <CompactTopBar />
            {children}
          </main>
        </div>
      </CommandPaletteProvider>
    );
  }

  return null;
}
