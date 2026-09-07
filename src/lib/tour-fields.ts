/**
 * Shared validation for tour create and update.
 *
 * Both routes previously spread the request body straight into Prisma, which
 * let a caller set `rating` and `reviewCount` — the numbers the customer site
 * shows as social proof — to anything they liked. Everything writable is
 * listed here explicitly; anything absent is derived and stays server-owned.
 */

const TEXT_FIELDS = [
  "name", "nameAr", "description", "descriptionAr", "category", "city",
  "location", "meetingPoint", "difficulty", "status", "currency",
  "seoTitle", "seoDescription", "cancellationPolicy", "slug",
] as const

const NUMBER_FIELDS = [
  "basePrice", "childPrice", "groupPrice", "durationHours",
  "capacityPerSlot", "latitude", "longitude", "meetingLat", "meetingLng",
] as const

const JSON_FIELDS = ["media", "itinerary", "inclusions", "exclusions", "whatToBring", "pricingTiers"] as const

export const TOUR_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]
export const TOUR_DIFFICULTIES = ["EASY", "MODERATE", "HARD"]

/** Latitude and longitude are the two numbers here that are legitimately negative. */
const SIGNED_FIELDS = new Set(["latitude", "longitude", "meetingLat", "meetingLng"])

export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
  // A name written entirely in Arabic strips to nothing, and an empty slug
  // would collide with every other such tour on the unique constraint.
  return slug || `tour-${Date.now().toString(36)}`
}

export function buildTourData(body: Record<string, unknown>): { data?: Record<string, unknown>; error?: string } {
  const data: Record<string, unknown> = {}

  for (const field of TEXT_FIELDS) {
    if (body[field] === undefined) continue
    const value = body[field]
    data[field] = value === "" || value === null ? null : String(value).slice(0, 5000)
  }

  for (const field of NUMBER_FIELDS) {
    if (body[field] === undefined) continue
    if (body[field] === null || body[field] === "") { data[field] = null; continue }
    const n = Number(body[field])
    if (!Number.isFinite(n)) return { error: `Invalid ${field}` }
    if (n < 0 && !SIGNED_FIELDS.has(field)) return { error: `${field} cannot be negative` }
    data[field] = field === "capacityPerSlot" ? Math.round(n) : n
  }

  for (const field of JSON_FIELDS) {
    if (body[field] === undefined) continue
    // Stored as a JSON string rather than a JSON array: every reader, including
    // the live customer site, calls JSON.parse on it. Changing the shape would
    // need a data migration, so keep it.
    data[field] = JSON.stringify(body[field] ?? [])
  }

  if (typeof body.featured === "boolean") data.featured = body.featured

  if (data.status !== undefined && !TOUR_STATUSES.includes(String(data.status))) {
    return { error: `Unknown status "${data.status}"` }
  }
  if (data.difficulty !== undefined && !TOUR_DIFFICULTIES.includes(String(data.difficulty))) {
    return { error: `Unknown difficulty "${data.difficulty}"` }
  }
  if (data.name !== undefined && !String(data.name || "").trim()) {
    return { error: "Name is required" }
  }
  if (data.capacityPerSlot !== undefined && Number(data.capacityPerSlot) < 1) {
    return { error: "Capacity must be at least 1" }
  }

  return { data }
}
