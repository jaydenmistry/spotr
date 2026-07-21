"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Bot, Send, Sparkles, User } from "lucide-react";

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    axios
      .get<ChatResponse>(`/api/chat?leadId=${leadId}`)
      .then((res) => {
        if (!active) return;
        const loaded: MessageItem[] = [
          { id: "sys-start", role: "system", content: "AI Seller Chat connected via Gemini API." },
          ...res.data.messages.map((m) => ({
            id: m.id,
            role: m.role as "user" | "seller",
            content: m.content,
            createdAt: m.createdAt,
          })),
        ];
        setMessages(loaded);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load chat", err);
        setError("Unable to connect to seller chat. Please try again.");
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: 480,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        overflow: "hidden",
        background: "var(--bg-card)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "13px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(255,255,255,0.02)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: "#f0f4ff", display: "flex", alignItems: "center", gap: 6 }}>
            <span>Chat with {displayName}</span>
          </h4>
          <p style={{ fontSize: 11, color: "#8b9ab8", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
            <Sparkles style={{ width: 11, height: 11, color: "#ff9147" }} />
            Powered by Gemini AI Seller Simulation
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 6, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", fontSize: 11, color: "#34d399", fontWeight: 600 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} />
          Online
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {loading ? (
          <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "#8b9ab8", fontSize: 13, gap: 8 }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,122,26,0.2)", borderTopColor: "#ff7a1a", animation: "spin 0.8s linear infinite" }} />
            Loading seller chat history…
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  justifyContent:
                    msg.role === "user"
                      ? "flex-end"
                      : msg.role === "system"
                      ? "center"
                      : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    borderRadius: 12,
                    padding: "10px 14px",
                    fontSize: 13,
                    lineHeight: 1.5,
                    ...(msg.role === "user"
                      ? {
                          background: "linear-gradient(135deg, #ff7a1a, #f59e0b)",
                          color: "#fff",
                          fontWeight: 600,
                        }
                      : msg.role === "system"
                      ? {
                          background: "rgba(255,255,255,0.04)",
                          color: "#8b9ab8",
                          fontSize: 11,
                          border: "1px solid rgba(255,255,255,0.06)",
                        }
                      : {
                          background: "rgba(255,255,255,0.08)",
                          color: "#f0f4ff",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }),
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {sending && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: 12,
                    padding: "8px 14px",
                    fontSize: 12,
                    color: "#ff9147",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    border: "1px solid rgba(255,122,26,0.2)",
                  }}
                >
                  <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(255,122,26,0.3)", borderTopColor: "#ff7a1a", animation: "spin 0.8s linear infinite" }} />
                  {displayName} is typing…
                </div>
              </div>
            )}

            {error && (
              <div style={{ textAlign: "center", color: "#f87171", fontSize: 12, padding: "4px 8px" }}>
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        style={{
          padding: "12px 14px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          gap: 10,
          background: "rgba(255,255,255,0.01)",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Message ${displayName}…`}
          disabled={loading || sending}
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 13,
            color: "#f0f4ff",
            outline: "none",
            opacity: loading || sending ? 0.6 : 1,
          }}
          onFocus={(e) => (e.target.style.borderColor = "#ff7a1a")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
        />
        <button
          type="submit"
          disabled={loading || sending || !input.trim()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            display: "grid",
            placeItems: "center",
            background: loading || sending || !input.trim() ? "rgba(255,122,26,0.3)" : "linear-gradient(135deg, #ff7a1a, #f59e0b)",
            border: "none",
            cursor: loading || sending || !input.trim() ? "not-allowed" : "pointer",
            flexShrink: 0,
            transition: "all 0.15s",
          }}
        >
          <Send style={{ width: 16, height: 16, color: "#fff" }} />
        </button>
      </form>
    </div>
  );
}
