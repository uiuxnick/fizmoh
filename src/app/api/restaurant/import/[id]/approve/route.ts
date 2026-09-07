import { NextRequest, NextResponse } from "next/server"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { approveMenuImport } from "@/lib/restaurant-ai-import"

export const POST = withErrors(withModule("RESTAURANT", async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })

  const { id: importId } = await context.params
  const body = await req.json()
  const { branchId, menuId, categories } = body

  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    return NextResponse.json({ error: "No categories or items provided for approval" }, { status: 400 })
  }

  const result = await approveMenuImport({
    tenantId,
    importId,
    branchId: branchId || null,
    menuId: menuId || null,
    categories,
  })

  return NextResponse.json(result)
}))
