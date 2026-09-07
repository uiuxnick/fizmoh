import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

/**
 * CSV subscriber import with multi-channel support (BRD §6.5.4).
 * Supports WhatsApp phone numbers, Instagram handles, and Facebook Messenger identities.
 */
export const POST = withErrors(withModule("BROADCAST", async (request: NextRequest) => {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const csv = String(body.csv || "").trim()
  if (!csv) return NextResponse.json({ error: "No CSV content" }, { status: 400 })

  const optIn = body.optIn === true

  const lines = csv.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return NextResponse.json({ error: "CSV needs a header row and at least one record" }, { status: 400 })

  const header = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/^"|"$/g, ""))
  const phoneIdx = header.findIndex(h => h === "phone" || h === "number" || h === "whatsapp")
  const channelIdx = header.findIndex(h => h === "channel" || h === "platform")
  const handleIdx = header.findIndex(h => h === "handle" || h === "username" || h === "socialusername" || h === "instagram")
  const nameIdx = header.findIndex(h => h === "name" || h === "fullname")
  const emailIdx = header.findIndex(h => h === "email")

  if (phoneIdx === -1 && handleIdx === -1) {
    return NextResponse.json({ error: "CSV must contain a 'phone' or 'handle'/'instagram' column" }, { status: 400 })
  }

  let created = 0
  let updated = 0
  const skipped: string[] = []

  for (const line of lines.slice(1)) {
    const cells = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""))
    const rawChannel = channelIdx >= 0 ? cells[channelIdx]?.toUpperCase() : ""
    const rawHandle = handleIdx >= 0 ? cells[handleIdx] : ""
    let rawPhone = phoneIdx >= 0 ? cells[phoneIdx]?.replace(/[^\d+]/g, "") : ""

    let channel: "WHATSAPP" | "FACEBOOK" | "INSTAGRAM" = "WHATSAPP"
    if (rawChannel === "INSTAGRAM" || rawHandle.startsWith("@") || (!rawPhone && rawHandle)) {
      channel = "INSTAGRAM"
    } else if (rawChannel === "FACEBOOK") {
      channel = "FACEBOOK"
    }

    let phone = rawPhone
    let socialId: string | null = null
    let socialUsername: string | null = null

    if (channel === "INSTAGRAM") {
      const cleanHandle = (rawHandle || rawPhone || "").replace(/^@/, "").trim()
      if (!cleanHandle) {
        skipped.push(line.slice(0, 40))
        continue
      }
      socialUsername = `@${cleanHandle}`
      socialId = cleanHandle
      phone = phone && phone.length >= 8 ? phone : `social:instagram:${cleanHandle}`
    } else if (channel === "FACEBOOK") {
      const fbId = (rawHandle || rawPhone || "user").trim()
      socialUsername = rawHandle || cells[nameIdx] || fbId
      socialId = fbId
      phone = phone && phone.length >= 8 ? phone : `social:facebook:${fbId}`
    } else {
      if (!phone || phone.replace(/\D/g, "").length < 8) {
        skipped.push(line.slice(0, 40))
        continue
      }
    }

    const data = {
      name: nameIdx >= 0 ? cells[nameIdx] || null : null,
      email: emailIdx >= 0 ? cells[emailIdx] || null : null,
    }

    const existing = await db.customer.findFirst({
      where: {
        OR: [
          { phone },
          ...(socialId ? [{ socialId }] : []),
        ],
      },
    })

    if (existing) {
      await db.customer.updateMany({
        where: { id: existing.id },
        data: {
          channel,
          name: data.name ?? existing.name,
          email: data.email ?? existing.email,
          ...(socialUsername ? { socialUsername } : {}),
          ...(socialId ? { socialId } : {}),
        },
      })
      updated++
    } else {
      await db.customer.create({
        data: {
          channel,
          phone,
          socialId,
          socialUsername,
          source: channel,
          name: data.name,
          email: data.email,
          whatsappOptIn: channel === "WHATSAPP" ? optIn : false,
          facebookOptIn: channel === "FACEBOOK" ? optIn : true,
          instagramOptIn: channel === "INSTAGRAM" ? optIn : true,
          optInSource: optIn ? "IMPORT" : null,
          optInAt: optIn ? new Date() : null,
        },
      })
      created++
    }
  }

  return NextResponse.json({ created, updated, skipped: skipped.length, optIn })
}))
