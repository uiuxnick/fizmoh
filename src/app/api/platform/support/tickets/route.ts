import { NextRequest, NextResponse } from "next/server";
import { raw } from "@/lib/db";
import { withErrors } from "@/lib/api-handler";
import { requirePlatformAdmin } from "@/app/api/platform/tenants/route";

export const GET = withErrors(async (request: NextRequest) => {
  const admin = await requirePlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const tenantId = searchParams.get("tenantId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status && status !== "ALL") where.status = status;
  if (priority && priority !== "ALL") where.priority = priority;
  if (tenantId && tenantId !== "ALL") where.tenantId = tenantId;

  const [total, tickets] = await Promise.all([
    raw.supportTicket.count({ where }),
    raw.supportTicket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const tenantIds = [...new Set(tickets.map((t: any) => t.tenantId).filter(Boolean))];
  const staffIds = [...new Set(tickets.flatMap((t: any) => [t.createdById, t.assignedStaffId]).filter(Boolean))];

  const [tenants, staffMembers] = await Promise.all([
    tenantIds.length > 0 ? raw.tenant.findMany({ where: { id: { in: tenantIds as string[] } }, select: { id: true, name: true } }) : [],
    staffIds.length > 0 ? raw.staff.findMany({ where: { id: { in: staffIds as string[] } }, select: { id: true, name: true } }) : [],
  ]);

  const tenantMap = Object.fromEntries(tenants.map((t: any) => [t.id, t.name]));
  const staffMap = Object.fromEntries(staffMembers.map((s: any) => [s.id, s.name]));

  const enrichedTickets = tickets.map((t: any) => ({
    ...t,
    tenantName: t.tenantId ? tenantMap[t.tenantId] : null,
    creatorName: staffMap[t.createdById] || "Unknown",
    assigneeName: t.assignedStaffId ? staffMap[t.assignedStaffId] : null,
  }));

  return NextResponse.json({ tickets: enrichedTickets, total, page, limit });
});

export const POST = withErrors(async (request: NextRequest) => {
  const admin = await requirePlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 });
  }

  const staffId = request.headers.get("x-wptour-staff-id") || admin.id;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { tenantId, subject, body: content, priority, channel } = body;
  
  if (!subject || !content) {
    return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
  }

  // Generate reference
  const count = await raw.supportTicket.count();
  const reference = `FZ-${String(count + 1).padStart(4, "0")}`;

  const ticket = await raw.supportTicket.create({
    data: {
      tenantId: tenantId || null,
      reference,
      subject,
      body: content,
      priority: priority || "MEDIUM",
      channel: channel || "PLATFORM",
      createdById: staffId,
      status: "OPEN",
    },
  });

  return NextResponse.json({ ticket }, { status: 201 });
});
