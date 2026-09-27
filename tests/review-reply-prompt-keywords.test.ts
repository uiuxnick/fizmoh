import { describe, expect, test } from "bun:test"
import {
  interpolatePrompt,
  applyKeywordReplacements,
  type KeywordReplacementRule,
} from "../src/lib/review-reply-ai"

describe("interpolatePrompt", () => {
  test("substitutes all dynamic variable tags correctly", () => {
    const template = "Welcome to {{location_name}}! Thank you {{reviewer_name}} for the {{rating}}-star review. You mentioned: {{review_text}}. We feature {{premium_keywords}}."
    const result = interpolatePrompt(template, {
      location_name: "OUD WORLD RUWI MUSCAT OMAN",
      reviewer_name: "Zubair Ahmed",
      rating: 5,
      review_text: "Great authentic oud",
      premium_keywords: "pure oud, luxury fragrances",
    })

    expect(result).toBe("Welcome to OUD WORLD RUWI MUSCAT OMAN! Thank you Zubair Ahmed for the 5-star review. You mentioned: Great authentic oud. We feature pure oud, luxury fragrances.")
  })

  test("gracefully falls back when variables are missing or null", () => {
    const template = "Thank you from {{location_name}} and {{business_name}}! Valued customer {{reviewer_name}}."
    const result = interpolatePrompt(template, {
      location_name: null,
      business_name: "Oud World",
      reviewer_name: null,
    })

    expect(result).toBe("Thank you from Oud World and Oud World! Valued customer valued customer.")
  })
})

describe("applyKeywordReplacements", () => {
  const rules: KeywordReplacementRule[] = [
    { search: "product", replace: "luxury fragrance" },
    { search: "products", replace: "luxury fragrances" },
    { search: "shop", replace: "perfume boutique" },
    { search: "store", replace: "perfume boutique" },
    { search: "perfume", replace: "artisan fragrance" },
  ]

  test("replaces generic words with premium keywords with whole-word boundary", () => {
    const input = "We hope you enjoy your product from our shop!"
    const output = applyKeywordReplacements(input, rules)
    expect(output).toBe("We hope you enjoy your luxury fragrance from our perfume boutique!")
  })

  test("preserves TitleCase capitalization", () => {
    const input = "Our Product is available at the Store."
    const output = applyKeywordReplacements(input, rules)
    expect(output).toBe("Our Luxury fragrance is available at the Perfume boutique.")
  })

  test("preserves UPPERCASE capitalization", () => {
    const input = "CHECK OUT THIS PRODUCT IN OUR SHOP"
    const output = applyKeywordReplacements(input, rules)
    expect(output).toBe("CHECK OUT THIS LUXURY FRAGRANCE IN OUR PERFUME BOUTIQUE")
  })

  test("does not replace substrings within larger words", () => {
    const input = "We are productive and shopping today."
    const output = applyKeywordReplacements(input, rules)
    // "productive" does not match \bproduct\b, "shopping" does not match \bshop\b
    expect(output).toBe("We are productive and shopping today.")
  })
})
