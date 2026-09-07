import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { requirePlatformAdmin } from "@/app/api/platform/tenants/route"

export const GET = withErrors(async (request: NextRequest) => {
  const admin = await requirePlatformAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 })
  }

  const leads = await raw.lead.findMany({
    where: { tenantId: null },
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  return NextResponse.json({
    leads: leads.map(l => ({
      id: l.id,
      status: l.status,
      notes: l.notes,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
      answers: l.answers as Record<string, any>,
    })),
  })
})
