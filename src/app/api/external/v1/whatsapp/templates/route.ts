import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { validateApiKey } from "@/lib/api-keys"
import { withTenant } from "@/lib/tenant-context"
import { db } from "@/lib/db"

export const GET = withErrors(async (request: NextRequest) => {
  const apiKeyHeader = request.headers.get("x-api-key") || request.headers.get("authorization")
  const keyInfo = await validateApiKey(apiKeyHeader)
  if (!keyInfo) {
    return NextResponse.json({ error: "Unauthorized: Invalid or missing API key" }, { status: 401 })
  }

  const templates = await withTenant({ tenantId: keyInfo.tenantId, slug: "" }, async () => {
    return db.template.findMany({
      where: { channel: "WHATSAPP" },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        category: true,
        language: true,
        status: true,
        type: true,
        headerType: true,
        headerContent: true,
        bodyContent: true,
        footerContent: true,
        buttons: true,
        variables: true,
        metaTemplateId: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  })

  return NextResponse.json({
    success: true,
    count: templates.length,
    templates,
  })
})
