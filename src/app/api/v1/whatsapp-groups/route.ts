import { NextResponse } from "next/server"
import { mobileRoute, MobileApiError } from "@/lib/mobile-api/guard"
import { GroupFeatureError, groupsService, isWhatsAppGroupsEnabled } from "@/modules/whatsapp-groups"

const ADMIN_ROLES = ["SUPER_ADMIN", "OWNER", "ADMIN", "MANAGER", "OPS_ADMIN"]

function mapError(err: unknown): never {
  if (err instanceof GroupFeatureError) {
    throw new MobileApiError(err.status, String(err.code || "GROUP_ERROR"), err.message)
  }
  throw err
}

export const OPTIONS = mobileRoute({}, async () => new NextResponse(null, { status: 204 }))

export const GET = mobileRoute({ requiredModule: "INBOX" }, async () => {
  if (!isWhatsAppGroupsEnabled()) {
    throw new MobileApiError(404, "FEATURE_DISABLED", "WhatsApp Groups is disabled.")
  }
  try {
    const groups = await groupsService.listGroups()
    return NextResponse.json({ data: groups })
  } catch (err) {
    mapError(err)
  }
})

export const POST = mobileRoute(
  { requiredModule: "INBOX", allowedRoles: ADMIN_ROLES, write: true },
  async (request, _context, auth) => {
    if (!isWhatsAppGroupsEnabled()) {
      throw new MobileApiError(404, "FEATURE_DISABLED", "WhatsApp Groups is disabled.")
    }
    try {
      const body = await request.json()
      const group = await groupsService.createGroup({
        subject: body.subject,
        description: body.description,
        joinApprovalMode: body.join_approval_mode || body.joinApprovalMode,
        createdBy: auth.staffId,
      })
      return NextResponse.json({ data: group }, { status: 201 })
    } catch (err) {
      mapError(err)
    }
  },
)
