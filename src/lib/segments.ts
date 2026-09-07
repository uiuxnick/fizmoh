import { Prisma } from "@prisma/client"

/**
 * Turning segment rules into a database query.
 *
 * Lived inside the campaign send route, where nothing else could reach it —
 * so the screen that chooses an audience had no way to count that audience,
 * and an operator pressed send without knowing whether it was going to four
 * people or four thousand.
 */

export type Rule = { field: string; op: string; value: unknown }

export function buildSegmentWhere(rules: Rule[]): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = {}
  const and: Prisma.CustomerWhereInput[] = []

  for (const rule of rules) {
    const { field, op, value } = rule

    if (field === "totalSpent" || field === "totalBookings") {
      const n = Number(value)
      if (!Number.isFinite(n)) continue
      Object.assign(where, {
        [field]: op === "gt" ? { gt: n } : op === "lt" ? { lt: n } : n,
      })
    } else if (field === "preferredLang" || field === "preferredCurrency") {
      Object.assign(where, { [field]: String(value) })
    } else if (field === "createdAt") {
      const date = new Date(String(value))
      if (Number.isNaN(date.getTime())) continue
      where.createdAt = op === "gt" ? { gt: date } : { lt: date }
    } else if (field === "tag") {
      /*
       * Tags are a JSON array held as a string, so there is no array operator
       * to use — `contains` on the serialised text is what is available. It
       * matches a tag that is a substring of another, which for labels people
       * actually type ("VIP", "repeat guest") is a trade worth making against
       * reading every customer into memory to filter them.
       */
      const tag = String(value).trim()
      if (!tag) continue
      const clause: Prisma.CustomerWhereInput =
        op === "not_contains"
          ? { NOT: { tags: { string_contains: tag } } }
          : { tags: { string_contains: tag } }
      and.push(clause)
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
  return { channel: "WHATSAPP", whatsappOptIn: true }
}
