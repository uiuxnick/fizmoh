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
    const mrrTotalResult = await raw.$queryRaw`SELECT SUM(p."priceMonthly") as total FROM "Subscription" s JOIN "Plan" p ON s."planId" = p.id WHERE s.status = 'ACTIVE'`.catch(() => [{ total: 0 }]);
    const mrrTrendResult = await raw.$queryRaw`
      SELECT date_trunc('month', "paidAt") as month, SUM(amount) as amount 
      FROM "SubscriptionInvoice" 
      WHERE status='PAID' AND "paidAt" >= NOW() - INTERVAL '6 months' 
      GROUP BY month 
      ORDER BY month ASC
    `.catch(() => []);

    const activeTenantsCount = await raw.tenant.count({ where: { status: "ACTIVE" } }).catch(() => 0);
    const totalTenantsCount = await raw.tenant.count().catch(() => 0);

    const tenantGrowthResult = await raw.$queryRaw`
      SELECT date_trunc('month', "createdAt") as month, COUNT(*) as count 
      FROM "Tenant" 
      WHERE "createdAt" >= NOW() - INTERVAL '12 months' 
      GROUP BY month 
      ORDER BY month ASC
    `.catch(() => []);

    const messagesLast30dResult = await raw.$queryRaw`
      SELECT COUNT(*) as count 
      FROM "Message" 
      WHERE "createdAt" > NOW() - INTERVAL '30 days'
    `.catch(() => [{ count: 0 }]);

    const messageVolumeResult = await raw.$queryRaw`
      SELECT date_trunc('day', "createdAt") as date, COUNT(*) as count 
      FROM "Message" 
      WHERE "createdAt" > NOW() - INTERVAL '30 days' 
      GROUP BY date 
      ORDER BY date ASC
    `.catch(() => []);

    const revenueLast30dResult = await raw.$queryRaw`
      SELECT SUM(amount) as total 
      FROM "SubscriptionInvoice" 
      WHERE status='PAID' AND "paidAt" > NOW() - INTERVAL '30 days'
    `.catch(() => [{ total: 0 }]);

    const pendingInvoices = await raw.subscriptionInvoice.count({ where: { status: "PENDING" } }).catch(() => 0);
    const openTickets = await raw.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }).catch(() => 0);

    const webhookFailures24hResult = await raw.$queryRaw`
      SELECT COUNT(*) as count 
      FROM "WebhookDelivery" 
      WHERE status IN ('FAILED', 'DEAD') AND "receivedAt" > NOW() - INTERVAL '24 hours'
    `.catch(() => [{ count: 0 }]);

    const recentActivity = await raw.platformAuditEvent.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
    }).catch(() => []);

    const topTenantsByRevenueResult = await raw.$queryRaw`
      SELECT t.id as "tenantId", t.name as "tenantName", SUM(p.amount) as revenue 
      FROM "Payment" p 
      JOIN "Tenant" t ON p."tenantId" = t.id 
      WHERE p.status = 'VERIFIED' 
      GROUP BY t.id, t.name 
      ORDER BY revenue DESC 
      LIMIT 10
    `.catch(() => []);

    const currentMonth = new Date().toISOString().slice(0, 7);
    const aiUsage = await raw.usageCounter.aggregate({
      _sum: { used: true },
      where: { metric: "AI_REPLIES", period: currentMonth },
    }).catch(() => ({ _sum: { used: 0 } }));

    return NextResponse.json({
      mrrTotal: Number((mrrTotalResult as any[])[0]?.total ?? 0) / 1000,
      mrrTrend: (mrrTrendResult as any[]).map((r: any) => ({ month: r.month, amount: Number(r.amount) })),
      activeTenantsCount,
      totalTenantsCount,
      tenantGrowth: (tenantGrowthResult as any[]).map((r: any) => ({ month: r.month, count: Number(r.count) })),
      messagesLast30d: Number((messagesLast30dResult as any[])[0]?.count ?? 0),
      messageVolume: (messageVolumeResult as any[]).map((r: any) => ({ date: r.date, count: Number(r.count) })),
      revenueLast30d: Number((revenueLast30dResult as any[])[0]?.total ?? 0),
      pendingInvoices,
      openTickets,
      webhookFailures24h: Number((webhookFailures24hResult as any[])[0]?.count ?? 0),
      recentActivity,
      topTenantsByRevenue: (topTenantsByRevenueResult as any[]).map((r: any) => ({
        tenantId: r.tenantId || r.name,
        tenantName: r.tenantName || r.name,
        revenue: Number(r.revenue ?? r.total ?? 0),
      })),
      aiUsage: aiUsage._sum.used ?? 0,
    });
  } catch (error) {
    throw error;
  }
});
