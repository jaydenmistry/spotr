"use client";

import { SpotrLogo } from "@/components/ui/SpotrLogo";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { spring } from "@/lib/motion";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("That email and password don't match. Please try again.");
        setLoading(false);
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        position: "relative",
        overflow: "hidden",
        background: "var(--bg-base)",
      }}
    >
      <div aria-hidden="true" className="lp-hero-glow" style={{ inset: "-30% -20% auto" }} />

      <div style={{ position: "absolute", top: "calc(16px + env(safe-area-inset-top))", right: 16, width: 64 }}>
        <ThemeToggle label={false} />
      </div>

      <div style={{ position: "relative", width: "100%", maxWidth: 400 }}>
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={spring.bouncy}
          style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}
        >
          <Link href="/" aria-label="Spotr home" className="pressable" style={{ textDecoration: "none" }}>
            <SpotrLogo size={44} />
          </Link>
        </motion.div>

        <motion.div
          initial={{ y: 24, scale: 0.97 }}
          animate={error ? { y: 0, scale: 1, x: [0, -10, 9, -6, 4, 0] } : { y: 0, scale: 1, x: 0 }}
          transition={error ? { duration: 0.42, ease: "easeOut" } : { ...spring.smooth, delay: 0.08 }}
          className="material"
          style={{
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--separator)",
            boxShadow: "var(--shadow-lg), inset 0 1px 0 var(--material-edge)",
            padding: "32px 28px 28px",
          }}
        >
          <h1 className="t-title1" style={{ color: "var(--label)", textAlign: "center" }}>Sign in</h1>
          <p className="t-subhead" style={{ color: "var(--label-secondary)", textAlign: "center", marginTop: 6, marginBottom: 26 }}>
            Welcome back to your buying desk.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="t-footnote" style={{ fontWeight: 600, color: "var(--label-secondary)" }}>Email</span>
              <span style={{ position: "relative" }}>
                <Mail aria-hidden="true" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--label-secondary)", pointerEvents: "none" }} />
                <input
                  type="email"
                  autoComplete="email"
                  required
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "login-error" : undefined}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field"
                  style={{ height: 44, paddingLeft: 38, fontSize: 15 }}
                />
              </span>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="t-footnote" style={{ fontWeight: 600, color: "var(--label-secondary)" }}>Password</span>
              <span style={{ position: "relative" }}>
                <Lock aria-hidden="true" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--label-secondary)", pointerEvents: "none" }} />
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "login-error" : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field"
                  style={{ height: 44, paddingLeft: 38, fontSize: 15 }}
                />
              </span>
            </label>

            <AnimatePresence initial={false}>
              {error && (
                <motion.p
                  id="login-error"
                  role="alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={spring.snappy}
                  style={{ overflow: "hidden", fontSize: 13, fontWeight: 500, color: "var(--red)" }}
                >
                  <span style={{ display: "block", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "rgba(var(--red-rgb), 0.1)" }}>{error}</span>
                </motion.p>
              )}
            </AnimatePresence>

            <button type="submit" disabled={loading} className="btn btn-lg btn-primary pressable" style={{ width: "100%", marginTop: 6 }}>
              {loading ? (
                <>
                  <span aria-hidden="true" style={{ width: 16, height: 16, borderRadius: 999, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          <p style={{ marginTop: 18, fontSize: 14, color: "var(--label-secondary)", textAlign: "center" }}>
            New to Spotr?{" "}
            <Link href="/request-access" style={{ color: "var(--tint-text)", fontWeight: 600, textDecoration: "none" }}>
              Request access
            </Link>
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ textAlign: "center", marginTop: 20 }}
        >
          <Link href="/" className="hover-label" style={{ fontSize: 13, color: "var(--label-secondary)", textDecoration: "none" }}>
            ← Back to spotrcars.com
          </Link>
        </motion.p>
      </div>
    </main>
  );
}
