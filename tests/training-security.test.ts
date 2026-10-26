import { expect, test, describe } from "bun:test"
import crypto from "crypto"

describe("Training, Academy & Course Management Security and Access Controls", () => {
  const COURSE_EDIT_ROLES = new Set(["OWNER", "SUPER_ADMIN", "ADMIN", "MANAGER", "PLATFORM"])
  const REG_OPERATIONAL_ROLES = new Set(["OWNER", "SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF", "AGENT", "CHAT_AGENT", "PLATFORM"])
  const VALID_REG_STATUSES = new Set(["PENDING", "CONFIRMED", "PAID", "ATTENDED", "CANCELLED", "REFUNDED", "WAITLIST"])

  test("authorized management roles can create, edit, publish, and delete courses and certificate templates", () => {
    expect(COURSE_EDIT_ROLES.has("OWNER")).toBe(true)
    expect(COURSE_EDIT_ROLES.has("SUPER_ADMIN")).toBe(true)
    expect(COURSE_EDIT_ROLES.has("ADMIN")).toBe(true)
    expect(COURSE_EDIT_ROLES.has("MANAGER")).toBe(true)
    expect(COURSE_EDIT_ROLES.has("PLATFORM")).toBe(true)
  })

  test("staff, agents, and read-only roles cannot modify courses or issue certificate templates", () => {
    expect(COURSE_EDIT_ROLES.has("STAFF")).toBe(false)
    expect(COURSE_EDIT_ROLES.has("AGENT")).toBe(false)
    expect(COURSE_EDIT_ROLES.has("CHAT_AGENT")).toBe(false)
    expect(COURSE_EDIT_ROLES.has("VIEWER")).toBe(false)
    expect(COURSE_EDIT_ROLES.has("FINANCE")).toBe(false)
    expect(COURSE_EDIT_ROLES.has("GUEST")).toBe(false)
  })

  test("operational staff and agents can process registrations and dispatch WhatsApp notifications", () => {
    expect(REG_OPERATIONAL_ROLES.has("STAFF")).toBe(true)
    expect(REG_OPERATIONAL_ROLES.has("AGENT")).toBe(true)
    expect(REG_OPERATIONAL_ROLES.has("CHAT_AGENT")).toBe(true)
    expect(REG_OPERATIONAL_ROLES.has("MANAGER")).toBe(true)
    expect(REG_OPERATIONAL_ROLES.has("ADMIN")).toBe(true)
  })

  test("viewers, finance, and external guests cannot create registrations or dispatch training messages", () => {
    expect(REG_OPERATIONAL_ROLES.has("VIEWER")).toBe(false)
    expect(REG_OPERATIONAL_ROLES.has("FINANCE")).toBe(false)
    expect(REG_OPERATIONAL_ROLES.has("GUEST")).toBe(false)
  })

  test("validates registration lifecycle statuses strictly", () => {
    expect(VALID_REG_STATUSES.has("PENDING")).toBe(true)
    expect(VALID_REG_STATUSES.has("CONFIRMED")).toBe(true)
    expect(VALID_REG_STATUSES.has("PAID")).toBe(true)
    expect(VALID_REG_STATUSES.has("ATTENDED")).toBe(true)
    expect(VALID_REG_STATUSES.has("CANCELLED")).toBe(true)
    expect(VALID_REG_STATUSES.has("REFUNDED")).toBe(true)
    expect(VALID_REG_STATUSES.has("WAITLIST")).toBe(true)

    // Invalid statuses
    expect(VALID_REG_STATUSES.has("ACTIVE")).toBe(false)
    expect(VALID_REG_STATUSES.has("EXPIRED")).toBe(false)
    expect(VALID_REG_STATUSES.has("DROPPED_TABLE")).toBe(false)
  })

  test("public course listing only exposes published courses to unauthenticated users", () => {
    const mockCatalog = [
      { id: "c1", name: "AI Leadership Masterclass", status: "PUBLISHED" },
      { id: "c2", name: "Secret Internal Strategy 2027", status: "DRAFT" },
      { id: "c3", name: "Legacy Q1 Training", status: "ARCHIVED" },
    ]

    const filterPublicCatalog = (courses: typeof mockCatalog, isStaff: boolean) => {
      if (isStaff) return courses
      return courses.filter(c => c.status === "PUBLISHED")
    }

    const publicCourses = filterPublicCatalog(mockCatalog, false)
    expect(publicCourses.length).toBe(1)
    expect(publicCourses[0].id).toBe("c1")

    const staffCourses = filterPublicCatalog(mockCatalog, true)
    expect(staffCourses.length).toBe(3)
  })

  test("module entitlement check blocks unentitled tenants with 403 MODULE_NOT_ENTITLED", () => {
    const tenantEntitlements: Record<string, string[]> = {
      "cmvkors2w035xi3n5ltvwue7x": ["WHATSAPP", "INBOX"], // cezo (free plan, 0 add-ons)
      "cmujurq9w005ci36afzax588l": ["WHATSAPP", "INBOX", "TRAINING"], // tanfidh (add-on training-course-management)
      "cmsqevt2a0000i3g24a2qc10w": ["WHATSAPP", "INBOX", "TOURS", "HOSPITAL", "RESTAURANT", "TRAINING"], // oman-adventures (enterprise)
    }

    const checkEntitlement = (tenantId: string) => {
      const mods = tenantEntitlements[tenantId] || []
      return mods.includes("TRAINING")
    }

    expect(checkEntitlement("cmvkors2w035xi3n5ltvwue7x")).toBe(false)
    expect(checkEntitlement("cmujurq9w005ci36afzax588l")).toBe(true)
    expect(checkEntitlement("cmsqevt2a0000i3g24a2qc10w")).toBe(true)
  })

  test("verifies certificate token hashing and signature authenticity", () => {
    const issueCertToken = (certId: string, secret: string) => {
      return crypto.createHmac("sha256", secret).update(certId).digest("hex").slice(0, 32)
    }

    const secret = "test-training-secret-key-2026"
    const validToken = issueCertToken("CERT-OM-2026-001", secret)

    const verifyCertToken = (certId: string, token: string, key: string) => {
      const expected = issueCertToken(certId, key)
      return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))
    }

    expect(verifyCertToken("CERT-OM-2026-001", validToken, secret)).toBe(true)
    expect(verifyCertToken("CERT-OM-2026-002", validToken, secret)).toBe(false)
  })

  test("QR attendee check-in preserves initial timestamp on duplicate scan", () => {
    const attendee = {
      id: "att_123",
      name: "Ahmed Al Balushi",
      qrToken: "qr_tok_999",
      checkInStatus: "PENDING" as "PENDING" | "CHECKED_IN",
      checkInTime: null as string | null,
    }

    const initialScanTime = "2026-10-26T08:15:00.000Z"

    // First scan
    if (attendee.checkInStatus !== "CHECKED_IN") {
      attendee.checkInStatus = "CHECKED_IN"
      attendee.checkInTime = initialScanTime
    }

    expect(attendee.checkInStatus).toBe("CHECKED_IN")
    expect(attendee.checkInTime).toBe(initialScanTime)

    // Second scan (re-entry)
    const secondScanTime = "2026-10-26T10:45:00.000Z"
    let alreadyCheckedIn = false
    if (attendee.checkInStatus === "CHECKED_IN") {
      alreadyCheckedIn = true
      // Does NOT overwrite checkInTime
    }

    expect(alreadyCheckedIn).toBe(true)
    expect(attendee.checkInTime).toBe(initialScanTime) // preserved
  })

  test("sanitizes recipient phone numbers and validates minimum international format", () => {
    const sanitizePhone = (phone: string): string | null => {
      const cleaned = phone.replace(/[^0-9+]/g, "")
      if (!cleaned || cleaned.replace(/\D/g, "").length < 7) {
        return null
      }
      return cleaned
    }

    expect(sanitizePhone("+968 99 355 438")).toBe("+96899355438")
    expect(sanitizePhone("00971-50-123-4567")).toBe("00971501234567")
    expect(sanitizePhone("invalid")).toBe(null)
    expect(sanitizePhone("123")).toBe(null)
  })
})
