import { describe, it, expect } from "bun:test"
import {
  formatCourseDates,
  issueAttendeeCertificate,
  updateCertificateRecord,
  updateAttendeeDetails,
} from "@/lib/training-service"
import {
  calculateRegistrationPricing,
  Course,
  interpolateCertificateVariables,
} from "@/lib/training-types"

describe("Certificate Customization & VAT Features", () => {
  describe("formatCourseDates", () => {
    it("formats same-month dates nicely", () => {
      const dates = formatCourseDates("2026-10-14", "2026-10-15")
      expect(dates).toBe("October 14–15, 2026")
    })

    it("formats cross-month dates nicely", () => {
      const dates = formatCourseDates("2026-10-30", "2026-11-02")
      expect(dates).toBe("October 30 – November 2, 2026")
    })

    it("handles single-day courses", () => {
      const dates = formatCourseDates("2026-10-14", "2026-10-14")
      expect(dates).toBe("October 14, 2026")
    })

    it("handles missing dates gracefully", () => {
      expect(formatCourseDates("", "")).toBe("")
    })
  })

  describe("VAT Removal & 0% Pricing", () => {
    it("calculates 0% VAT correctly when vatPercent is 0", () => {
      const courseWithZeroVat = {
        standardPrice: 500,
        currency: "OMR",
        offerType: "NONE",
        vatPercent: 0,
      } as Course

      const result = calculateRegistrationPricing(courseWithZeroVat, 1)
      expect(result.subtotal).toBe(500)
      expect(result.vatAmount).toBe(0)
      expect(result.totalAmount).toBe(500)
    })

    it("calculates 0% VAT correctly under BOGO offer when vatPercent is 0", () => {
      const courseWithZeroVatBogo = {
        standardPrice: 500,
        currency: "OMR",
        offerType: "BOGO",
        vatPercent: 0,
      } as Course

      const result = calculateRegistrationPricing(courseWithZeroVatBogo, 1)
      expect(result.subtotal).toBe(500)
      expect(result.paidSeats).toBe(1)
      expect(result.freeSeats).toBe(1)
      expect(result.vatAmount).toBe(0)
      expect(result.totalAmount).toBe(500)
    })
  })

  describe("interpolateCertificateVariables", () => {
    it("interpolates dynamic recipient and course tokens in template text", () => {
      const template =
        "Presented to {{recipient_name}} for completing {{course_name}} held on {{course_dates}} by {{trainer_name}} ({{trainer_designation}}) at {{company}}."
      const output = interpolateCertificateVariables(template, {
        recipientName: "Said bin Saif Al Harthi",
        courseName: "Balanced Scorecard Execution Mastery",
        courseDates: "October 14–15, 2026",
        trainerName: "Said Al Harthi",
        trainerDesignation: "Managing Consultant",
        trainerCompany: "Tanfidh Management Consultants",
      })

      expect(output).toBe(
        "Presented to Said bin Saif Al Harthi for completing Balanced Scorecard Execution Mastery held on October 14–15, 2026 by Said Al Harthi (Managing Consultant) at Tanfidh Management Consultants.",
      )
    })

    it("handles case-insensitive variable tokens with spaces", () => {
      const template = "Certificate for {{ RECIPIENT_NAME }} in {{ Course_Name }}"
      const output = interpolateCertificateVariables(template, {
        recipientName: "Fatima Al Lawati",
        courseName: "Strategic KPI Modeling",
      })

      expect(output).toBe("Certificate for Fatima Al Lawati in Strategic KPI Modeling")
    })

    it("provides clean fallbacks when variables are missing", () => {
      const template = "Awarded to {{recipient_name}} for {{course_name}}"
      const output = interpolateCertificateVariables(template, {})
      expect(output).toBe("Awarded to Recipient Delegate Name for Course Program")
    })
  })
})

