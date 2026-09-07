import { NextRequest, NextResponse } from "next/server";
import { raw } from "@/lib/db";
import { withErrors } from "@/lib/api-handler";
import { requirePlatformAdmin } from "@/app/api/platform/tenants/route";

export const GET = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requirePlatformAdmin(request);
  if (!admin) return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 });

  const { id } = await params;
  const ticket = await raw.supportTicket.findUnique({
    where: { id },
    include: { replies: { orderBy: { createdAt: "asc" } } },
  });

  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const staffIds = [
    ticket.createdById,
    ticket.assignedStaffId,
    ...ticket.replies.map(r => r.staffId)
  ].filter(Boolean) as string[];

  const [tenant, staffMembers] = await Promise.all([
    ticket.tenantId ? raw.tenant.findUnique({ where: { id: ticket.tenantId }, select: { id: true, name: true, slug: true } }) : null,
    raw.staff.findMany({ where: { id: { in: [...new Set(staffIds)] } }, select: { id: true, name: true } })
  ]);

  const staffMap = Object.fromEntries(staffMembers.map((s: any) => [s.id, s.name]));

  return NextResponse.json({
    ticket: {
      ...ticket,
      tenant,
      creatorName: staffMap[ticket.createdById] || "Unknown",
      assigneeName: ticket.assignedStaffId ? staffMap[ticket.assignedStaffId] : null,
      replies: ticket.replies.map(r => ({
        ...r,
        staffName: staffMap[r.staffId] || "Unknown",
      }))
    }
  });
});

export const PATCH = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requirePlatformAdmin(request);
  if (!admin) return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 });

  const { id } = await params;
  const staffId = request.headers.get("x-wptour-staff-id");

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { status, priority, assignedStaffId, resolvedAt, closedAt } = body;
  
  const existingTicket = await raw.supportTicket.findUnique({ where: { id } });
  if (!existingTicket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const updatedTicket = await raw.$transaction(async tx => {
    const ticket = await tx.supportTicket.update({
      where: { id },
      data: {
        status: status !== undefined ? status : existingTicket.status,
        priority: priority !== undefined ? priority : existingTicket.priority,
        assignedStaffId: assignedStaffId !== undefined ? assignedStaffId : existingTicket.assignedStaffId,
        resolvedAt: resolvedAt !== undefined ? (resolvedAt ? new Date(resolvedAt) : null) : existingTicket.resolvedAt,
        closedAt: closedAt !== undefined ? (closedAt ? new Date(closedAt) : null) : existingTicket.closedAt,
      },
    });

    await tx.platformAuditEvent.create({
      data: {
        tenantId: ticket.tenantId,
        actorStaffId: staffId,
        action: "UPDATE_SUPPORT_TICKET",
        entity: "SupportTicket",
        entityId: ticket.id,
        before: {
          status: existingTicket.status,
          priority: existingTicket.priority,
          assignedStaffId: existingTicket.assignedStaffId,
          resolvedAt: existingTicket.resolvedAt,
          closedAt: existingTicket.closedAt,
        } as any,
        after: {
          status: ticket.status,
          priority: ticket.priority,
          assignedStaffId: ticket.assignedStaffId,
          resolvedAt: ticket.resolvedAt,
          closedAt: ticket.closedAt,
        } as any
      }
    });

    return ticket;
  });

  return NextResponse.json({ ticket: updatedTicket });
});
