import { db } from "@/lib/db"

export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "dashboard",
  "card",
  "vcard",
  "login",
  "register",
  "signup",
  "settings",
  "downloads",
  "docs",
  "platform",
  "billing",
  "site",
  "whatsapp",
  "terms",
  "privacy",
  "help",
  "support",
  "auth",
  "app",
  "fizmoh",
  "explore",
  "pricing",
  "features",
  "status",
  "webhooks",
  "tours",
  "restaurant",
  "hospital",
  "inbox",
  "crm",
  "analytics",
  "root",
  "system",
  "public",
  "static",
  "media",
  "upload",
  "qr",
])

/**
 * Normalizes an arbitrary text string into a URL-friendly slug.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFKD") // separate diacritics
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s-]/g, "") // remove non-alphanumerics
    .replace(/[\s_]+/g, "-") // collapse spaces and underscores to single dash
    .replace(/-+/g, "-") // collapse multiple dashes
    .replace(/^-+|-+$/g, "") // trim leading/trailing dashes
    .slice(0, 64)
}

/**
 * Checks whether a given slug is reserved by the platform.
 */
export function isReservedSlug(slug: string): boolean {
  const normalized = slugify(slug)
  return RESERVED_SLUGS.has(normalized)
}

/**
 * Validates a slug format: 3-64 chars, lowercase alphanumeric and single dashes, not reserved.
 */
export function validateSlug(slug: string): { valid: boolean; error?: string } {
  if (slug.length < 3) {
    return { valid: false, error: "Slug must be at least 3 characters long." }
  }
  if (slug.length > 64) {
    return { valid: false, error: "Slug cannot exceed 64 characters." }
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { valid: false, error: "Slug can only contain lowercase letters, numbers, and single hyphens." }
  }
  if (isReservedSlug(slug)) {
    return { valid: false, error: `'${slug}' is a reserved URL path and cannot be used.` }
  }
  return { valid: true }
}

/**
 * Checks whether a slug is available in the database (unscoped to check global uniqueness across all tenants for public /card/[slug]).
 */
export async function isSlugAvailable(slug: string, excludeCardId?: string): Promise<boolean> {
  const validation = validateSlug(slug)
  if (!validation.valid) return false

  const existing = await (db as any).businessVCard.findFirst({
    where: {
      slug: slugify(slug),
      ...(excludeCardId ? { id: { not: excludeCardId } } : {}),
    },
    select: { id: true },
  })

  return !existing
}

/**
 * Generates an available unique slug by appending incremental numeric suffixes if needed.
 */
export async function suggestAvailableSlug(baseText: string, excludeCardId?: string): Promise<string> {
  let base = slugify(baseText)
  if (base.length < 3) base = "business"
  if (isReservedSlug(base)) base = `${base}-card`

  let candidate = base
  let counter = 1

  while (!(await isSlugAvailable(candidate, excludeCardId))) {
    candidate = `${base}-${counter}`
    counter++
  }

  return candidate
}
