import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { parseCsvText, guessColumnMapping } from "@/lib/csv-parser"

function parseTags(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return (value as unknown[]).map(v => String(v || "").trim()).filter(Boolean)
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed || trimmed === "[]") return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.map(v => String(v || "").trim()).filter(Boolean)
      if (typeof parsed === "string" && parsed.trim()) return [parsed.trim()]
    } catch {
      if (trimmed.includes(",")) {
        return trimmed.split(",").map(s => s.trim()).filter(Boolean)
      }
      return [trimmed]
    }
  }
  return []
}

/**
 * Enhanced CSV Subscriber Import with Smart Column Mapping & Deduplication Merge
 * Per BRD §6.5.4: Central multi-channel subscriber audience database
 */
export const POST = withErrors(withModule("BROADCAST", async (request: NextRequest) => {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const csv = String(body.csv || "").trim()
  if (!csv) return NextResponse.json({ error: "No CSV content provided" }, { status: 400 })

  const optIn = body.optIn === true
  const dedupStrategy: "merge" | "overwrite" | "skip" = ["merge", "overwrite", "skip"].includes(body.dedupStrategy)
    ? body.dedupStrategy
    : "merge"
  const globalTag = typeof body.globalTag === "string" ? body.globalTag.trim() : ""

  const parsed = parseCsvText(csv)
  if (parsed.headers.length === 0 || parsed.rows.length === 0) {
    return NextResponse.json({ error: "CSV needs a header row and at least one contact record" }, { status: 400 })
  }

  // Column mapping: maps column index (number) to target field
  const mapping: Record<number, string> = {}
  if (body.columnMapping && typeof body.columnMapping === "object") {
    for (const [key, val] of Object.entries(body.columnMapping)) {
      const idx = Number(key)
      if (Number.isInteger(idx) && idx >= 0 && typeof val === "string") {
        mapping[idx] = val
      } else {
        // Match by header name if passed as name
        const headerIdx = parsed.headers.findIndex(h => h.toLowerCase() === key.toLowerCase())
        if (headerIdx >= 0 && typeof val === "string") {
          mapping[headerIdx] = val
        }
      }
    }
  } else {
    // Auto-guess mappings if none provided
    parsed.headers.forEach((h, idx) => {
      mapping[idx] = guessColumnMapping(h)
    })
  }

  // Verify that either phone, socialUsername, or email is mapped
  const mappedTargets = Object.values(mapping)
  const hasPhone = mappedTargets.includes("phone")
  const hasSocial = mappedTargets.includes("socialUsername")
  const hasEmail = mappedTargets.includes("email")

  if (!hasPhone && !hasSocial && !hasEmail) {
    return NextResponse.json(
      { error: "Please map at least one identifier column: Phone, Instagram Handle, or Email" },
      { status: 400 }
    )
  }

  let created = 0
  let updated = 0
  const skipped: Array<{ row: number; reason: string; data?: any }> = []

  for (let r = 0; r < parsed.rows.length; r++) {
    const row = parsed.rows[r]
    const rowNum = r + 2 // 1-based, accounting for header

    let rawPhone = ""
    let rawName = ""
    let rawEmail = ""
    let rawChannel = ""
    let rawSocialUsername = ""
    let rawStage = ""
    let rawLoyaltyTier = ""
    let rawTotalSpent = 0
    const rowTags: string[] = []
    const customFields: Record<string, any> = {}

    // Extract fields from mapped columns
    for (let c = 0; c < row.length; c++) {
      const target = mapping[c]
      if (!target || target === "skip") continue
      const val = row[c]?.trim() || ""
      if (!val) continue

      if (target === "phone") {
        rawPhone = val.replace(/[^\d+]/g, "")
      } else if (target === "name") {
        rawName = val
      } else if (target === "email") {
        rawEmail = val.toLowerCase()
      } else if (target === "channel") {
        rawChannel = val.toUpperCase()
      } else if (target === "socialUsername") {
        rawSocialUsername = val
      } else if (target === "stage") {
        rawStage = val.toUpperCase()
      } else if (target === "loyaltyTier") {
        rawLoyaltyTier = val.toUpperCase()
      } else if (target === "totalSpent") {
        const n = parseFloat(val.replace(/[^0-9.]/g, ""))
        if (Number.isFinite(n)) rawTotalSpent = n
      } else if (target === "tags") {
        const split = val.split(/[,;|]/).map(t => t.trim()).filter(Boolean)
        rowTags.push(...split)
      } else if (target.startsWith("customField:")) {
        const cfKey = target.replace("customField:", "").trim()
        if (cfKey) customFields[cfKey] = val
      }
    }

    if (globalTag) {
      rowTags.push(globalTag)
    }

    // Determine channel
    let channel: "WHATSAPP" | "FACEBOOK" | "INSTAGRAM" = "WHATSAPP"
    if (rawChannel === "INSTAGRAM" || rawSocialUsername.startsWith("@") || (!rawPhone && rawSocialUsername)) {
      channel = "INSTAGRAM"
    } else if (rawChannel === "FACEBOOK") {
      channel = "FACEBOOK"
    }

    let phone = rawPhone
    let socialId: string | null = null
    let socialUsername: string | null = null

    if (channel === "INSTAGRAM") {
      const cleanHandle = (rawSocialUsername || rawPhone || "").replace(/^@/, "").trim()
      if (!cleanHandle) {
        skipped.push({ row: rowNum, reason: "Missing Instagram handle" })
        continue
      }
      socialUsername = `@${cleanHandle}`
      socialId = cleanHandle
      phone = phone && phone.replace(/\D/g, "").length >= 8 ? phone : `social:instagram:${cleanHandle}`
    } else if (channel === "FACEBOOK") {
      const fbId = (rawSocialUsername || rawPhone || rawName || "user").trim()
      socialUsername = rawSocialUsername || rawName || fbId
      socialId = fbId
      phone = phone && phone.replace(/\D/g, "").length >= 8 ? phone : `social:facebook:${fbId}`
    } else {
      if (!phone || phone.replace(/\D/g, "").length < 7) {
        skipped.push({ row: rowNum, reason: "Invalid phone number (needs at least 7 digits)" })
        continue
      }
    }

    // Lookup existing contact for deduplication
    const orClauses: any[] = [{ phone }]
    if (socialId) orClauses.push({ socialId })
    if (rawEmail) orClauses.push({ email: rawEmail })

    const existing = await db.customer.findFirst({
      where: { OR: orClauses },
    })

    if (existing) {
      if (dedupStrategy === "skip") {
        skipped.push({ row: rowNum, reason: "Duplicate contact skipped", data: { phone, name: existing.name } })
        continue
      }

      // Merge tags
      const existingTags = parseTags(existing.tags)
      const mergedTags = Array.from(new Set([...existingTags, ...rowTags]))

      // Merge custom fields
      let existingCustomFields: Record<string, any> = {}
      if (existing.customFields) {
        if (typeof existing.customFields === "object" && !Array.isArray(existing.customFields)) {
          existingCustomFields = existing.customFields as Record<string, any>
        } else if (typeof existing.customFields === "string") {
          try {
            existingCustomFields = JSON.parse(existing.customFields)
          } catch {}
        }
      }

      const mergedCustomFields = dedupStrategy === "overwrite"
        ? { ...existingCustomFields, ...customFields }
        : { ...customFields, ...existingCustomFields }

      const updateData: any = {
        tags: mergedTags,
        customFields: Object.keys(mergedCustomFields).length > 0 ? mergedCustomFields : undefined,
      }

      if (dedupStrategy === "overwrite") {
        if (rawName) updateData.name = rawName
        if (rawEmail) updateData.email = rawEmail
        if (rawStage) updateData.stage = rawStage
        if (rawLoyaltyTier) updateData.loyaltyTier = rawLoyaltyTier
        if (rawTotalSpent > 0) updateData.totalSpent = rawTotalSpent
        if (socialUsername) updateData.socialUsername = socialUsername
        if (socialId) updateData.socialId = socialId
      } else {
        // Merge strategy: fill only empty fields
        if (!existing.name && rawName) updateData.name = rawName
        if (!existing.email && rawEmail) updateData.email = rawEmail
        if ((!existing.stage || existing.stage === "NEW") && rawStage) updateData.stage = rawStage
        if (!existing.loyaltyTier && rawLoyaltyTier) updateData.loyaltyTier = rawLoyaltyTier
        if ((!existing.totalSpent || existing.totalSpent === 0) && rawTotalSpent > 0) updateData.totalSpent = rawTotalSpent
        if (!existing.socialUsername && socialUsername) updateData.socialUsername = socialUsername
        if (!existing.socialId && socialId) updateData.socialId = socialId
      }

      if (optIn) {
        if (channel === "WHATSAPP") updateData.whatsappOptIn = true
        if (channel === "FACEBOOK") updateData.facebookOptIn = true
        if (channel === "INSTAGRAM") updateData.instagramOptIn = true
        if (rawEmail) updateData.emailOptIn = true
        updateData.optInSource = "IMPORT"
        updateData.optInAt = new Date()
      }

      await db.customer.update({
        where: { id: existing.id },
        data: updateData,
      })
      updated++
    } else {
      // Create brand new contact
      await db.customer.create({
        data: {
          channel,
          phone,
          socialId,
          socialUsername,
          source: "IMPORT",
          name: rawName || null,
          email: rawEmail || null,
          stage: rawStage || "NEW",
          loyaltyTier: rawLoyaltyTier || "BRONZE",
          totalSpent: rawTotalSpent,
          tags: rowTags,
          customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
          whatsappOptIn: channel === "WHATSAPP" ? optIn : false,
          facebookOptIn: channel === "FACEBOOK" ? optIn : true,
          instagramOptIn: channel === "INSTAGRAM" ? optIn : true,
          emailOptIn: rawEmail && optIn ? true : false,
          optInSource: optIn ? "IMPORT" : null,
          optInAt: optIn ? new Date() : null,
        },
      })
      created++
    }
  }

  return NextResponse.json({
    created,
    updated,
    skipped: skipped.length,
    total: parsed.rows.length,
    dedupStrategy,
    skipDetails: skipped.slice(0, 10),
  })
}))
