import { describe, expect, test } from "bun:test"
import { validateCarousel, carouselComponent, type CarouselCard } from "../src/lib/carousel"

/**
 * Meta reviews a template over days and rejects it with a message that does not
 * say which card was wrong. These rules are worth catching before submission.
 */
const card = (over: Partial<CarouselCard> = {}): CarouselCard => ({
  imageUrl: "https://example.com/a.jpg",
  body: "Wahiba Sands Desert Safari — 10h from Muscat.",
  buttons: [{ type: "QUICK_REPLY", text: "Book now" }],
  ...over,
})

describe("validateCarousel", () => {
  test("a well-formed pair of cards passes", () => {
    expect(validateCarousel([card(), card()])).toEqual([])
  })

  test("one card is not a carousel", () => {
    expect(validateCarousel([card()]).join(" ")).toContain("at least 2")
  })

  test("more than ten cards is rejected", () => {
    expect(validateCarousel(Array.from({ length: 11 }, () => card())).join(" ")).toContain("at most 10")
  })

  test("cards must carry the same buttons — the rule that catches people out", () => {
    const problems = validateCarousel([
      card(),
      card({ buttons: [{ type: "QUICK_REPLY", text: "Book" }, { type: "URL", text: "Details", url: "https://x.com" }] }),
    ])
    expect(problems.join(" ")).toContain("same buttons")
  })

  test("button order matters, not just the count", () => {
    const first = card({ buttons: [{ type: "QUICK_REPLY", text: "Book" }, { type: "URL", text: "More", url: "https://x.com" }] })
    const second = card({ buttons: [{ type: "URL", text: "More", url: "https://x.com" }, { type: "QUICK_REPLY", text: "Book" }] })
    expect(validateCarousel([first, second]).join(" ")).toContain("same buttons")
  })

  test("body over the limit is caught with the real count", () => {
    const problems = validateCarousel([card({ body: "x".repeat(161) }), card()])
    expect(problems.join(" ")).toContain("161 characters")
  })

  test("an image must be a public link, not a local path", () => {
    expect(validateCarousel([card({ imageUrl: "/uploads/a.jpg" }), card()]).join(" ")).toContain("public https link")
  })

  test("a link button without a URL is rejected", () => {
    const bad = card({ buttons: [{ type: "URL", text: "Details" }] })
    expect(validateCarousel([bad, bad]).join(" ")).toContain("valid URL")
  })

  test("a card with no buttons is rejected", () => {
    expect(validateCarousel([card({ buttons: [] }), card({ buttons: [] })]).join(" ")).toContain("at least one button")
  })
})

describe("carouselComponent", () => {
  test("builds the shape Meta's template endpoint expects", () => {
    const component = carouselComponent([card(), card()])
    expect(component.type).toBe("CAROUSEL")
    expect(component.cards).toHaveLength(2)

    const [header, body, buttons] = component.cards[0].components
    expect(header).toMatchObject({ type: "HEADER", format: "IMAGE" })
    expect(body).toMatchObject({ type: "BODY" })
    expect(buttons).toMatchObject({ type: "BUTTONS" })
  })

  test("a link button keeps its URL, a quick reply does not gain one", () => {
    const component = carouselComponent([
      card({ buttons: [{ type: "URL", text: "Details", url: "https://example.com/tour" }] }),
    ])
    const buttons = component.cards[0].components[2] as { buttons: Record<string, unknown>[] }
    expect(buttons.buttons[0]).toEqual({ type: "URL", text: "Details", url: "https://example.com/tour" })

    const plain = carouselComponent([card()])
    const plainButtons = plain.cards[0].components[2] as { buttons: Record<string, unknown>[] }
    expect(plainButtons.buttons[0]).toEqual({ type: "QUICK_REPLY", text: "Book now" })
  })
})
