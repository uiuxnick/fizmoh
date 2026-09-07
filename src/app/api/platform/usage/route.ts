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
    const currentMonth = new Date().toISOString().slice(0, 7);

    const [tenants, usageRecords, contactCounts] = await Promise.all([
      raw.tenant.findMany({
        select: {
          id: true,
          name: true,
          status: true,
          members: { select: { id: true } },
          subscriptions: {
            where: { status: { in: ["ACTIVE", "TRIALING"] } },
            include: { plan: { select: { limits: true } } },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      raw.usageCounter.findMany({
        where: { period: currentMonth },
      }),
      raw.customer.groupBy({
        by: ["tenantId"],
        _count: { id: true },
      }).catch(() => []),
    ]);

    const contactMap = new Map<string, number>();
    for (const c of contactCounts as any[]) {
      if (c.tenantId) contactMap.set(c.tenantId, c._count.id);
    }

    const usages = tenants.map(t => {
      const tenantUsage = usageRecords.filter(u => u.tenantId === t.id);
      const messagesUsed = tenantUsage.find(u => u.metric === "MESSAGES")?.used || 0;
      const campaignsUsed = tenantUsage.find(u => u.metric === "CAMPAIGNS")?.used || 0;
      const aiRepliesUsed = tenantUsage.find(u => u.metric === "AI_REPLIES")?.used || 0;
      const staffUsed = t.members?.length || 0;
      const contactsUsed = contactMap.get(t.id) || 0;

      const limits = (t.subscriptions?.[0]?.plan?.limits as Record<string, number>) || {};
      const messagesLimit = limits.messagesPerMonth || limits.messages || 5000;
      const campaignsLimit = limits.campaigns || 10;
      const aiRepliesLimit = limits.aiReplies || 1000;
      const staffLimit = limits.staff || 5;
      const contactsLimit = limits.contacts || 1000;

      const messagePercent = messagesLimit > 0 ? (messagesUsed / messagesLimit) * 100 : 0;
      const contactPercent = contactsLimit > 0 ? (contactsUsed / contactsLimit) * 100 : 0;
      const usagePercent = Math.round(Math.max(messagePercent, contactPercent));

      return {
        tenantId: t.id,
        tenantName: t.name,
        messagesUsed,
        messagesLimit,
        campaignsUsed,
        campaignsLimit,
        aiRepliesUsed,
        aiRepliesLimit,
        staffUsed,
        staffLimit,
        contactsUsed,
        contactsLimit,
        usagePercent,
      };
    });

    return NextResponse.json({ usages, data: usages });
  } catch (error) {
    throw error;
  }
});
