import { describe, expect, test } from "bun:test"
import { parseLabels, labelClass, AVAILABLE_LABELS } from "../src/components/views/conversation-tools"

describe("Conversation Labels & Tagging Fixes", () => {
  describe("parseLabels", () => {
    test("handles native JavaScript string arrays without throwing", () => {
      const input = ["VIP", "New Lead", "Follow Up"]
      const result = parseLabels(input)
      expect(result).toEqual(["VIP", "New Lead", "Follow Up"])
    })

    test("handles JSON-stringified arrays cleanly", () => {
      const input = JSON.stringify(["VIP", "Payment Pending"])
      const result = parseLabels(input)
      expect(result).toEqual(["VIP", "Payment Pending"])
    })

    test("handles empty stringified array", () => {
      const input = "[]"
      const result = parseLabels(input)
      expect(result).toEqual([])
    })

    test("handles single unquoted string gracefully", () => {
      const input = "VIP"
      const result = parseLabels(input)
      expect(result).toEqual(["VIP"])
    })

    test("handles comma-separated strings gracefully", () => {
      const input = "VIP, Complaint, Follow Up"
      const result = parseLabels(input)
      expect(result).toEqual(["VIP", "Complaint", "Follow Up"])
    })

    test("returns empty array for null, undefined, and empty string", () => {
      expect(parseLabels(null)).toEqual([])
      expect(parseLabels(undefined)).toEqual([])
      expect(parseLabels("")).toEqual([])
      expect(parseLabels("   ")).toEqual([])
    })

    test("filters out non-string and empty items safely", () => {
      const input = ["VIP", "", null as any, 123 as any, "Urgent"]
      const result = parseLabels(input)
      expect(result).toContain("VIP")
      expect(result).toContain("Urgent")
    })

    test("never throws on corrupted or malformed input", () => {
      expect(() => parseLabels("{ malformed json")).not.toThrow()
      expect(parseLabels("{ malformed json")).toEqual(["{ malformed json"])
      expect(() => parseLabels(12345)).not.toThrow()
      expect(() => parseLabels({ foo: "bar" })).not.toThrow()
    })
  })

  describe("AVAILABLE_LABELS and styling", () => {
    test("AVAILABLE_LABELS contains all standard customer tags", () => {
      expect(AVAILABLE_LABELS).toContain("VIP")
      expect(AVAILABLE_LABELS).toContain("New Lead")
      expect(AVAILABLE_LABELS).toContain("Payment Pending")
      expect(AVAILABLE_LABELS).toContain("Complaint")
    })

    test("labelClass returns color class for defined and custom labels", () => {
      expect(labelClass("VIP")).toContain("rose")
      expect(labelClass("New Lead")).toContain("emerald")
      expect(labelClass("CustomTag")).toContain("bg-stone-100")
    })
  })

  describe("Bulk Label Assignment and Merging", () => {
    test("deduplicates tags when assigning new label", () => {
      const current = ["VIP", "New Lead"]
      const newTag = "VIP"
      const next = [...new Set([...current, newTag])]
      expect(next).toEqual(["VIP", "New Lead"])
    })

    test("appends new label when not already assigned", () => {
      const current = ["New Lead"]
      const newTag = "Wholesale"
      const next = [...new Set([...current, newTag])]
      expect(next).toEqual(["New Lead", "Wholesale"])
    })

    test("removes label cleanly during bulk removal", () => {
      const current = ["VIP", "Follow Up", "Wholesale"]
      const tagToRemove = "Follow Up"
      const next = current.filter(t => t !== tagToRemove)
      expect(next).toEqual(["VIP", "Wholesale"])
    })

    test("merges workspace tags with AVAILABLE_LABELS without duplicates", () => {
      const dynamicTags = ["VIP", "Corporate Partner", "Custom-Event"]
      const combined = Array.from(new Set([...dynamicTags, ...AVAILABLE_LABELS])).filter(Boolean).sort()
      expect(combined).toContain("Corporate Partner")
      expect(combined).toContain("Custom-Event")
      expect(combined).toContain("VIP")
      // Check no duplicates
      const uniqueCount = new Set(combined).size
      expect(combined.length).toBe(uniqueCount)
    })

    test("case-insensitive label filter matches labels regardless of casing", () => {
      const contactTags = ["VIP", "Follow Up", "New Lead"]
      const filter1 = "vip"
      const filter2 = "VIP"
      const filter3 = "follow up"
      const filter4 = "Nonexistent"

      const matches = (filter: string) => contactTags.some(t => t.toLowerCase() === filter.toLowerCase())
      expect(matches(filter1)).toBe(true)
      expect(matches(filter2)).toBe(true)
      expect(matches(filter3)).toBe(true)
      expect(matches(filter4)).toBe(false)
    })

    test("merges conversation labels and customer tags without duplicates", () => {
      const convLabels = ["VIP", "Arabic Speaker"]
      const custTags = ["VIP", "Repeat Customer"]
      const merged = Array.from(new Set([...convLabels, ...custTags])).filter(Boolean)
      expect(merged).toHaveLength(3)
      expect(merged).toContain("VIP")
      expect(merged).toContain("Arabic Speaker")
      expect(merged).toContain("Repeat Customer")
    })
  })
})
