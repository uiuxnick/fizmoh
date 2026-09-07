import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { storeMedia } from "@/lib/media-store"
import { extractMenuFromMedia } from "@/lib/restaurant-ai-import"

export const maxDuration = 120
export const dynamic = "force-dynamic"

export const GET = withErrors(withModule("RESTAURANT", async () => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ imports: [] })

  const imports = await raw.restaurantMenuImport.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  return NextResponse.json({ imports })
}))

export const POST = withErrors(withModule("RESTAURANT", async (req: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const branchId = (formData.get("branchId") as string) || null

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  const mimeType = file.type || "application/octet-stream"
  if (!mimeType.startsWith("image/") && mimeType !== "application/pdf") {
    return NextResponse.json(
      { error: "Only images (JPG, PNG, WebP) and PDF documents are supported" },
      { status: 400 }
    )
  }

  // Anthropic API base64 limit is 32MB (which is approx 24MB raw file)
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json(
      {
        error: `File size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds the 25 MB limit for AI document extraction. Please compress your PDF or upload images of individual menu pages.`,
      },
      { status: 400 }
    )
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 1. Store media file safely in tenant's storage
    const stored = await storeMedia(buffer, mimeType, file.name)

    // 2. Run AI extraction
    const { importRecordId, result } = await extractMenuFromMedia({
      tenantId,
      branchId,
      fileBuffer: buffer,
      mimeType,
      fileName: file.name,
      fileUrl: stored.url,
    })

    return NextResponse.json({
      importId: importRecordId,
      fileUrl: stored.url,
      result,
    })
  } catch (err: any) {
    console.error("[restaurant/import] Extraction failed:", err)
    return NextResponse.json(
      {
        error: err?.message || "AI extraction failed. Please ensure the document is clear and readable.",
      },
      { status: 500 }
    )
  }
}))
