import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant, PLATFORM } from "@/lib/tenant"
import { withModule } from "@/lib/entitlements"
import { getSequenceEnrollmentsList } from "@/lib/sequences"

export const GET = withErrors(withModule("BROADCAST", async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const tenantId = currentTenant()?.tenantId || PLATFORM
  const enrollments = await getSequenceEnrollmentsList(tenantId, id)

  return NextResponse.json({ enrollments })
}))
