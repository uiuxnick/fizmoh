/**
 * Executive One-Shot Entity Extractor
 *
 * GCC and Omani C-suite executives, directors, and engineers often send all their
 * registration details in a single sentence or voice note transcript:
 * "Hi, this is Eng. Salim Al Maamari from PDO, salim@pdo.co.om. I want to book 2 seats for the October BSC masterclass."
 *
 * This extractor parses those unstructured executive messages into structured booking fields
 * so the conversational bot doesn't subject them to repetitive robotic forms.
 */

export interface ExtractedExecutive {
  fullName?: string
  email?: string
  phone?: string
  company?: string
  numberOfSeats?: number
  courseKeyword?: "BSC" | "KPI" | "STRATEGY" | "PERF" | "EXEC" | "SE_BSC"
  preferredMonth?: "OCT" | "NOV" | "DEC"
  preferredSlot?: string
  secondAttendeeName?: string
  hasMultipleFields: boolean
}

export function extractExecutiveDetails(text: string, currentPhone?: string): ExtractedExecutive {
  const raw = String(text || "").trim()
  if (!raw) return { hasMultipleFields: false }

  const res: ExtractedExecutive = { hasMultipleFields: false }

  // 1. Email extraction
  const emailMatch = raw.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/i)
  if (emailMatch) {
    res.email = emailMatch[1].trim()
  }

  // 2. Phone extraction (+968 9XXXXXXX, 9XXXXXXX, 7XXXXXXX, or international)
  const phoneMatch = raw.match(/(?:(?:\+|00)968\s*)?[79]\d{7}\b|\+?\d{9,15}\b/)
  if (phoneMatch) {
    res.phone = phoneMatch[0].replace(/\s+/g, "")
  } else if (currentPhone) {
    res.phone = currentPhone
  }

  // 3. Name & Title extraction (Eng. Salim Al Maamari, Dr. Ahmed, Sheikh, Mr., etc.)
  const nameWithTitleMatch = raw.match(/(?:(?:this is|I am|name is|I'm)\s+)?((?:Eng\.?|Dr\.?|Sheikh|Mr\.?|Ms\.?|Mrs\.?)\s+[A-Za-z\u0600-\u06FF]+(?:\s+[A-Za-z\u0600-\u06FF]+){1,3})/i)
  const introMatch = raw.match(/(?:this is|I am|I'm|myself)\s+([A-Za-z\u0600-\u06FF]+(?:\s+[A-Za-z\u0600-\u06FF]+){1,3})/i)

  if (nameWithTitleMatch) {
    res.fullName = nameWithTitleMatch[1].replace(/\s+(?:from|at|with)\s*$/i, "").trim()
  } else if (introMatch) {
    res.fullName = introMatch[1].replace(/\s+(?:from|at|with)\s*$/i, "").trim()
  }

  // 4. Company extraction ("from PDO", "at Petroleum Development Oman", "from Bank Muscat")
  const companyMatch = raw.match(/\b(?:from|at|working at|company is|organization is|with)\s+([A-Za-z0-9\u0600-\u06FF&.\s]+?)(?:,|\.|\s+and\b|\s+salim|\s+I\b|\s+my\b|\s+email|\s+phone|\s+we\b|$)/i)
  if (companyMatch) {
    const comp = companyMatch[1].trim()
    if (comp.length >= 2 && comp.length <= 50 && !/^(booking|course|masterclass|the|a|an)$/i.test(comp)) {
      res.company = comp
    }
  }

  // 5. Seats extraction ("2 seats", "two seats", "3 participants")
  const seatsMatch = raw.match(/\b(\d+)\s*(?:seats?|places?|participants?|delegates?|attendees?)\b/i)
  if (seatsMatch) {
    res.numberOfSeats = parseInt(seatsMatch[1], 10)
  } else if (/\b(two|both of us|me and my colleague|2 of us)\b/i.test(raw)) {
    res.numberOfSeats = 2
  }

  // 6. Course & Cohort extraction
  if (/\b(bsc|scorecard|balanced scorecard)\b/i.test(raw)) {
    res.courseKeyword = "BSC"
  } else if (/\b(kpi|indicators?)\b/i.test(raw)) {
    res.courseKeyword = "KPI"
  } else if (/\b(strategy pro|certified strategy)\b/i.test(raw)) {
    res.courseKeyword = "STRATEGY"
  } else if (/\b(performance|performance management)\b/i.test(raw)) {
    res.courseKeyword = "PERF"
  } else if (/\b(execution|strategy execution)\b/i.test(raw)) {
    res.courseKeyword = /\bscorecard\b/i.test(raw) ? "SE_BSC" : "EXEC"
  }

  // Month / slot extraction
  if (/\b(october|oct|13|14)\b/i.test(raw)) {
    res.preferredMonth = "OCT"
    if (res.courseKeyword === "BSC") res.preferredSlot = "13–14 Oct 2026"
  } else if (/\b(december|dec|14|15)\b/i.test(raw)) {
    res.preferredMonth = "DEC"
    if (res.courseKeyword === "BSC") res.preferredSlot = "14–15 Dec 2026"
  } else if (/\b(november|nov)\b/i.test(raw)) {
    res.preferredMonth = "NOV"
  }

  // Check how many key registration fields were provided
  let count = 0
  if (res.email) count++
  if (res.fullName) count++
  if (res.company) count++
  if (res.phone && res.phone !== currentPhone) count++
  if (res.numberOfSeats) count++

  res.hasMultipleFields = count >= 2 || Boolean(res.email && (res.fullName || res.company))

  return res
}
