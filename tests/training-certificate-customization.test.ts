import { describe, it, expect } from "bun:test"
import {
  formatCourseDates,
  issueAttendeeCertificate,
  updateCertificateRecord,
  updateAttendeeDetails,
} from "@/lib/training-service"
import { calculateRegistrationPricing, Course } from "@/lib/training-types"

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
})
