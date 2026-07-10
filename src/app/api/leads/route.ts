import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db/prisma";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const leads = await prisma.lead.findMany({
      where: {
        AND: [
          { vdp_url: { not: null } },
          { vdp_url: { not: "#" } },
          { photo_url: { not: null } },
          { NOT: [{ vin: { startsWith: "SPOTR-" } }, { vin: { startsWith: "LIVE-" } }] },
          { NOT: { photo_url: { contains: "images.unsplash.com" } } },
        ],
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(leads);
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { leadId, stage } = await request.json();

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: { stage }
    });

    return NextResponse.json(updatedLead);
  } catch (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}
