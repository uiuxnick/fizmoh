import { NextRequest, NextResponse } from "next/server";
import { raw } from "@/lib/db";
import { withErrors } from "@/lib/api-handler";
import { requirePlatformAdmin } from "@/app/api/platform/tenants/route";
import { supportReference, supportAuthor, SUPPORT_CHANNELS } from "@/lib/platform-support";
import { Prisma } from "@prisma/client";

export const GET = withErrors(async (request: NextRequest) => {
  const admin = await requirePlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const tenantId = searchParams.get("tenantId");
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "20");
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || !Number.isInteger(limit) || limit < 1 || limit > 100) return NextResponse.json({ error: "Invalid pagination" }, { status: 400 });
  const skip = (page - 1) * limit;

  const where: Prisma.SupportTicketWhereInput = {};
  if (searchParams.get("mode") === "live") { where.tenantId = null; where.channel = { in: SUPPORT_CHANNELS }; }
  if (status && status !== "ALL") where.status = status;
  if (priority && priority !== "ALL") where.priority = priority;
  if (tenantId && tenantId !== "ALL") where.tenantId = tenantId;
  const search = searchParams.get("search")?.trim().slice(0, 160);
  if (search) where.OR = [{ subject: { contains: search, mode: "insensitive" } }, { reference: { contains: search, mode: "insensitive" } }];

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
    creatorName: staffMap[t.createdById] || supportAuthor(t.createdById),
    assigneeName: t.assignedStaffId ? staffMap[t.assignedStaffId] : null,
  }));

  return NextResponse.json({ tickets: enrichedTickets, total, page, limit });
});

export const POST = withErrors(async (request: NextRequest) => {
  const admin = await requirePlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 });
  }

  const staffId = admin.id;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { tenantId, subject, body: content, priority, channel } = body;
  
  if (typeof subject !== "string" || !subject.trim() || subject.length > 160 || typeof content !== "string" || !content.trim() || content.length > 8000 || (priority && !["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority))) {
    return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
  }

  // Generate reference
  const reference = supportReference();

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
