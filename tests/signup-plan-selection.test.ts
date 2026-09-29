import { describe, expect, test } from "bun:test"
import { z } from "zod"

/**
 * Validates that signup strictly requires a subscription plan selection.
 */
const signupSchema = z.object({
  business: z.string().trim().min(2, "Business name must be at least 2 characters").max(80),
  name: z.string().trim().min(2, "Your name must be at least 2 characters").max(80),
  email: z.string().trim().toLowerCase().email("Please provide a valid email address"),
  phone: z.string().trim().min(7, "Please provide a valid WhatsApp phone number").max(20),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  slug: z.string().trim().toLowerCase().optional(),
  planSlug: z.string().trim().min(1, "Please choose a subscription plan to continue."),
})

describe("Signup plan selection requirement", () => {
  const validBase = {
    business: "Muscat Tours",
    name: "Ahmed",
    email: "ahmed@example.om",
    phone: "+96891234567",
    password: "Password123!",
    slug: "muscat-tours",
  }

  test("rejects signup when planSlug is missing", () => {
    const parsed = signupSchema.safeParse(validBase)
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      const planIssue = parsed.error.issues.find((i) => i.path.includes("planSlug"))
      expect(planIssue).toBeDefined()
    }
  })

  test("rejects signup when planSlug is empty or whitespace", () => {
    const parsedEmpty = signupSchema.safeParse({ ...validBase, planSlug: "" })
    expect(parsedEmpty.success).toBe(false)

    const parsedWhitespace = signupSchema.safeParse({ ...validBase, planSlug: "   " })
    expect(parsedWhitespace.success).toBe(false)
  })

  test("accepts signup when valid planSlug is provided", () => {
    const parsedStarter = signupSchema.safeParse({ ...validBase, planSlug: "starter" })
    expect(parsedStarter.success).toBe(true)
    if (parsedStarter.success) {
      expect(parsedStarter.data.planSlug).toBe("starter")
    }

    const parsedGrowth = signupSchema.safeParse({ ...validBase, planSlug: "growth" })
    expect(parsedGrowth.success).toBe(true)
    if (parsedGrowth.success) {
      expect(parsedGrowth.data.planSlug).toBe("growth")
    }

    const parsedEnterprise = signupSchema.safeParse({ ...validBase, planSlug: "enterprise" })
    expect(parsedEnterprise.success).toBe(true)
    if (parsedEnterprise.success) {
      expect(parsedEnterprise.data.planSlug).toBe("enterprise")
    }
  })

  test("enforces password minimum length alongside plan selection", () => {
    const parsed = signupSchema.safeParse({
      ...validBase,
      password: "short",
      planSlug: "growth",
    })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      const pwdIssue = parsed.error.issues.find((i) => i.path.includes("password"))
      expect(pwdIssue).toBeDefined()
    }
  })

  test("enforces valid email format", () => {
    const parsed = signupSchema.safeParse({
      ...validBase,
      email: "not-an-email",
      planSlug: "growth",
    })
    expect(parsed.success).toBe(false)
  })
})
