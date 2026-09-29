import { Prisma } from "@prisma/client"

/**
 * Turning segment rules into a database query and dynamic in-memory evaluation.
 *
 * Per BRD §6.5.3: "Send broadcast campaigns to segmented subscriber lists"
 * Per BRD §6.5.4: "Central WhatsApp subscriber database with tags, custom fields, consent/opt-in status"
 */

export type Rule = {
  field: string
  op: string
  value?: unknown
  key?: string
}

export type SegmentRule = Rule

export function parseFilterRules(raw: unknown): Rule[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as Rule[]
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as Rule[]
    } catch {
      return []
    }
  }
  return []
}

export function buildSegmentWhere(rules: Rule[]): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = {}
  const and: Prisma.CustomerWhereInput[] = []

  for (const rule of rules) {
    if (!rule || !rule.field) continue
    const { field, op, value, key } = rule

    // Numeric Metrics
    if (field === "totalSpent" || field === "totalBookings" || field === "lifetimeValue" || field === "loyaltyPoints") {
      const n = Number(value)
      if (!Number.isFinite(n)) continue
      const condition =
        op === "gt" ? { gt: n } :
        op === "gte" ? { gte: n } :
        op === "lt" ? { lt: n } :
        op === "lte" ? { lte: n } :
        op === "neq" ? { not: n } : n
      and.push({ [field]: condition } as Prisma.CustomerWhereInput)
    }

    // String Enums / Fields
    else if (field === "preferredLang" || field === "preferredCurrency" || field === "stage" || field === "loyaltyTier") {
      const strVal = String(value || "").trim()
      if (!strVal) continue
      if (op === "neq") {
        and.push({ [field]: { not: strVal } } as Prisma.CustomerWhereInput)
      } else {
        and.push({ [field]: strVal } as Prisma.CustomerWhereInput)
      }
    }

    // Channel Filtering
    else if (field === "channel") {
      const ch = String(value || "").trim().toUpperCase()
      if (ch && ch !== "ALL") {
        if (op === "neq") {
          and.push({ channel: { not: ch } })
        } else {
          and.push({ channel: ch })
        }
      }
    }

    // Status / Consent Filter
    else if (field === "status") {
      const statusVal = String(value || "").toLowerCase()
      if (statusVal === "opted_in") {
        and.push({
          OR: [
            { whatsappOptIn: true },
            { facebookOptIn: true },
            { instagramOptIn: true },
            { emailOptIn: true },
          ]
        })
      } else if (statusVal === "opted_out") {
        and.push({
          AND: [
            { whatsappOptIn: false },
            { facebookOptIn: false },
            { instagramOptIn: false },
          ]
        })
      }
    }

    // Dates
    else if (field === "createdAt" || field === "lastContactAt") {
      if (op === "within_days") {
        const days = Number(value) || 30
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        and.push({ [field]: { gte: cutoff } } as Prisma.CustomerWhereInput)
      } else if (op === "older_than_days") {
        const days = Number(value) || 30
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        and.push({ [field]: { lte: cutoff } } as Prisma.CustomerWhereInput)
      } else {
        const date = new Date(String(value))
        if (!Number.isNaN(date.getTime())) {
          and.push({
            [field]: op === "gt" || op === "after" ? { gt: date } : { lt: date }
          } as Prisma.CustomerWhereInput)
        }
      }
    }

    // Tag / Label Rules
    else if (field === "tag") {
      const tag = String(value || "").trim()
      if (!tag) continue
      const clause: Prisma.CustomerWhereInput =
        op === "not_contains"
          ? { NOT: { tags: { string_contains: tag } } }
          : { tags: { string_contains: tag } }
      and.push(clause)
    }

    // Custom Field Rules
    else if (field === "customField" || field.startsWith("customFields.")) {
      const propKey = key || field.replace(/^customFields\./, "")
      if (propKey) {
        if (op === "exists") {
          and.push({
            customFields: {
              path: [propKey],
              not: Prisma.DbNull,
            }
          })
        } else if (value !== undefined && value !== null && value !== "") {
          const valStr = String(value).trim()
          if (op === "eq") {
            and.push({
              customFields: {
                path: [propKey],
                equals: valStr,
              }
            })
          } else if (op === "contains") {
            and.push({
              customFields: {
                path: [propKey],
                string_contains: valStr,
              }
            })
          }
        }
      }
    }
  }

  if (and.length > 0) where.AND = and
  return where
}

