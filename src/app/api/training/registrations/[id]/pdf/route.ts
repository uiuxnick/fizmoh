import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { currentTenant, PLATFORM } from "@/lib/tenant"
import { generateTrainingReceiptPDF } from "@/lib/training-receipt-pdf"
import { modulesFor } from "@/lib/entitlements"

export const dynamic = "force-dynamic"

export const GET = withErrors(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const tenant = currentTenant()
    const tenantId = tenant?.tenantId || request.nextUrl.searchParams.get("tenantId") || PLATFORM

    const result = await generateTrainingReceiptPDF(tenantId, id)
    if (!result) {
      return NextResponse.json({ error: "Registration receipt not found" }, { status: 404 })
    }

    const { pdfBytes, registration, course } = result
    const targetTenantId = registration?.tenantId || course?.tenantId || tenantId
    if (targetTenantId !== PLATFORM && !(await modulesFor(targetTenantId)).includes("TRAINING")) {
      return NextResponse.json({ error: "Training module not active for this workspace", code: "MODULE_NOT_ENTITLED" }, { status: 403 })
    }
    const brandPrefix = (course?.trainerCompany || "Training")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30)

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${brandPrefix}-Receipt-${registration.registrationNumber}.pdf"`,
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    })
  },
)
