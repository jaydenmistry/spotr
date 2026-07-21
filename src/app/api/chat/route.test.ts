// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(() => Promise.resolve({ user: { email: "admin@spotr.com" } })),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    lead: {
      findUnique: vi.fn((args) => {
        if (args.where.id === "lead-1") {
          return Promise.resolve({
            id: "lead-1",
            year: 2021,
            make: "Porsche",
            model: "911",
            price: 120000,
            miles: 15000,
            city: "Atlanta",
            state: "GA",
            sellerName: "Alex Dealer",
            listingTitle: "2021 Porsche 911",
          });
        }
        return Promise.resolve(null);
      }),
    },
    message: {
      findMany: vi.fn(() => Promise.resolve([])),
      create: vi.fn((args) =>
        Promise.resolve({
          id: "msg-" + Math.random(),
          createdAt: new Date().toISOString(),
          ...args.data,
        })
      ),
    },
  },
}));

describe("Chat API Route (/api/chat)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/chat returns lead messages or creates initial greeting", async () => {
    const req = new Request("http://localhost:3000/api/chat?leadId=lead-1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.messages).toBeDefined();
    expect(data.sellerName).toBe("Alex Dealer");
  });

  it("GET /api/chat returns 404 for non-existent lead", async () => {
    const req = new Request("http://localhost:3000/api/chat?leadId=unknown-lead");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("POST /api/chat creates user message and returns seller response", async () => {
    const req = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: "lead-1",
        message: "Hi, is this car still available?",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.userMessage.content).toBe("Hi, is this car still available?");
    expect(data.sellerMessage.content).toBeDefined();
  });
});
