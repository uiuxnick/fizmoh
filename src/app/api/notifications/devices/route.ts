import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { z } from "zod"

/**
 * The phones that get told about things.
 *
 * A token is claimed by whoever registers it, not merely created: a shared
 * device that a second member of staff signs into must ring for them and stop
 * ringing for the first, or one person's messages arrive on another person's
 * phone.
 */

const schema = z.object({
  token: z.string().trim().min(16).max(400),
  platform: z.enum(["IOS", "ANDROID"]).default("IOS"),
  kind: z.enum(["ALERT", "VOIP"]).default("ALERT"),
  appVersion: z.string().trim().max(40).optional(),
})

/** The phones signed into this account, so somebody can see and revoke them. */
export const GET = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  const staffId = session?.kind === "staff" ? session.staffId : null
  if (!staffId) return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const devices = await db.deviceToken.findMany({
    where: { staffId },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, platform: true, kind: true, appVersion: true, lastSeenAt: true, createdAt: true },
  })
  return NextResponse.json({ devices })
})

export const POST = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  const staffId = session?.kind === "staff" ? session.staffId : null
  if (!staffId) return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "That is not a device token" }, { status: 400 })
  }
  const { token, platform, kind, appVersion } = parsed.data

  await db.deviceToken.upsert({
    where: { token },
    update: { staffId, platform, kind, appVersion, lastSeenAt: new Date() },
    create: { token, staffId, platform, kind, appVersion },
  })

  return NextResponse.json({ ok: true })
})

/**
 * Signing out has to unregister, or the phone keeps receiving the inbox of an
 * account that is no longer on it.
 */
export const DELETE = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  const staffId = session?.kind === "staff" ? session.staffId : null
  if (!staffId) return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const url = new URL(request.url)
  const id = url.searchParams.get("id")
  if (id) {
    // Revoking a device by row, from the profile screen, where the token
    // itself is not something the app knows for another phone.
    await db.deviceToken.deleteMany({ where: { id, staffId } })
    return NextResponse.json({ ok: true })
  }

  const token = url.searchParams.get("token")
  if (token) {
    // Scoped to the signed-in member of staff: a token is not a secret, and
    // without this anyone could unregister anyone else's phone.
    await db.deviceToken.deleteMany({ where: { token, staffId } })
  } else {
    await db.deviceToken.deleteMany({ where: { staffId } })
  }
  return NextResponse.json({ ok: true })
})
