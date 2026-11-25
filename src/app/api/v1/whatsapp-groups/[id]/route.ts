import { NextResponse } from "next/server"
import { mobileRoute, MobileApiError } from "@/lib/mobile-api/guard"
import { GroupFeatureError, groupsService, isWhatsAppGroupsEnabled } from "@/modules/whatsapp-groups"

const ADMIN_ROLES = ["SUPER_ADMIN", "OWNER", "ADMIN", "MANAGER", "OPS_ADMIN"]

export const OPTIONS = mobileRoute({}, async () => new NextResponse(null, { status: 204 }))

export const GET = mobileRoute({ requiredModule: "INBOX" }, async (_request, context) => {
  if (!isWhatsAppGroupsEnabled()) {
    throw new MobileApiError(404, "FEATURE_DISABLED", "WhatsApp Groups is disabled.")
  }
  const { id } = await context.params
  try {
    const group = await groupsService.getAndSyncGroup(id)
    return NextResponse.json({ data: group })
  } catch (err) {
    if (err instanceof GroupFeatureError) throw new MobileApiError(err.status, String(err.code || "GROUP_ERROR"), err.message)
    throw err
  }
})

export const DELETE = mobileRoute(
  { requiredModule: "INBOX", allowedRoles: ADMIN_ROLES, write: true },
  async (_request, context) => {
    if (!isWhatsAppGroupsEnabled()) {
      throw new MobileApiError(404, "FEATURE_DISABLED", "WhatsApp Groups is disabled.")
    }
    const { id } = await context.params
    try {
      const group = await groupsService.deleteGroup(id)
      return NextResponse.json({ data: { deleted: true, group } })
    } catch (err) {
      if (err instanceof GroupFeatureError) throw new MobileApiError(err.status, String(err.code || "GROUP_ERROR"), err.message)
      throw err
    }
  },
)
