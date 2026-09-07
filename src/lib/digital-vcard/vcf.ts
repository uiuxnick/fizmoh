export interface VCardContactInput {
  fullName?: string | null
  firstName?: string | null
  lastName?: string | null
  organization?: string | null
  title?: string | null
  department?: string | null
  mobile?: string | null
  whatsapp?: string | null
  landline?: string | null
  email?: string | null
  altEmail?: string | null
  website?: string | null
  cardUrl?: string | null
  streetAddress?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
  note?: string | null
  latitude?: number | null
  longitude?: number | null
}

function escapeVCardValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n")
}

/**
 * Generates an RFC 6350 / vCard 3.0 compliant contact string.
 * Formatted with strict \r\n line terminators for universal Android & iOS compatibility.
 */
export function generateVcfString(contact: VCardContactInput): string {
  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "PRODID:-//Fizmoh Cloud//Digital Business Card//EN",
  ]

  // Name handling
  let fn = contact.fullName?.trim() || ""
  let firstName = contact.firstName?.trim() || ""
  let lastName = contact.lastName?.trim() || ""

  if (!fn && (firstName || lastName)) {
    fn = [firstName, lastName].filter(Boolean).join(" ")
  } else if (fn && !firstName && !lastName) {
    const parts = fn.split(/\s+/)
    if (parts.length > 1) {
      firstName = parts.slice(0, -1).join(" ")
      lastName = parts[parts.length - 1]
    } else {
      firstName = fn
      lastName = ""
    }
  }

  if (fn) {
    lines.push(`FN:${escapeVCardValue(fn)}`)
    lines.push(`N:${escapeVCardValue(lastName)};${escapeVCardValue(firstName)};;;`)
  } else if (contact.organization) {
    lines.push(`FN:${escapeVCardValue(contact.organization)}`)
    lines.push(`N:;;;;`)
  }

  // Organization & Title
  if (contact.organization) {
    const org = contact.department
      ? `${escapeVCardValue(contact.organization)};${escapeVCardValue(contact.department)}`
      : escapeVCardValue(contact.organization)
    lines.push(`ORG:${org}`)
  }

  if (contact.title) {
    lines.push(`TITLE:${escapeVCardValue(contact.title)}`)
  }

  // Phone numbers
  if (contact.mobile) {
    lines.push(`TEL;TYPE=CELL,VOICE,pref:${contact.mobile.trim()}`)
  }
  if (contact.whatsapp && contact.whatsapp !== contact.mobile) {
    lines.push(`TEL;TYPE=WORK,VOICE:${contact.whatsapp.trim()}`)
  }
  if (contact.landline) {
    lines.push(`TEL;TYPE=WORK,VOICE:${contact.landline.trim()}`)
  }

  // Emails
  if (contact.email) {
    lines.push(`EMAIL;TYPE=INTERNET,WORK,pref:${contact.email.trim()}`)
  }
  if (contact.altEmail && contact.altEmail !== contact.email) {
    lines.push(`EMAIL;TYPE=INTERNET,HOME:${contact.altEmail.trim()}`)
  }

  // URLs
  if (contact.cardUrl) {
    lines.push(`URL;TYPE=WORK,pref:${contact.cardUrl.trim()}`)
  }
  if (contact.website && contact.website !== contact.cardUrl) {
    lines.push(`URL;TYPE=WORK:${contact.website.trim()}`)
  }

  // Address: ADR:;;Street;City;State;PostalCode;Country
  if (
    contact.streetAddress ||
    contact.city ||
    contact.state ||
    contact.postalCode ||
    contact.country
  ) {
    const street = contact.streetAddress ? escapeVCardValue(contact.streetAddress) : ""
    const city = contact.city ? escapeVCardValue(contact.city) : ""
    const state = contact.state ? escapeVCardValue(contact.state) : ""
    const postal = contact.postalCode ? escapeVCardValue(contact.postalCode) : ""
    const country = contact.country ? escapeVCardValue(contact.country) : ""
    lines.push(`ADR;TYPE=WORK:;;${street};${city};${state};${postal};${country}`)
  }

  // Geo Location
  if (
    typeof contact.latitude === "number" &&
    typeof contact.longitude === "number" &&
    !isNaN(contact.latitude) &&
    !isNaN(contact.longitude)
  ) {
    lines.push(`GEO:${contact.latitude.toFixed(6)};${contact.longitude.toFixed(6)}`)
  }

  // Notes
  if (contact.note) {
    lines.push(`NOTE:${escapeVCardValue(contact.note)}`)
  }

  lines.push(`REV:${new Date().toISOString()}`)
  lines.push("END:VCARD")

  return lines.join("\r\n") + "\r\n"
}
