import { NextResponse } from "next/server"
import { mobileRoute, MobileApiError } from "@/lib/mobile-api/guard"
import { GroupFeatureError, groupsService, isWhatsAppGroupsEnabled } from "@/modules/whatsapp-groups"

const ADMIN_ROLES = ["SUPER_ADMIN", "OWNER", "ADMIN", "MANAGER", "OPS_ADMIN"]

export const OPTIONS = mobileRoute({}, async () => new NextResponse(null, { status: 204 }))

export const POST = mobileRoute(
  { requiredModule: "INBOX", allowedRoles: ADMIN_ROLES, write: true },
  async (request, context) => {
    if (!isWhatsAppGroupsEnabled()) {
      throw new MobileApiError(404, "FEATURE_DISABLED", "WhatsApp Groups is disabled.")
    }
    const { id } = await context.params
    try {
      const body = await request.json()
      const res = await groupsService.sendInviteTemplate(id, {
        to: body.to,
        templateName: body.templateName,
        templateLang: body.templateLang,
      })
      return NextResponse.json({ data: res })
    } catch (err) {
      if (err instanceof GroupFeatureError) throw new MobileApiError(err.status, String(err.code || "GROUP_ERROR"), err.message)
      throw err
    }
  },
)