/** The opt-in a channel requires. Sending without it is not a bug, it is a fine. */
export function consentFilter(channel: string): Prisma.CustomerWhereInput {
  if (channel === "EMAIL") {
    return { emailOptIn: true, email: { not: null } }
  }
  if (channel === "FACEBOOK") {
    return { channel: "FACEBOOK", facebookOptIn: true, socialId: { not: null } }
  }
  if (channel === "INSTAGRAM") {
    return { channel: "INSTAGRAM", instagramOptIn: true, socialId: { not: null } }
  }
  if (channel === "ALL" || channel === "BOTH") {
    return {
      OR: [
        { channel: "WHATSAPP", whatsappOptIn: true },
        { channel: "FACEBOOK", facebookOptIn: true },
        { channel: "INSTAGRAM", instagramOptIn: true },
        { emailOptIn: true },
      ]
    }
  }
  return { channel: "WHATSAPP", whatsappOptIn: true }
}

/**
 * In-memory segment rule matching for a customer / subscriber object.
 * Fast, synchronous, works on normalized subscriber objects or raw DB objects.
 */
export function matchesSegment(
  customer: any,
  rules: Rule[] | null | undefined,
  segmentChannel?: string
): boolean {
  if (!customer) return false

  // 1. Channel Filter
  const ch = String(segmentChannel || "ALL").toUpperCase()
  const custChannel = String(customer.channel || "WHATSAPP").toUpperCase()
  if (ch !== "ALL" && ch !== "BOTH" && custChannel !== ch) {
    return false
  }

  const parsedRules = parseFilterRules(rules)
  if (parsedRules.length === 0) return true

  // Helper: extract tags
  const tags: string[] = []
  if (Array.isArray(customer.tagList)) {
    tags.push(...customer.tagList)
  }
  if (Array.isArray(customer.tags)) {
    tags.push(...customer.tags)
  } else if (typeof customer.tags === "string") {
    try {
      const p = JSON.parse(customer.tags)
      if (Array.isArray(p)) tags.push(...p)
    } catch {
      tags.push(customer.tags)
    }
  }
  const normalizedTags = tags.map(t => String(t).toLowerCase().trim()).filter(Boolean)

  // Helper: extract custom fields
  let customFields: Record<string, any> = {}
  if (customer.customFields) {
    if (typeof customer.customFields === "object" && !Array.isArray(customer.customFields)) {
      customFields = customer.customFields
    } else if (typeof customer.customFields === "string") {
      try {
        customFields = JSON.parse(customer.customFields)
      } catch {
        // empty
      }
    }
  }

  // 2. Evaluate all rules (AND condition)
  for (const rule of parsedRules) {
    if (!rule || !rule.field) continue
    const { field, op, value, key } = rule

    // Tag Rule
    if (field === "tag") {
      const targetTag = String(value || "").toLowerCase().trim()
      if (!targetTag) continue
      const hasTag = normalizedTags.some(t => t.includes(targetTag) || targetTag.includes(t))
      if (op === "not_contains" && hasTag) return false
      if (op !== "not_contains" && !hasTag) return false
    }

    // Channel Rule
    else if (field === "channel") {
      const targetCh = String(value || "").toUpperCase().trim()
      if (targetCh && targetCh !== "ALL") {
        if (op === "neq" && custChannel === targetCh) return false
        if (op !== "neq" && custChannel !== targetCh) return false
      }
    }

    // Status / Consent Rule
    else if (field === "status") {
      const targetStatus = String(value || "").toLowerCase().trim()
      const isOptedIn = Boolean(
        customer.isSubscribed ??
        (custChannel === "WHATSAPP" ? customer.whatsappOptIn :
         custChannel === "FACEBOOK" ? customer.facebookOptIn :
         custChannel === "INSTAGRAM" ? customer.instagramOptIn :
         customer.whatsappOptIn || customer.facebookOptIn || customer.instagramOptIn || customer.emailOptIn)
      )
      if (targetStatus === "opted_in" && !isOptedIn) return false
      if (targetStatus === "opted_out" && isOptedIn) return false
    }

    // CRM Stage
    else if (field === "stage") {
      const targetStage = String(value || "").toUpperCase().trim()
      const custStage = String(customer.stage || "NEW").toUpperCase().trim()
      if (op === "neq" && custStage === targetStage) return false
      if (op !== "neq" && custStage !== targetStage) return false
    }

    // Loyalty Tier
    else if (field === "loyaltyTier") {
      const targetTier = String(value || "").toUpperCase().trim()
      const custTier = String(customer.loyaltyTier || "BRONZE").toUpperCase().trim()
      if (op === "neq" && custTier === targetTier) return false
      if (op !== "neq" && custTier !== targetTier) return false
    }

    // Numeric Metrics
    else if (field === "totalSpent" || field === "totalBookings" || field === "lifetimeValue" || field === "loyaltyPoints") {
      const custNum = Number(customer[field] ?? 0)
      const targetNum = Number(value ?? 0)
      if (Number.isFinite(targetNum)) {
        if (op === "gt" && !(custNum > targetNum)) return false
        if (op === "gte" && !(custNum >= targetNum)) return false
        if (op === "lt" && !(custNum < targetNum)) return false
        if (op === "lte" && !(custNum <= targetNum)) return false
        if (op === "eq" && custNum !== targetNum) return false
        if (op === "neq" && custNum === targetNum) return false
      }
    }

    // Language / Currency
    else if (field === "preferredLang" || field === "preferredCurrency") {
      const custVal = String(customer[field] || "").toLowerCase().trim()
      const targetVal = String(value || "").toLowerCase().trim()
      if (op === "neq" && custVal === targetVal) return false
      if (op !== "neq" && custVal !== targetVal) return false
    }

    // Dates
    else if (field === "createdAt" || field === "lastContactAt") {
      const rawDate = customer[field]
      if (!rawDate) {
        if (op === "within_days") return false
        continue
      }
      const custDate = new Date(rawDate).getTime()
      if (Number.isNaN(custDate)) continue

      if (op === "within_days") {
        const days = Number(value) || 30
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
        if (custDate < cutoff) return false
      } else if (op === "older_than_days") {
        const days = Number(value) || 30
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
        if (custDate > cutoff) return false
      } else {
        const targetDate = new Date(String(value)).getTime()
        if (!Number.isNaN(targetDate)) {
          if ((op === "gt" || op === "after") && !(custDate > targetDate)) return false
          if ((op === "lt" || op === "before") && !(custDate < targetDate)) return false
        }
      }
    }

    // Custom CRM Field Rule
    else if (field === "customField" || field.startsWith("customFields.")) {
      const propKey = key || field.replace(/^customFields\./, "")
      if (propKey) {
        const actualVal = customFields[propKey]
        if (op === "exists") {
          if (actualVal === undefined || actualVal === null || actualVal === "") return false
        } else {
          const targetStr = String(value ?? "").toLowerCase().trim()
          const actualStr = String(actualVal ?? "").toLowerCase().trim()

          if (op === "eq" && actualStr !== targetStr) return false
          if (op === "neq" && actualStr === targetStr) return false
          if (op === "contains" && !actualStr.includes(targetStr)) return false
          if (op === "gt" || op === "gte" || op === "lt" || op === "lte") {
            const actualNum = Number(actualVal)
            const targetNum = Number(value)
            if (Number.isFinite(actualNum) && Number.isFinite(targetNum)) {
              if (op === "gt" && !(actualNum > targetNum)) return false
              if (op === "gte" && !(actualNum >= targetNum)) return false
              if (op === "lt" && !(actualNum < targetNum)) return false
              if (op === "lte" && !(actualNum <= targetNum)) return false
            } else {
              return false
            }
          }
        }
      }
    }
  }

  return true
}
