import { NextRequest, NextResponse } from "next/server";
import { raw } from "@/lib/db";
import { withErrors } from "@/lib/api-handler";
import { requirePlatformAdmin } from "@/app/api/platform/tenants/route";

export const PATCH = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requirePlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, dunningStep, lastDunnedAt, nextDunAt, paidAt, gatewayReference } = body;

    const invoice = await raw.subscriptionInvoice.update({
      where: { id },
      data: {
        status,
        dunningStep,
        lastDunnedAt,
        nextDunAt,
        paidAt,
        gatewayReference,
      },
    });

    await raw.platformAuditEvent.create({
      data: {
        actorStaffId: admin.id,
        action: "UPDATE_INVOICE",
        entity: "SubscriptionInvoice",
        entityId: invoice.id,
        tenantId: invoice.tenantId,
        after: body,
      },
    }).catch(() => {});

    return NextResponse.json(invoice);
  } catch (error) {
    throw error;
  }
});
