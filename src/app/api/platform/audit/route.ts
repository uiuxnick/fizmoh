import { NextRequest, NextResponse } from "next/server";
import { raw } from "@/lib/db";
import { withErrors } from "@/lib/api-handler";
import { requirePlatformAdmin } from "@/app/api/platform/tenants/route";

export const GET = withErrors(async (request: NextRequest) => {
  const admin = await requirePlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const tenantId = searchParams.get("tenantId");
    const action = searchParams.get("action");
    const entity = searchParams.get("entity");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (action && action !== "ALL") where.action = { contains: action, mode: "insensitive" };
    if (entity && entity !== "ALL") where.entity = { contains: entity, mode: "insensitive" };
    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { entity: { contains: search, mode: "insensitive" } },
        { entityId: { contains: search, mode: "insensitive" } },
        { reason: { contains: search, mode: "insensitive" } },
      ];
    }

    const events = await raw.platformAuditEvent.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const actorStaffIds = Array.from(new Set(events.map(e => e.actorStaffId).filter(Boolean))) as string[];
    const staffList = actorStaffIds.length > 0
      ? await raw.staff.findMany({
          where: { id: { in: actorStaffIds } },
          select: { id: true, name: true, email: true },
        }).catch(() => [])
      : [];
    const staffMap = new Map(staffList.map(s => [s.id, s.name || s.email]));

    const formattedEvents = events.map(e => ({
      ...e,
      actorName: e.actorStaffId ? staffMap.get(e.actorStaffId) || e.actorStaffId : "System",
    }));

    const total = await raw.platformAuditEvent.count({ where });

    return NextResponse.json({
      events: formattedEvents,
      data: formattedEvents,
      total,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    throw error;
  }
});
