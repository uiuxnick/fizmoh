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
    const numbers = await raw.whatsAppAccount.findMany();
    const tenantIds = Array.from(new Set(numbers.map(n => n.tenantId).filter(Boolean))) as string[];
    const tenants = tenantIds.length > 0
      ? await raw.tenant.findMany({
          where: { id: { in: tenantIds } },
          select: { id: true, name: true, slug: true },
        }).catch(() => [])
      : [];
    const tenantMap = new Map(tenants.map(t => [t.id, t.name]));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const results = await Promise.all(
      numbers.map(async (account: any) => {
        const messageCount = account.tenantId
          ? await raw.message.count({
              where: {
                tenantId: account.tenantId,
                createdAt: { gt: thirtyDaysAgo },
              },
            }).catch(() => 0)
          : 0;
        return {
          ...account,
          tenantName: account.tenantId ? tenantMap.get(account.tenantId) || "Unknown" : null,
          messageCountLast30d: messageCount,
        };
      })
    );

    return NextResponse.json({
      numbers: results,
      data: results,
    });
  } catch (error) {
    throw error;
  }
});
