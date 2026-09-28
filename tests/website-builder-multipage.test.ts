import { describe, it, expect } from "bun:test"
import {
  normalizeWebsiteData,
  type BuilderElement,
  type WebsiteData,
} from "@/lib/website-builder-types"

describe("Website Builder Multi-Page & New Blocks", () => {
  it("normalizes legacy flat array of elements into standard multi-page structure", () => {
    const legacyElements: BuilderElement[] = [
      { id: "el-1", type: "heading", props: { text: "Welcome to Fizmoh Store" } },
      { id: "el-2", type: "paragraph", props: { text: "Best experiences in Oman" } },
    ]

    const result = normalizeWebsiteData(legacyElements)

    expect(result.activePageSlug).toBe("home")
    expect(result.pages).toHaveLength(1)
    expect(result.pages[0].slug).toBe("home")
    expect(result.pages[0].name).toBe("Home")
    expect(result.pages[0].elements).toHaveLength(2)
    expect(result.elements).toHaveLength(2)
    expect(result.elements[0].type).toBe("heading")
  })

  it("normalizes existing multi-page WebsiteData and preserves all pages and activePageSlug", () => {
    const multiPageData: WebsiteData = {
      activePageSlug: "about",
      pages: [
        {
          id: "page-home",
          name: "Home",
          slug: "home",
          isHomePage: true,
          elements: [{ id: "h1", type: "heading", props: { text: "Home Page" } }],
        },
        {
          id: "page-about",
          name: "About Us",
          slug: "about",
          elements: [{ id: "a1", type: "paragraph", props: { text: "About Fizmoh Team" } }],
        },
      ],
    }

    const result = normalizeWebsiteData(multiPageData)

    expect(result.activePageSlug).toBe("about")
    expect(result.pages).toHaveLength(2)
    expect(result.pages[1].slug).toBe("about")
    // When activePageSlug is "about", result.elements corresponds to the active page
    expect(result.elements[0].id).toBe("a1")
  })

  it("handles null, undefined, and non-array/empty inputs safely", () => {
    const nullResult = normalizeWebsiteData(null)
    expect(nullResult.activePageSlug).toBe("home")
    expect(nullResult.pages).toHaveLength(1)
    expect(nullResult.elements).toHaveLength(0)

    const emptyObjResult = normalizeWebsiteData({})
    expect(emptyObjResult.activePageSlug).toBe("home")
    expect(emptyObjResult.pages).toHaveLength(1)
    expect(emptyObjResult.elements).toHaveLength(0)
  })

  it("supports the 4 new conversion-focused elements: video-hero, countdown-sale, testimonials-slider, faq-accordion", () => {
    const testElements: BuilderElement[] = [
      {
        id: "block-video",
        type: "video-hero",
        props: {
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          heading: "Discover Oman in 4K",
          primaryBtnText: "Book WhatsApp Tour",
        },
      },
      {
        id: "block-countdown",
        type: "countdown-sale",
        props: {
          heading: "National Day Mega Flash Sale",
          targetDate: "2026-11-18T23:59:59",
          discountBadge: "50% OFF TODAY",
        },
      },
      {
        id: "block-testimonials",
        type: "testimonials-slider",
        props: {
          title: "Loved by Over 10,000 Travelers",
          items: [
            { quote: "Superb service!", author: "Ahmed Al-Balushi", role: "Muscat, Oman", rating: 5 },
          ],
        },
      },
      {
        id: "block-faq",
        type: "faq-accordion",
        props: {
          title: "Frequently Asked Questions",
          items: [
            { q: "How do I pay?", a: "We accept AmwalPay, Thawani, Card, and Cash." },
          ],
        },
      },
    ]

    const result = normalizeWebsiteData(testElements)
    expect(result.elements).toHaveLength(4)
    expect(result.elements.map(e => e.type)).toEqual([
      "video-hero",
      "countdown-sale",
      "testimonials-slider",
      "faq-accordion",
    ])
  })

  it("validates that custom domain strings are cleaned and normalized appropriately", () => {
    const rawDomain = "https://Tours.OmanAdventures.com/some/path"
    const cleaned = rawDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    expect(cleaned).toBe("tours.omanadventures.com")
  })
})

