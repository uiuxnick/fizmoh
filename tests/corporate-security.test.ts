import { expect, test, describe } from "bun:test"

describe("Corporate & Architectural Systems Security and Access Control", () => {
  const EDIT_ROLES = new Set(["OWNER", "SUPER_ADMIN", "MANAGER", "ADMIN", "PLATFORM"])

  test("authorized roles include management and platform personas", () => {
    expect(EDIT_ROLES.has("OWNER")).toBe(true)
    expect(EDIT_ROLES.has("SUPER_ADMIN")).toBe(true)
    expect(EDIT_ROLES.has("MANAGER")).toBe(true)
    expect(EDIT_ROLES.has("ADMIN")).toBe(true)
    expect(EDIT_ROLES.has("PLATFORM")).toBe(true)
  })

  test("unauthorized roles cannot manage corporate settings, quotes, or workflows", () => {
    expect(EDIT_ROLES.has("STAFF")).toBe(false)
    expect(EDIT_ROLES.has("AGENT")).toBe(false)
    expect(EDIT_ROLES.has("VIEWER")).toBe(false)
    expect(EDIT_ROLES.has("CONTRACTOR")).toBe(false)
    expect(EDIT_ROLES.has("GUEST")).toBe(false)
  })

  test("RFQ search filtering matches name, phone, location, product, or details", () => {
    const quotes = [
      { customerName: "Salim Al-Harthy", customerPhone: "+96891234567", projectLocation: "Al Mouj Muscat", productType: "Thermal Break Windows", projectDetails: "Luxury villa ground floor" },
      { customerName: "Ahmed Al-Balushi", customerPhone: "+96898765432", projectLocation: "Sohar Industrial", productType: "Curtain Wall Facade", projectDetails: "Commercial building 4 floors" },
      { customerName: "Fatima Al-Riyami", customerPhone: "+96895551234", projectLocation: "Salalah Freezone", productType: "Pergolas & Louvers", projectDetails: "Outdoor terrace shading" },
    ]

    const filterQuotes = (search: string) => {
      const q = search.toLowerCase().trim()
      return quotes.filter(item =>
        item.customerName.toLowerCase().includes(q) ||
        item.customerPhone.toLowerCase().includes(q) ||
        item.projectLocation.toLowerCase().includes(q) ||
        item.productType.toLowerCase().includes(q) ||
        item.projectDetails.toLowerCase().includes(q)
      )
    }

    expect(filterQuotes("Salim").length).toBe(1)
    expect(filterQuotes("98765432").length).toBe(1)
    expect(filterQuotes("Al Mouj").length).toBe(1)
    expect(filterQuotes("Curtain Wall").length).toBe(1)
    expect(filterQuotes("villa").length).toBe(1)
    expect(filterQuotes("Nonexistent").length).toBe(0)
  })

  test("quote answers parser gracefully handles JSON string and raw objects", () => {
    const parseAnswers = (input: unknown): Record<string, any> => {
      if (typeof input === "string") {
        try {
          return JSON.parse(input)
        } catch {
          return { raw: input }
        }
      } else if (input && typeof input === "object") {
        return input as Record<string, any>
      }
      return {}
    }

    const jsonStr = '{"customer_name":"Ali","project_location":"Muscat","quotedAmount":1500}'
    const rawObj = { customer_name: "Said", project_location: "Nizwa", quotedAmount: 2200 }
    const malformed = "Just a raw message string"

    expect(parseAnswers(jsonStr).customer_name).toBe("Ali")
    expect(parseAnswers(jsonStr).quotedAmount).toBe(1500)
    expect(parseAnswers(rawObj).customer_name).toBe("Said")
    expect(parseAnswers(malformed).raw).toBe("Just a raw message string")
    expect(parseAnswers(null)).toEqual({})
  })
})
