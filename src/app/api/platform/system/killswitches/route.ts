import { NextRequest, NextResponse } from "next/server";
import { raw } from "@/lib/db";
import { withErrors } from "@/lib/api-handler";
import { requirePlatformAdmin } from "@/app/api/platform/tenants/route";

export const dynamic = "force-dynamic";

interface KillswitchState {
  pauseBroadcasts: boolean;
  throttleAi: boolean;
  maintenanceMode: boolean;
  lastUpdated?: string;
  updatedBy?: string;
  reason?: string;
}

const DEFAULT_STATE: KillswitchState = {
  pauseBroadcasts: false,
  throttleAi: false,
  maintenanceMode: false,
};

export const GET = withErrors(async (request: NextRequest) => {
  const admin = await requirePlatformAdmin(request);
  if (!admin) return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 });

  const latestEvent = await raw.platformAuditEvent.findFirst({
    where: {
      action: "UPDATE_KILLSWITCHES",
      entity: "PlatformSetting",
    },
    orderBy: { createdAt: "desc" },
  });

  const state: KillswitchState = latestEvent?.after
    ? (latestEvent.after as unknown as KillswitchState)
    : DEFAULT_STATE;

  return NextResponse.json({
    killswitches: {
      ...DEFAULT_STATE,
      ...state,
      lastUpdated: latestEvent?.createdAt?.toISOString() || null,
      updatedBy: latestEvent?.actorStaffId || null,
      reason: latestEvent?.reason || null,
    },
  });
});

export const POST = withErrors(async (request: NextRequest) => {
  const admin = await requirePlatformAdmin(request);
  if (!admin) return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const { pauseBroadcasts, throttleAi, maintenanceMode, reason } = body;

  const latestEvent = await raw.platformAuditEvent.findFirst({
    where: {
      action: "UPDATE_KILLSWITCHES",
      entity: "PlatformSetting",
    },
    orderBy: { createdAt: "desc" },
  });

  const previousState: KillswitchState = latestEvent?.after
    ? (latestEvent.after as unknown as KillswitchState)
    : DEFAULT_STATE;

  const newState: KillswitchState = {
    pauseBroadcasts: typeof pauseBroadcasts === "boolean" ? pauseBroadcasts : previousState.pauseBroadcasts,
    throttleAi: typeof throttleAi === "boolean" ? throttleAi : previousState.throttleAi,
    maintenanceMode: typeof maintenanceMode === "boolean" ? maintenanceMode : previousState.maintenanceMode,
  };

  await raw.platformAuditEvent.create({
    data: {
      actorStaffId: admin.id,
      action: "UPDATE_KILLSWITCHES",
      entity: "PlatformSetting",
      entityId: "global",
      before: previousState as any,
      after: newState as any,
      reason: reason || "Emergency kill-switch toggled by platform operator",
    },
  });

  return NextResponse.json({
    success: true,
    killswitches: newState,
  });
});
