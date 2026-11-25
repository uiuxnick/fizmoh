import { NextResponse } from "next/server"
import { mobileRoute } from "@/lib/mobile-api/guard"
import { raw } from "@/lib/db"

export const OPTIONS = mobileRoute({}, async () => new NextResponse(null, { status: 204 }))

export const GET = mobileRoute({ requiredModule: "INBOX" }, async (_request, _context, auth) => {
  const items = await raw.cannedResponse.findMany({
    where: { tenantId: auth.tenantId },
    orderBy: [{ category: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      shortcut: true,
      content: true,
      category: true,
    },
  })
  return NextResponse.json({ data: items })
})
