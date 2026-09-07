/**
 * Shared CSV building — pulled out because every export route in the app
 * (subscribers, reports, campaign recipients) had been writing its own copy of
 * the same RFC 4180 escaping. One implementation now; a bug in quoting fixed
 * once instead of found separately in each export.
 */

function escapeCsvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header.map(escapeCsvCell).join(",")]
  for (const row of rows) lines.push(row.map(escapeCsvCell).join(","))
  return lines.join("\n")
}

export function csvResponseHeaders(filename: string): HeadersInit {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
  }
}
