import { NextRequest, NextResponse } from "next/server";
import { raw } from "@/lib/db";
import { withErrors } from "@/lib/api-handler";
import { requirePlatformAdmin } from "@/app/api/platform/tenants/route";

export const dynamic = "force-dynamic";

export const POST = withErrors(async (request: NextRequest) => {
  const admin = await requirePlatformAdmin(request);
  if (!admin) return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const { tenantId, amountOmr, reason, messageAllowance } = body;
  if (!tenantId) return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
  if (!amountOmr && !messageAllowance) {
    return NextResponse.json({ error: "Must specify amount in OMR or extra message allowance" }, { status: 400 });
  }

  const tenant = await raw.tenant.findUnique({
    where: { id: tenantId },
    include: { subscriptions: { where: { status: "ACTIVE" }, take: 1 } },
  });
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  // Record immutable platform audit event for credit / goodwill grant
  const auditEvent = await raw.platformAuditEvent.create({
    data: {
      tenantId: tenant.id,
      actorStaffId: admin.id,
      action: "GRANT_SERVICE_CREDIT",
      entity: "TenantCredit",
      entityId: tenant.id,
      before: {} as any,
      after: {
        grantedAmountOmr: Number(amountOmr || 0),
        messageAllowanceBonus: Number(messageAllowance || 0),
        grantedBy: admin.name,
      } as any,
      reason: reason || "Platform operator goodwill credit grant",
    },
  });

  return NextResponse.json({
    success: true,
    message: `Granted ${amountOmr ? `${amountOmr} OMR credit` : ""}${amountOmr && messageAllowance ? " and " : ""}${messageAllowance ? `${messageAllowance} extra messages` : ""} to ${tenant.name}`,
    auditEventId: auditEvent.id,
  });
});
