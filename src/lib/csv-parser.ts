/**
 * Robust RFC-4180 compliant CSV Parser & Column Mapping Heuristics
 */

export interface ParsedCsv {
  headers: string[]
  rows: string[][]
  rowCount: number
}

/**
 * Parses CSV text taking quotes, escaped quotes, and newlines into account.
 */
export function parseCsvText(text: string): ParsedCsv {
  const clean = text.trim()
  if (!clean) return { headers: [], rows: [], rowCount: 0 }

  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ""
  let inQuotes = false

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]
    const nextChar = clean[i + 1]

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"'
        i++ // Skip escaped quote
      } else if (char === '"') {
        inQuotes = false
      } else {
        currentField += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === "," || char === "\t" || char === ";") {
        currentRow.push(currentField.trim())
        currentField = ""
      } else if (char === "\r") {
        // Carriage return: check if next is \n
        if (nextChar === "\n") i++
        currentRow.push(currentField.trim())
        if (currentRow.some(c => c.length > 0)) rows.push(currentRow)
        currentRow = []
        currentField = ""
      } else if (char === "\n") {
        currentRow.push(currentField.trim())
        if (currentRow.some(c => c.length > 0)) rows.push(currentRow)
        currentRow = []
        currentField = ""
      } else {
        currentField += char
      }
    }
  }

  // Push final trailing field & row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim())
    if (currentRow.some(c => c.length > 0)) rows.push(currentRow)
  }

  if (rows.length === 0) return { headers: [], rows: [], rowCount: 0 }

  const headers = rows[0].map(h => h.replace(/^["']|["']$/g, "").trim())
  const dataRows = rows.slice(1)

  return {
    headers,
    rows: dataRows,
    rowCount: dataRows.length,
  }
}

/**
 * Smart mapping heuristics: guesses target field based on CSV header name.
 */
export function guessColumnMapping(
  header: string,
  customFieldKeys: string[] = []
): string {
  const norm = header.toLowerCase().replace(/[^a-z0-9]/g, "")

  if (norm.includes("phone") || norm.includes("mobile") || norm.includes("whatsapp") || ["tel", "cell", "contactno"].includes(norm)) {
    return "phone"
  }
  if (norm.includes("name") || ["customer", "client", "subscriber"].includes(norm)) {
    return "name"
  }
  if (norm.includes("email") || norm.includes("mail")) {
    return "email"
  }
  if (["channel", "platform", "sourcechannel"].includes(norm)) {
    return "channel"
  }
  if (norm.includes("instagram") || norm.includes("handle") || ["username", "ig", "socialusername"].includes(norm)) {
    return "socialUsername"
  }
  if (norm.includes("stage") || ["pipeline", "pipelinestage", "leadstage", "status"].includes(norm)) {
    return "stage"
  }
  if (["tag", "tags", "customertags", "label", "labels", "group", "groups", "category"].includes(norm) || norm.startsWith("tag") || norm.endsWith("tag") || norm.endsWith("tags") || norm.includes("label")) {
    return "tags"
  }
  if (norm.includes("tier") || ["loyaltytier", "vip", "membership"].includes(norm)) {
    return "loyaltyTier"
  }
  if (norm.includes("spent") || norm.includes("revenue") || ["amountspent", "totalsales"].includes(norm)) {
    return "totalSpent"
  }

  // Check matching custom field keys
  for (const cfKey of customFieldKeys) {
    const cfNorm = cfKey.toLowerCase().replace(/[^a-z0-9]/g, "")
    if (norm === cfNorm || norm.includes(cfNorm) || cfNorm.includes(norm)) {
      return `customField:${cfKey}`
    }
    const cfParts = cfKey.toLowerCase().split(/[_\s-]+/).filter(p => p.length >= 3)
    if (cfParts.some(p => norm.includes(p))) {
      return `customField:${cfKey}`
    }
  }

  return "skip"
}
