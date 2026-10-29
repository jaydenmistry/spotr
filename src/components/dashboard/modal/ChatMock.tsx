"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, FlaskConical } from "lucide-react";
import { spring } from "@/lib/motion";

interface MessageItem {
  id: string | number;
  role: "user" | "seller" | "system";
  content: string;
  createdAt?: string;
}

interface ChatResponse {
  messages: Array<{
    id: string;
    role: "user" | "seller";
    content: string;
    createdAt: string;
  }>;
  sellerName: string | null;
}

/**
 * Practice chat against an AI roleplay of the seller (Gemini, via /api/chat).
 * Nothing here reaches the real seller, and the UI must say so. Remount per
 * lead (key={leadId}) rather than resetting state in an effect.
 */
export default function ChatMock({
  leadId,
  sellerName,
}: {
  leadId: string;
  sellerName: string | null;
}) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
  };

  useEffect(() => {
    let active = true;

    axios
      .get<ChatResponse>(`/api/chat?leadId=${leadId}`)
      .then((res) => {
        if (!active) return;
        const loaded: MessageItem[] = res.data.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "seller",
          content: m.content,
          createdAt: m.createdAt,
        }));
        setMessages(loaded);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load chat", err);
        setError("Couldn't load the practice chat. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [leadId]);

  useEffect(() => {
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, sending]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const messageText = input.trim();
    if (!messageText || sending) return;

    const tempUserMsg: MessageItem = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: messageText,
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const res = await axios.post<{
        success: boolean;
        userMessage: MessageItem;
        sellerMessage: MessageItem;
      }>("/api/chat", {
        leadId,
        message: messageText,
      });

      if (res.data.success) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          res.data.userMessage,
          res.data.sellerMessage,
        ]);
      }
    } catch (err) {
      console.error("Failed to send message", err);
      setError("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const displayName = sellerName || "Seller";

  const canSend = !loading && !sending && Boolean(input.trim());

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "min(560px, 62vh)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--separator)",
        overflow: "hidden",
        background: "var(--bg-card)",
      }}
    >
      {/* Header */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--separator)", display: "flex", alignItems: "center", gap: 12 }}>
        <span
          aria-hidden="true"
          style={{ width: 36, height: 36, borderRadius: 999, display: "grid", placeItems: "center", flexShrink: 0, background: "var(--fill)", color: "var(--label-secondary)", fontWeight: 600, fontSize: 14 }}
        >
          {displayName[0]?.toUpperCase()}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 className="t-headline" style={{ color: "var(--label)" }}>Practice chat · {displayName}</h4>
          <p className="t-footnote" style={{ color: "var(--label-secondary)", marginTop: 1 }}>
            An AI roleplay of the seller for rehearsing outreach. Messages are not sent to the real seller.
          </p>
        </div>
        <span
          style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 999, background: "rgba(var(--yellow-rgb), 0.14)", fontSize: 12, fontWeight: 600, color: "var(--yellow)", flexShrink: 0 }}
        >
          <FlaskConical size={13} aria-hidden="true" />
          Simulated
        </span>
      </div>

      {/* Messages */}
      <div
        role="log"
        aria-live="polite"
        aria-label={`Practice conversation with simulated ${displayName}`}
        style={{ flex: 1, overflowY: "auto", padding: "18px 16px", display: "flex", flexDirection: "column", gap: 6 }}
      >
        {loading ? (
          <div aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="t-footnote" style={{ color: "var(--label-secondary)" }}>Loading practice chat…</span>
            <div className="skeleton" style={{ width: "55%", height: 38, borderRadius: 18 }} />
            <div className="skeleton" style={{ width: "40%", height: 38, borderRadius: 18, alignSelf: "flex-end" }} />
            <div className="skeleton" style={{ width: "62%", height: 38, borderRadius: 18 }} />
          </div>
        ) : (
          <>
            {messages.length === 0 && !error && (
              <p className="t-footnote" style={{ margin: "auto", textAlign: "center", color: "var(--label-secondary)", maxWidth: 320 }}>
                Try an opener — ask about service history, title status, or whether the price has room.
              </p>
            )}
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const mine = msg.role === "user";
                return (
                  <motion.div
                    key={msg.id}
                    layout="position"
                    initial={{ opacity: 0, y: 14, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={spring.bouncy}
                    style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", transformOrigin: mine ? "bottom right" : "bottom left" }}
                  >
                    <div
                      style={{
                        maxWidth: "78%",
                        padding: "9px 14px",
                        fontSize: 14,
                        lineHeight: 1.45,
                        borderRadius: 20,
                        borderBottomRightRadius: mine ? 6 : 20,
                        borderBottomLeftRadius: mine ? 20 : 6,
                        ...(mine
                          ? { background: "var(--tint-strong)", color: "#fff" }
                          : { background: "rgba(var(--ink-rgb), 0.08)", color: "var(--label)" }),
                      }}
                    >
                      <span className="sr-only">{mine ? "You: " : `Simulated ${displayName}: `}</span>
                      {msg.content}
                    </div>
                  </motion.div>
                );
              })}

              {sending && (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={spring.snappy}
                  style={{ display: "flex", justifyContent: "flex-start", transformOrigin: "bottom left" }}
                >
                  <div
                    role="status"
                    style={{ display: "flex", gap: 4, padding: "13px 16px", borderRadius: 20, borderBottomLeftRadius: 6, background: "rgba(var(--ink-rgb), 0.08)" }}
                  >
                    <span className="sr-only">Simulated {displayName} is typing</span>
                    {[0, 1, 2].map((i) => (
                      <span key={i} aria-hidden="true" className="typing-dot" style={{ animationDelay: `${i * 140}ms` }} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Outside the log so it's announced once, as an alert. */}
      {error && (
        <p role="alert" style={{ alignSelf: "center", margin: "0 0 8px", padding: "6px 12px", borderRadius: 999, background: "rgba(var(--red-rgb), 0.1)", color: "var(--red)", fontSize: 12 }}>
          {error}
        </p>
      )}

      {/* Composer */}
      <form onSubmit={handleSend} style={{ padding: "10px 12px", borderTop: "1px solid var(--separator)", display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Practice message…"
          aria-label={`Practice message to simulated ${displayName}`}
          disabled={loading}
          className="field"
          style={{ flex: 1, height: 40, borderRadius: 999, padding: "0 16px", fontSize: 14 }}
        />
        <motion.button
          type="submit"
          aria-label="Send practice message"
          disabled={!canSend}
          className="pressable"
          animate={{ scale: canSend ? 1 : 0.86, opacity: canSend ? 1 : 0.45 }}
          transition={spring.bouncy}
          style={{ width: 36, height: 36, borderRadius: 999, display: "grid", placeItems: "center", flexShrink: 0, border: "none", background: "var(--tint-strong)", color: "#fff", cursor: canSend ? "pointer" : "not-allowed" }}
        >
          <ArrowUp size={18} strokeWidth={2.6} />
        </motion.button>
      </form>
    </div>
  );
}
