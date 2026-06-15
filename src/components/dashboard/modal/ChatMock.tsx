"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export default function ChatMock({ leadId, sellerName }: { leadId: string, sellerName: string | null }) {
  const [messages, setMessages] = useState([
    { id: 1, role: "system", content: "Lead matched via Spotr AI." },
  ]);
  const [input, setInput] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const newMsg = { id: Date.now(), role: "user", content: input };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");

    // Mock seller reply
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "seller",
          content: "Hi! Yes, I'm open to dealer offers if the price is right. Are you able to come see it today?",
        },
      ]);
    }, 1500);
  };

  return (
    <div className="flex h-[400px] flex-col rounded-lg border border-gray-200">
      <div className="border-b border-gray-200 bg-gray-50 p-3">
        <h4 className="font-medium text-gray-900">Chat with {sellerName || "Seller"}</h4>
        <p className="text-xs text-gray-500">Mock SMS Interface</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.role === "user" ? "justify-end" : msg.role === "system" ? "justify-center" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[75%] rounded-lg px-4 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : msg.role === "system"
                  ? "bg-gray-100 text-gray-500 text-xs text-center"
                  : "bg-gray-200 text-gray-900"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="border-t border-gray-200 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-blue-600 p-2 text-white hover:bg-blue-700"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
