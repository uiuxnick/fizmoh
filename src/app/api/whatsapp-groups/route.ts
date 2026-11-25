import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { groupsService, isWhatsAppGroupsEnabled } from "@/modules/whatsapp-groups"
import { handleGroupError, requireGroupAdmin } from "@/modules/whatsapp-groups/auth-guard"

export const GET = withErrors(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  if (searchParams.get("statusOnly") === "1") {
    return NextResponse.json({ enabled: isWhatsAppGroupsEnabled() })
  }

  const auth = await requireGroupAdmin(request)
  if (!auth.ok) return auth.response

  try {
    const groups = await groupsService.listGroups()
    return NextResponse.json({ enabled: true, groups })
  } catch (err) {
    return handleGroupError(err)
  }
})

export const POST = withErrors(async (request: NextRequest) => {
  const auth = await requireGroupAdmin(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const group = await groupsService.createGroup({
      subject: body.subject,
      description: body.description,
      joinApprovalMode: body.join_approval_mode || body.joinApprovalMode,
      customerId: body.customerId || null,
      bookingId: body.bookingId || null,
      createdBy: auth.session.staffId || auth.session.email || null,
    })
    return NextResponse.json({ group }, { status: 201 })
  } catch (err) {
    return handleGroupError(err)
  }
})
