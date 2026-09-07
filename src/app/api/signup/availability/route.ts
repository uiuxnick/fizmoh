import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { checkRateLimit, requestIp } from "@/lib/rate-limit"

/**
 * Whether a workspace address is free, for the sign-up form to check as it is
 * typed.
 *
 * Answers only about workspace names, never about accounts. "Is acme taken" is
 * a question anybody may ask; "does this email have an account" is not, and
 * keeping them in separate endpoints stops the second being answered by
 * accident.
 */
export const GET = withErrors(async (request: NextRequest) => {
  const rate = checkRateLimit(`slug:${requestIp(request.headers)}`, 60, 60 * 1000)
  if (!rate.allowed) return NextResponse.json({ error: "Slow down" }, { status: 429 })

  const wanted = (new URL(request.url).searchParams.get("slug") || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
  if (wanted.length < 2) return NextResponse.json({ available: false, reason: "Too short" })

  const taken = await db.tenant.findUnique({ where: { slug: wanted } })
  return NextResponse.json({
    slug: wanted,
    available: !taken,
    url: `https://${wanted}.fizmoh.cloud`,
  })
})
