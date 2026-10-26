import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { parseExternalFlow } from "@/lib/flow-importer"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant } from "@/lib/tenant"

const FLOW_EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "ADMIN", "PLATFORM", "MANAGER", "MARKETING"]

export const POST = withErrors(withModule("FLOWS", async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 })
  }
  const tenant = currentTenant()
  const role = (tenant?.role || session.role || "").toUpperCase()
  if (role && !FLOW_EDIT_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions to import flows" }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const raw = body.flowData ?? body
  if (!raw) {
    return NextResponse.json({ error: "Missing flowData" }, { status: 400 })
  }

  try {
    const result = parseExternalFlow(raw)
    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to parse flow" }, { status: 422 })
  }
}))
