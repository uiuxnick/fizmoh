import { NextRequest, NextResponse } from "next/server";
import { db, raw } from "@/lib/db";
import { withErrors } from "@/lib/api-handler";
import { currentTenant } from "@/lib/tenant";
import { sessionFromRequest } from "@/lib/auth";
import { supportReference } from "@/lib/platform-support";

export const GET = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant();
  const session = await sessionFromRequest(request);
  if (!tenant?.tenantId || session?.kind !== "staff" || tenant.staffId !== session.staffId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where: { tenantId: string; status?: string } = { tenantId: tenant.tenantId };
  if (status) where.status = status;

  const tickets = await db.supportTicket.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { replies: { where: { isInternal: false }, orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({ tickets });
});

export const POST = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant();
  const session = await sessionFromRequest(request);
  if (!tenant?.tenantId || session?.kind !== "staff" || tenant.staffId !== session.staffId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const staffId = session.staffId;
  if (!staffId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { subject, body: content, priority, conversationId } = body;
  if (typeof subject !== "string" || !subject.trim() || subject.length > 160 || typeof content !== "string" || !content.trim() || content.length > 8000 || (priority && !["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority))) {
    return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
  }

  if (conversationId && (typeof conversationId !== "string" || !await raw.conversation.findFirst({ where: { id: conversationId, tenantId: tenant.tenantId }, select: { id: true } }))) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  const reference = supportReference();

  const ticket = await db.supportTicket.create({
    data: {
      tenantId: tenant.tenantId,
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
