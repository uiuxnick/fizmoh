import { NextRequest, NextResponse } from "next/server";
import { db, raw } from "@/lib/db";
import { withErrors } from "@/lib/api-handler";
import { currentTenant } from "@/lib/tenant";

export const GET = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant();
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where: any = {};
  if (status) where.status = status;

  const tickets = await db.supportTicket.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { replies: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({ tickets });
});

export const POST = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant();
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const staffId = request.headers.get("x-wptour-staff-id");
  if (!staffId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { subject, body: content, priority, conversationId } = body;
  if (!subject || !content) {
    return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
  }

  const count = await raw.supportTicket.count();
  const reference = `FZ-${String(count + 1).padStart(4, "0")}`;

  const ticket = await db.supportTicket.create({
    data: {
      reference,
      subject,
      body: content,
      priority: priority || "MEDIUM",
      channel: "PLATFORM",
      createdById: staffId,
      conversationId: conversationId || null,
      status: "OPEN",
    },
  });

  return NextResponse.json({ ticket }, { status: 201 });
});
