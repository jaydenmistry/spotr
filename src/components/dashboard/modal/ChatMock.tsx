"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export default function ChatMock({
  leadId,
  sellerName,
}: {
  leadId: string;
  sellerName: string | null;
}) {
  const [messages, setMessages] = useState([
    { id: 1, role: "system", content: "Lead matched via Spotr AI." },
  ]);
  const [input, setInput] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMsg = { id: Date.now(), role: "user", content: input };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "seller",
          content:
            "Hi! Yes, I'm open to dealer offers if the price is right. Are you able to come see it today?",
        },
      ]);
    }, 1500);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: 420,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        overflow: "hidden",
        background: "var(--bg-card)",
      }}
    >
      {/* Chat header */}
      <div
        style={{
          padding: "13px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <h4 style={{ fontSize: 14, fontWeight: 700, color: "#f0f4ff" }}>
          Chat with {sellerName || "Seller"}
        </h4>
        <p style={{ fontSize: 11, color: "#4a5670", marginTop: 2 }}>Mock SMS Interface</p>
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
                maxWidth: "75%",
                borderRadius: 12,
                padding: "9px 14px",
                fontSize: 13,
                ...(msg.role === "user"
                  ? {
                      background: "linear-gradient(135deg, #ff7a1a, #f59e0b)",
                      color: "#fff",
                      fontWeight: 600,
                    }
                  : msg.role === "system"
                  ? {
                      background: "rgba(255,255,255,0.05)",
                      color: "#4a5670",
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
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        style={{
          padding: "12px 14px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          gap: 10,
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            padding: "9px 14px",
            fontSize: 13,
            color: "#f0f4ff",
            outline: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#ff7a1a")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
        />
        <button
          type="submit"
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(135deg, #ff7a1a, #f59e0b)",
            border: "none",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Send style={{ width: 16, height: 16, color: "#fff" }} />
        </button>
      </form>
    </div>
  );
}
