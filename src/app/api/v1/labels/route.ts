import { NextResponse } from "next/server"
import { mobileRoute } from "@/lib/mobile-api/guard"
import { raw } from "@/lib/db"

const DEFAULT_LABELS = [
  "VIP", "New Lead", "Payment Pending", "Arabic Speaker", "Repeat Customer", "Complaint", "Follow Up",
]

export const OPTIONS = mobileRoute({}, async () => new NextResponse(null, { status: 204 }))

export const GET = mobileRoute({ requiredModule: "INBOX" }, async (_request, _context, auth) => {
  const rows = await raw.label.findMany({
    where: { tenantId: auth.tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  })
  return NextResponse.json({
    data: {
      labels: rows,
      defaults: DEFAULT_LABELS,
    },
  })
})
