"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Car, Lock, Mail } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@spotrcars.com");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid credentials. Try demo@spotrcars.com / password");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient orbs */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,122,26,0.12) 0%, transparent 70%)",
          top: -120,
          left: -120,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(167,139,250,0.07) 0%, transparent 70%)",
          bottom: -80,
          right: -80,
          pointerEvents: "none",
        }}
      />

      {/* Grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", width: "100%", maxWidth: 440 }}>
        {/* Logo / back link */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
            }}
          >
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #ff7a1a, #f59e0b)",
                boxShadow: "0 8px 24px rgba(255,122,26,0.35)",
              }}
            >
              <Car style={{ width: 22, height: 22, color: "#fff" }} />
            </span>
            <span
              style={{
                fontSize: 24,
                fontWeight: 900,
                letterSpacing: "-0.02em",
                color: "#f0f4ff",
              }}
            >
              SPOT<span style={{ color: "#ff7a1a" }}>R</span>
            </span>
          </Link>
        </div>

        {/* Card */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 20,
            padding: "40px 36px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ marginBottom: 28 }}>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: "-0.02em",
                color: "#f0f4ff",
                marginBottom: 6,
              }}
            >
              Sign in
            </h1>
            <p style={{ fontSize: 14, color: "#8b9ab8" }}>
              Access the Spotr acquisition platform
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Email */}
            <div>
              <label
                htmlFor="email-address"
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  color: "#8b9ab8",
                  marginBottom: 7,
                  textTransform: "uppercase",
                }}
              >
                Email
              </label>
              <div style={{ position: "relative" }}>
                <Mail
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 16,
                    height: 16,
                    color: "#4a5670",
                    pointerEvents: "none",
                  }}
                />
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    padding: "11px 14px 11px 42px",
                    fontSize: 14,
                    color: "#f0f4ff",
                    outline: "none",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#ff7a1a")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                  placeholder="demo@spotrcars.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  color: "#8b9ab8",
                  marginBottom: 7,
                  textTransform: "uppercase",
                }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 16,
                    height: 16,
                    color: "#4a5670",
                    pointerEvents: "none",
                  }}
                />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    padding: "11px 14px 11px 42px",
                    fontSize: 14,
                    color: "#f0f4ff",
                    outline: "none",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#ff7a1a")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  fontSize: 13,
                  color: "#f87171",
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                padding: "13px 24px",
                fontSize: 15,
                fontWeight: 700,
                color: "#fff",
                borderRadius: 12,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                background: loading
                  ? "rgba(255,122,26,0.5)"
                  : "linear-gradient(135deg, #ff7a1a, #f59e0b)",
                boxShadow: loading ? "none" : "0 8px 24px rgba(255,122,26,0.4)",
                transition: "opacity 0.15s",
                marginTop: 4,
              }}
            >
              {loading ? "Signing in…" : "Sign in"}
              {!loading && <ArrowRight style={{ width: 16, height: 16 }} />}
            </button>
          </form>

          {/* Demo hint */}
          <div
            style={{
              marginTop: 20,
              padding: "12px 14px",
              borderRadius: 10,
              background: "rgba(255,122,26,0.07)",
              border: "1px solid rgba(255,122,26,0.18)",
              fontSize: 12,
              color: "#8b9ab8",
              lineHeight: 1.6,
            }}
          >
            <span style={{ fontWeight: 700, color: "#ff9147" }}>Demo access: </span>
            demo@spotrcars.com · password
          </div>
        </div>
      </div>
    </div>
  );
}
