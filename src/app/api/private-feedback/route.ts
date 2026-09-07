import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

/** The approval/attention queue for below-threshold ratings. */
export const GET = withErrors(withModule("DIGITAL_QR", async () => {
  const rows = await db.privateFeedback.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      session: { include: { campaign: { select: { name: true } }, qrCode: { select: { label: true } } } },
    },
  })

  return NextResponse.json({
    feedback: rows.map(f => ({
      id: f.id, rating: f.rating, category: f.category, feedbackText: f.feedbackText,
      contactName: f.contactName, contactPhone: f.contactPhone, contactEmail: f.contactEmail,
      wantsCallback: f.wantsCallback, status: f.status, internalNote: f.internalNote,
      campaign: f.session.campaign.name, qrLabel: f.session.qrCode.label,
      createdAt: f.createdAt,
    })),
  })
}))
