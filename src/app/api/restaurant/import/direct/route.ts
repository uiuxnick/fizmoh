import { NextRequest, NextResponse } from "next/server"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { parseDirectMenuSpreadsheet, commitCategoriesToMenu } from "@/lib/restaurant-ai-import"

export const maxDuration = 60
export const dynamic = "force-dynamic"

export const POST = withErrors(withModule("RESTAURANT", async (req: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })

  const body = await req.json()
  const { branchId, menuId, categories: providedCategories, csvText, parseOnly } = body

  // Mode 1: Client wants to preview parsed spreadsheet before committing
  if (parseOnly && csvText) {
    const result = parseDirectMenuSpreadsheet(String(csvText))
    return NextResponse.json({ result })
  }

  // Mode 2: Direct commit with structured categories
  let categoriesToCommit = providedCategories
  if (!categoriesToCommit && csvText) {
    const parsed = parseDirectMenuSpreadsheet(String(csvText))
    categoriesToCommit = parsed.categories
  }

  if (!categoriesToCommit || !Array.isArray(categoriesToCommit) || categoriesToCommit.length === 0) {
    return NextResponse.json(
      { error: "No valid categories or menu items were found in the submitted data." },
      { status: 400 }
    )
  }

  const result = await commitCategoriesToMenu({
    tenantId,
    branchId: branchId || null,
    menuId: menuId || null,
    categories: categoriesToCommit,
  })

  return NextResponse.json({
    success: true,
    createdCategoriesCount: result.createdCategoriesCount,
    createdItemsCount: result.createdItemsCount,
  })
}))
