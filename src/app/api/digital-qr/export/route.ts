import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { toCsv, csvResponseHeaders } from "@/lib/csv"

const DATE = () => new Date().toISOString().slice(0, 10)

/**
 * Digital QR Addons exports — section 59 of the spec.
 *
 * Four real datasets, ?type=campaigns|qr-codes|reviews|feedback. Reuses the
 * plain CSV convention every other export route in the app already uses
 * (src/lib/csv.ts) rather than a second export format or library.
 */
export const GET = withErrors(withModule("DIGITAL_QR", async (request: NextRequest) => {
  const type = new URL(request.url).searchParams.get("type") || "campaigns"

  if (type === "campaigns") {
    const campaigns = await db.qrCampaign.findMany({
      orderBy: { createdAt: "desc" },
      include: { location: { select: { name: true } }, qrCodes: { select: { id: true } }, _count: { select: { sessions: true } } },
    })
    const header = ["Campaign", "Location", "Status", "Language", "Rating Threshold", "QR Codes", "Sessions", "Google Review URL", "Created"]
    const rows = campaigns.map(c => [
      c.name, c.location?.name || "", c.status, c.language, c.ratingThreshold,
      c.qrCodes.length, c._count.sessions, c.googleReviewUrl || "", c.createdAt.toISOString(),
    ])
    return new NextResponse(toCsv(header, rows), { headers: csvResponseHeaders(`qr-campaigns-${DATE()}.csv`) })
  }

  if (type === "qr-codes") {
    const codes = await db.qrCode.findMany({
      orderBy: { createdAt: "asc" },
      include: { campaign: { select: { name: true } }, _count: { select: { scans: true, sessions: true } } },
    })
    const withStats = await Promise.all(codes.map(async c => {
      const [uniqueScans, googleClicks] = await Promise.all([
        db.qrScan.count({ where: { qrCodeId: c.id, isUnique: true } }),
        db.reviewSession.count({ where: { qrCodeId: c.id, googleStatus: "CTA_CLICKED" } }),
      ])
      return { ...c, uniqueScans, googleClicks }
    }))
    const header = ["Campaign", "QR Label", "Token", "Active", "Scans", "Unique Scans", "Sessions", "Google Clicks", "Created"]
    const rows = withStats.map(c => [
      c.campaign.name, c.label, c.token, c.isActive ? "Yes" : "No",
      c._count.scans, c.uniqueScans, c._count.sessions, c.googleClicks, c.createdAt.toISOString(),
    ])
    return new NextResponse(toCsv(header, rows), { headers: csvResponseHeaders(`qr-codes-${DATE()}.csv`) })
  }

  if (type === "reviews") {
    const sessions = await db.reviewSession.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
      include: { campaign: { select: { name: true } }, qrCode: { select: { label: true } } },
    })
    const header = [
      "Campaign", "QR", "Rating", "Status", "Tags", "Customer Input", "Final Review",
      "AI Used", "Edited", "Google Status", "Created",
    ]
    const rows = sessions.map(s => [
      s.campaign.name, s.qrCode.label, s.rating ?? "", s.status,
      Array.isArray(s.inputTags) ? (s.inputTags as string[]).join("; ") : "",
      s.inputText || "", s.finalText || "",
      s.aiGeneratedAt ? "Yes" : "No", s.editedText ? "Yes" : "No",
      s.googleStatus, s.createdAt.toISOString(),
    ])
    return new NextResponse(toCsv(header, rows), { headers: csvResponseHeaders(`qr-reviews-${DATE()}.csv`) })
  }

  if (type === "feedback") {
    const feedback = await db.privateFeedback.findMany({
      orderBy: { createdAt: "desc" },
      include: { session: { include: { campaign: { select: { name: true } }, qrCode: { select: { label: true } } } } },
    })
    const header = ["Campaign", "QR", "Rating", "Category", "Feedback", "Contact Name", "Contact Phone", "Wants Callback", "Status", "Created"]
    const rows = feedback.map(f => [
      f.session.campaign.name, f.session.qrCode.label, f.rating, f.category || "",
      f.feedbackText || "", f.contactName || "", f.contactPhone || "",
      f.wantsCallback ? "Yes" : "No", f.status, f.createdAt.toISOString(),
    ])
    return new NextResponse(toCsv(header, rows), { headers: csvResponseHeaders(`qr-private-feedback-${DATE()}.csv`) })
  }

  return NextResponse.json({ error: "Unknown export type" }, { status: 400 })
}))
