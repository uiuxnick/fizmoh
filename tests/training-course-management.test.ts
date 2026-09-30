import { describe, expect, it } from "bun:test"
import { MODULE_REGISTRY } from "@/lib/module-registry"
import { DEFAULT_ADDONS } from "@/lib/addon-catalog"
import { VIEW_PATHS, viewForPath } from "@/lib/admin-routes"
import {
  calculateRegistrationPricing,
  SEED_COURSE_BSC,
  type Course,
  resolveTrainingVariables,
  interpolateTrainingText,
} from "@/lib/training-service"

describe("Training & Course Management Add-on", () => {
  it("MODULE_REGISTRY contains TRAINING module with proper metadata", () => {
    const trainingMod = MODULE_REGISTRY.find(m => m.key === "TRAINING")
    expect(trainingMod).toBeDefined()
    expect(trainingMod?.label).toBe("Training & Course Management")
    expect(trainingMod?.group).toBe("Commerce")
  })

  it("admin routes map /training, /courses, /workshops correctly", () => {
    expect(VIEW_PATHS.training).toBe("training")
    expect(viewForPath("/training")).toBe("training")
    expect(viewForPath("/courses")).toBe("training")
    expect(viewForPath("/workshops")).toBe("training")
    expect(viewForPath("/academy")).toBe("training")
  })

  it("addon catalog lists training-course-management addon", () => {
    const addon = DEFAULT_ADDONS.find(a => a.slug === "training-course-management")
    expect(addon).toBeDefined()
    expect(addon?.module).toBe("TRAINING")
    expect(addon?.priceMonthly).toBe(29)
  })

  it("calculates Pay 1 Get 1 Free (BOGO) offer correctly for 1 seat", () => {
    const sampleCourse = {
      ...SEED_COURSE_BSC,
      tenantId: "test_tenant",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Course

    // When a customer books 1 seat under BOGO:
    // Paid seats: 1, Free seats: 1, Total attendees allowed: 2
    // Price = 1 * 500 = 500 OMR (+ 5% VAT = 525 OMR)
    const result = calculateRegistrationPricing(sampleCourse, 1)
    expect(result.requestedSeats).toBe(1)
    expect(result.paidSeats).toBe(1)
    expect(result.freeSeats).toBe(1)
    expect(result.totalAttendeesAllowed).toBe(2)
    expect(result.subtotal).toBe(500)
    expect(result.vatAmount).toBe(25)
    expect(result.totalAmount).toBe(525)
    expect(result.discountAmount).toBe(500) // Value of the free seat
  })

  it("calculates Pay 1 Get 1 Free (BOGO) offer correctly for 2 seats", () => {
    const sampleCourse = {
      ...SEED_COURSE_BSC,
      tenantId: "test_tenant",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Course

    // 2 seats requested -> still 1 paid seat + 1 free seat = 2 attendees
    const result = calculateRegistrationPricing(sampleCourse, 2)
    expect(result.paidSeats).toBe(1)
    expect(result.freeSeats).toBe(1)
    expect(result.totalAttendeesAllowed).toBe(2)
    expect(result.totalAmount).toBe(525)
  })

  it("calculates Pay 1 Get 1 Free (BOGO) offer correctly for 3 or 4 seats", () => {
    const sampleCourse = {
      ...SEED_COURSE_BSC,
      tenantId: "test_tenant",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Course

    // 3 or 4 seats requested -> 2 paid seats + 2 free seats = 4 attendees
    const result3 = calculateRegistrationPricing(sampleCourse, 3)
    expect(result3.paidSeats).toBe(2)
    expect(result3.freeSeats).toBe(2)
    expect(result3.totalAttendeesAllowed).toBe(4)
    expect(result3.subtotal).toBe(1000)

    const result4 = calculateRegistrationPricing(sampleCourse, 4)
    expect(result4.paidSeats).toBe(2)
    expect(result4.freeSeats).toBe(2)
    expect(result4.totalAttendeesAllowed).toBe(4)
    expect(result4.subtotal).toBe(1000)
  })

  it("calculates Buy 2 Get 1 Free (B2G1) offer correctly", () => {
    const sampleCourse = {
      ...SEED_COURSE_BSC,
      offerType: "B2G1",
      offerTitle: "Buy 2 Get 1 FREE",
      tenantId: "test_tenant",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Course

    const result = calculateRegistrationPricing(sampleCourse, 3)
    expect(result.paidSeats).toBe(2)
    expect(result.freeSeats).toBe(1)
    expect(result.totalAttendeesAllowed).toBe(3)
    expect(result.subtotal).toBe(1000)
  })

  it("resolves dynamic WhatsApp variables correctly", () => {
    const sampleCourse = {
      ...SEED_COURSE_BSC,
      tenantId: "test_tenant",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Course

    const vars = resolveTrainingVariables(sampleCourse, {
      id: "reg_123",
      registrationNumber: "REG-2026-9999",
      tenantId: "test_tenant",
      courseId: sampleCourse.id,
      courseSlug: sampleCourse.slug,
      courseName: sampleCourse.name,
      customerName: "Ahmed Al Balushi",
      customerPhone: "+96891234567",
      customerWhatsApp: "+96891234567",
      customerEmail: "ahmed@example.om",
      companyName: "Omantel",
      jobTitle: "Strategy Director",
      country: "Oman",
      numberOfSeats: 2,
      paidSeats: 1,
      freeSeats: 1,
      unitPrice: 500,
      subtotal: 500,
      discountAmount: 500,
      vatAmount: 25,
      totalAmount: 525,
      balanceAmount: 525,
      currency: "OMR",
      status: "AWAITING_PAYMENT",
      paymentStatus: "UNPAID",
      paymentMethod: "PAYMENT_LINK",
      source: "WEBSITE",
      attendees: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    expect(vars.course_name).toBe("AI-Powered Certified Balanced Scorecard Professional")
    expect(vars.trainer_name).toBe("Said bin Saif Al Harthi")
    expect(vars.customer_name).toBe("Ahmed Al Balushi")
    expect(vars.company_name).toBe("Omantel")
    expect(vars.registration_id).toBe("REG-2026-9999")
    expect(vars.paid_seats).toBe("1")
    expect(vars.free_seats).toBe("1")
    expect(vars.number_of_seats).toBe("2")

    const template = "Hello {{customer_name}}, your booking for {{course_name}} (Reg: {{registration_id}}) is received."
    const interpolated = interpolateTrainingText(template, vars)
    expect(interpolated).toBe(
      "Hello Ahmed Al Balushi, your booking for AI-Powered Certified Balanced Scorecard Professional (Reg: REG-2026-9999) is received."
    )
  })
})
