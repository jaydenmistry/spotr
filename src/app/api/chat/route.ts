import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db/prisma";
import { authOptions } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CHAT_MESSAGE_MAX_LENGTH = 1000;

// Gemini models in fallback order
const PREFERRED_MODELS = [
  "models/gemini-3.6-flash",
  "models/gemini-flash-latest",
  "models/gemini-2.0-flash",
];

async function callGeminiApi(
  systemPrompt: string,
  conversation: Array<{ role: "user" | "seller"; text: string }>
) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured in environment");
  }

  // Format history for Gemini API
  const contents = [
    {
      role: "user",
      parts: [{ text: `[SYSTEM INSTRUCTION]\n${systemPrompt}` }],
    },
    {
      role: "model",
      parts: [{ text: "Understood. I am ready to roleplay as the car seller." }],
    },
    ...conversation.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    })),
  ];

  let lastError: Error | null = null;

  for (const model of PREFERRED_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent`,
        {
          method: "POST",
          // Key in a header, not the URL, so it never lands in proxy/access logs.
          headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
          body: JSON.stringify({ contents }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return text.trim();
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Gemini API call failed");
    }
  }

  throw lastError || new Error("All Gemini models failed to respond");
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("leadId");

  if (!leadId) {
    return NextResponse.json({ error: "leadId is required" }, { status: 400 });
  }

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        year: true,
        make: true,
        model: true,
        price: true,
        sellerName: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    let messages = await prisma.message.findMany({
      where: { leadId },
      orderBy: { createdAt: "asc" },
    });

    // Seed initial greeting if chat is empty
    if (messages.length === 0) {
      const seller = lead.sellerName || "Seller";
      const carName = [lead.year, lead.make, lead.model].filter(Boolean).join(" ") || "vehicle";
      const greeting = `Hi! Thanks for reaching out regarding my ${carName}. I'm open to dealer offers if the price is right. What questions do you have?`;

      const initialMessage = await prisma.message.create({
        data: {
          leadId,
          role: "seller",
          content: greeting,
        },
      });

      messages = [initialMessage];
    }

    return NextResponse.json({ messages, sellerName: lead.sellerName });
  } catch (error) {
    console.error("Failed to fetch chat messages:", error);
    return NextResponse.json({ error: "Failed to fetch chat messages" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Each message is a metered Gemini call (with model fallbacks), so throttle it.
  if (!rateLimit(`chat:${clientIp(request.headers)}`, 30, 60 * 1000)) {
    return NextResponse.json({ error: "Too many messages. Try again in a minute." }, { status: 429 });
  }

  let body: { leadId?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { leadId, message } = body;

  if (!leadId || typeof leadId !== "string") {
    return NextResponse.json({ error: "leadId is required" }, { status: 400 });
  }

  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "message content is required" }, { status: 400 });
  }

  if (message.length > CHAT_MESSAGE_MAX_LENGTH) {
    return NextResponse.json({ error: `Keep messages under ${CHAT_MESSAGE_MAX_LENGTH} characters.` }, { status: 400 });
  }

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        year: true,
        make: true,
        model: true,
        price: true,
        miles: true,
        city: true,
        state: true,
        sellerName: true,
        listingTitle: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // 1. Save user message to database
    const userMessage = await prisma.message.create({
      data: {
        leadId,
        role: "user",
        content: message.trim(),
      },
    });

    // 2. Fetch conversation history for prompt context
    const existingMessages = await prisma.message.findMany({
      where: { leadId },
      orderBy: { createdAt: "asc" },
      take: 12,
    });

    const conversationHistory = existingMessages.map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("seller" as const),
      text: m.content,
    }));

    // 3. Formulate system prompt for Gemini
    const seller = lead.sellerName || "Private Seller";
    const carTitle = lead.listingTitle || [lead.year, lead.make, lead.model].filter(Boolean).join(" ") || "vehicle";
    const priceText = lead.price ? `$${lead.price.toLocaleString("en-US")}` : "asking price unlisted";
    const milesText = lead.miles ? `${lead.miles.toLocaleString("en-US")} miles` : "mileage unlisted";
    const locationText = [lead.city, lead.state].filter(Boolean).join(", ") || "unlisted location";

    const systemPrompt = `You are roleplaying as ${seller}, a private seller selling your vehicle:
- Vehicle: ${carTitle}
- Asking Price: ${priceText}
- Mileage: ${milesText}
- Location: ${locationText}

The user chatting with you is a used car buyer / dealership acquisitions manager evaluating or making an offer on your vehicle.
Guidelines:
- Respond realistically as the seller in a natural SMS/text chat tone.
- Be open to reasonable dealer offers, inspection arrangements, or title questions, but do not give the car away for free.
- Keep your response concise (1 to 3 short sentences max).
- Stay in character at all times. Never mention AI, LLMs, or Gemini.`;

    // 4. Generate AI seller response via Gemini API
    let sellerContent = "";
    try {
      sellerContent = await callGeminiApi(systemPrompt, conversationHistory);
    } catch (aiError) {
      console.error("Gemini API error:", aiError);
      sellerContent = "Thanks for the message! I'm around today if you want to inspect the vehicle or make an offer.";
    }

    // 5. Save AI seller response to database
    const sellerMessage = await prisma.message.create({
      data: {
        leadId,
        role: "seller",
        content: sellerContent,
      },
    });

    return NextResponse.json({
      success: true,
      userMessage,
      sellerMessage,
    });
  } catch (error) {
    console.error("Error in chat POST route:", error);
    return NextResponse.json({ error: "Failed to process chat message" }, { status: 500 });
  }
}
