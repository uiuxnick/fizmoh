import { NextRequest, NextResponse } from "next/server";
import { raw } from "@/lib/db";
import { withErrors } from "@/lib/api-handler";
import { currentTenant } from "@/lib/tenant";

export const GET = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant();
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();

  const tenantRow = await raw.tenant.findUnique({
    where: { id: tenant.tenantId },
    include: { subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 1 } }
  });

  const planSlug = tenantRow?.subscriptions[0]?.plan?.slug;

  const announcements = await raw.platformAnnouncement.findMany({
    where: {
      publishedAt: { lte: now },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } }
      ]
    },
    orderBy: { publishedAt: "desc" }
  });

  const active = announcements.filter(a => {
    if (a.targetAudience === "ALL") return true;
    try {
      const audiences = JSON.parse(a.targetAudience);
      if (Array.isArray(audiences)) {
        return audiences.includes(tenant.tenantId) || (planSlug && audiences.includes(planSlug));
      }
    } catch {
      // Return false if invalid JSON or not array
    }
    return false;
  });

  return NextResponse.json({ announcements: active });
});
