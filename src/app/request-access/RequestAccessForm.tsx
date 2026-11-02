"use client";

import { useState } from "react";
import Link from "next/link";
import axios from "axios";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import {
  ACCESS_LIMITS,
  ACCESS_ROLES,
  validateAccessRequest,
  type AccessRequestErrors,
} from "@/lib/accessRequest";
import { spring } from "@/lib/motion";

const EMPTY = { name: "", email: "", dealership: "", role: "", message: "", website: "" };

export function RequestAccessForm() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<AccessRequestErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const update = (field: keyof typeof EMPTY) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    // Clear a field's error as soon as the user edits it.
    if (field in errors) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    const result = validateAccessRequest(form);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setSubmitting(true);
    try {
      await axios.post("/api/access-requests", { ...result.value, website: form.website });
      setSent(true);
    } catch (error) {
      const data = axios.isAxiosError(error) ? error.response?.data : null;
      if (data?.fields) setErrors(data.fields);
      setSubmitError(typeof data?.error === "string" ? data.error : "Couldn't send your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="material"
      style={{ position: "relative", borderRadius: "var(--radius-xl)", border: "1px solid var(--separator)", boxShadow: "var(--shadow-lg), inset 0 1px 0 var(--material-edge)", padding: "30px 28px", minHeight: 520 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {sent ? (
          <motion.div
            key="sent"
            role="status"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={spring.smooth}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", minHeight: 460, gap: 12 }}
          >
            <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true">
              <motion.circle cx="38" cy="38" r="34" fill="none" stroke="var(--green)" strokeWidth="4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ ...spring.smooth, duration: 0.6 }} />
              <motion.path d="M24 39 l9 9 l19 -20" fill="none" stroke="var(--green)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ ...spring.bouncy, delay: 0.35 }} />
            </svg>
            <h2 className="t-title2" style={{ color: "var(--label)" }}>Request received.</h2>
            <p style={{ fontSize: 15, color: "var(--label-secondary)", maxWidth: 340 }}>
              Thanks, {form.name.trim().split(" ")[0] || "there"}. We&apos;ll be in touch at {form.email.trim().toLowerCase()} soon.
            </p>
            <Link href="/" className="btn btn-secondary pressable" style={{ marginTop: 8 }}>
              Back to home
            </Link>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={submit} noValidate exit={{ opacity: 0, scale: 0.98 }} transition={spring.snappy} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h2 className="t-title3" style={{ color: "var(--label)" }}>Your details</h2>

            <Field id="name" label="Full name" error={errors.name}>
              <input id="name" className="field" autoComplete="name" maxLength={ACCESS_LIMITS.name} value={form.name} onChange={update("name")} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} />
            </Field>
            <Field id="email" label="Work email" error={errors.email}>
              <input id="email" type="email" className="field" autoComplete="email" maxLength={ACCESS_LIMITS.email} value={form.email} onChange={update("email")} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} />
            </Field>
            <Field id="dealership" label="Dealership or group" error={errors.dealership}>
              <input id="dealership" className="field" autoComplete="organization" maxLength={ACCESS_LIMITS.dealership} value={form.dealership} onChange={update("dealership")} aria-invalid={Boolean(errors.dealership)} aria-describedby={errors.dealership ? "dealership-error" : undefined} />
            </Field>
            <Field id="role" label="Your role" error={errors.role}>
              <select id="role" className="field" value={form.role} onChange={update("role")} aria-invalid={Boolean(errors.role)} aria-describedby={errors.role ? "role-error" : undefined} style={{ color: form.role ? "var(--label)" : "var(--label-secondary)" }}>
                <option value="" disabled>Choose a role…</option>
                {ACCESS_ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </Field>
            <Field id="message" label="Anything we should know? (optional)" error={errors.message}>
              <textarea id="message" className="field" rows={3} maxLength={ACCESS_LIMITS.message} value={form.message} onChange={update("message")} placeholder="Makes you buy, markets you cover, team size…" style={{ height: "auto", padding: "10px 12px", resize: "vertical" }} />
            </Field>

            {/* Honeypot — hidden from people and assistive tech; bots fill it in. */}
            <div aria-hidden="true" style={{ position: "absolute", left: -10000, width: 1, height: 1, overflow: "hidden" }}>
              <label htmlFor="website">Website</label>
              <input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={update("website")} />
            </div>

            <AnimatePresence>
              {submitError && (
                <motion.p role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={spring.snappy} style={{ overflow: "hidden", fontSize: 13, color: "var(--red)" }}>
                  <span style={{ display: "block", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "rgba(var(--red-rgb), 0.1)" }}>{submitError}</span>
                </motion.p>
              )}
            </AnimatePresence>

            <button type="submit" disabled={submitting} className="btn btn-lg btn-primary pressable" style={{ marginTop: 4 }}>
              {submitting ? "Sending…" : <>Request access <ArrowRight size={17} /></>}
            </button>
            <p style={{ fontSize: 12, color: "var(--label-secondary)", textAlign: "center" }}>
              We use these details only to respond to your request. See our{" "}
              <Link href="/privacy" style={{ color: "var(--tint-text)", textDecoration: "none", fontWeight: 600 }}>privacy policy</Link>.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} className="t-footnote" style={{ fontWeight: 600, color: "var(--label-secondary)" }}>{label}</label>
      {children}
      <AnimatePresence initial={false}>
        {error && (
          <motion.span id={`${id}-error`} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring.snappy} style={{ fontSize: 12, color: "var(--red)" }}>
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
