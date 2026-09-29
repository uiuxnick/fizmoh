import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant, PLATFORM } from "@/lib/tenant"
import { isAutoLearnEnabled, setAutoLearnEnabled } from "@/lib/chat-training"

export const GET = withErrors(async (req: NextRequest) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = currentTenant()?.tenantId || PLATFORM
  const enabled = await isAutoLearnEnabled(tenantId)

  return NextResponse.json({ autoLearnEnabled: enabled })
})

export const POST = withErrors(async (req: NextRequest) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { enabled } = body
  const tenantId = currentTenant()?.tenantId || PLATFORM

  await setAutoLearnEnabled(tenantId, enabled === true)

  return NextResponse.json({ success: true, autoLearnEnabled: enabled === true })
})
