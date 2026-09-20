import { NextRequest, NextResponse } from "next/server";
import { raw } from "@/lib/db";
import { withErrors } from "@/lib/api-handler";
import { requirePlatformAdmin } from "@/app/api/platform/tenants/route";
import { SUPPORT_CHANNELS } from "@/lib/platform-support";

export const POST = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requirePlatformAdmin(request);
  if (!admin) return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 });

  const { id } = await params;
  const staffId = admin.id;
  if (!staffId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { body: content, isInternal } = body;
  
  if (typeof content !== "string" || !content.trim() || content.length > 8000 || (isInternal !== undefined && typeof isInternal !== "boolean")) {
    return NextResponse.json({ error: "Body is required" }, { status: 400 });
  }

  const existingTicket = await raw.supportTicket.findUnique({ where: { id } });
  if (!existingTicket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const reply = await raw.$transaction(async tx => {
    // A visible owner reply atomically takes over so AI cannot answer over it.
    if (!isInternal && existingTicket.tenantId === null && SUPPORT_CHANNELS.includes(existingTicket.channel)) {
      const active = await tx.supportTicket.updateMany({ where: { id, status: { notIn: ["RESOLVED", "CLOSED"] } }, data: { assignedStaffId: admin.id, status: "IN_PROGRESS" } });
      if (!active.count) return null;
    }
    return tx.supportTicketReply.create({
    data: {
      ticketId: id,
      staffId: staffId,
      body: content,
      isInternal: !!isInternal,
    },
    });
  });

  if (!reply) return NextResponse.json({ error: "Reopen the ticket before replying" }, { status: 409 });

  return NextResponse.json({ reply }, { status: 201 });
});
