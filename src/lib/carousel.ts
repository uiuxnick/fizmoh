/**
 * WhatsApp carousel templates.
 *
 * A carousel is a normal template with a CAROUSEL component holding between two
 * and ten cards. Meta's hard rule is that every card must have the *same*
 * structure: the same header format, the same number of buttons, and the same
 * button types in the same order. A single card with one button among cards
 * with two rejects the whole template, so that is checked here rather than
 * discovered days later in a rejection email.
 */

export interface CarouselButton {
  type: "QUICK_REPLY" | "URL"
  text: string
  url?: string
}

export interface CarouselCard {
  imageUrl: string
  body: string
  buttons: CarouselButton[]
}

export const CAROUSEL_LIMITS = {
  minCards: 2,
  maxCards: 10,
  bodyChars: 160,
  maxButtons: 2,
  buttonChars: 25,
} as const

export function parseCards(value: unknown): CarouselCard[] {
  if (Array.isArray(value)) return value as CarouselCard[]
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

/**
 * Checks a carousel against the rules Meta enforces, so a template is rejected
 * here with an explanation rather than there without one.
 */
export function validateCarousel(cards: CarouselCard[]): string[] {
  const problems: string[] = []

  if (cards.length < CAROUSEL_LIMITS.minCards) {
    problems.push(`A carousel needs at least ${CAROUSEL_LIMITS.minCards} cards.`)
  }
  if (cards.length > CAROUSEL_LIMITS.maxCards) {
    problems.push(`A carousel takes at most ${CAROUSEL_LIMITS.maxCards} cards.`)
  }
  if (cards.length === 0) return problems

  const shape = cards[0].buttons.map(b => b.type).join(",")

  cards.forEach((card, i) => {
    const label = `Card ${i + 1}`
    if (!card.imageUrl?.trim()) problems.push(`${label}: add an image.`)
    else if (!/^https?:\/\//i.test(card.imageUrl)) problems.push(`${label}: the image must be a public https link.`)

    if (!card.body?.trim()) problems.push(`${label}: add some text.`)
    else if (card.body.length > CAROUSEL_LIMITS.bodyChars) {
      problems.push(`${label}: text is ${card.body.length} characters, the limit is ${CAROUSEL_LIMITS.bodyChars}.`)
    }

    if (card.buttons.length === 0) problems.push(`${label}: each card needs at least one button.`)
    if (card.buttons.length > CAROUSEL_LIMITS.maxButtons) {
      problems.push(`${label}: at most ${CAROUSEL_LIMITS.maxButtons} buttons per card.`)
    }

    // The uniformity rule, which is the one that catches people out.
    if (card.buttons.map(b => b.type).join(",") !== shape) {
      problems.push(`${label}: every card must have the same buttons, in the same order, as card 1.`)
    }

    card.buttons.forEach((button, b) => {
      if (!button.text?.trim()) problems.push(`${label}, button ${b + 1}: add a label.`)
      else if (button.text.length > CAROUSEL_LIMITS.buttonChars) {
        problems.push(`${label}, button ${b + 1}: label is over ${CAROUSEL_LIMITS.buttonChars} characters.`)
      }
      if (button.type === "URL" && !/^https?:\/\//i.test(button.url || "")) {
        problems.push(`${label}, button ${b + 1}: a link button needs a valid URL.`)
      }
    })
  })

  return problems
}

/** The CAROUSEL component as Meta's template creation endpoint expects it. */
/**
 * Builds the carousel component for template creation.
 *
 * `handles` maps each card's image URL to the handle Meta returned when the
 * file was uploaded. A URL cannot be used here — that was the bug: Meta wants
 * a handle from its upload API and rejects a link with a message that does not
 * say so.
 */
export function carouselComponent(cards: CarouselCard[], handles: Record<string, string> = {}) {
  return {
    type: "CAROUSEL",
    cards: cards.map(card => ({
      components: [
        {
          type: "HEADER",
          format: "IMAGE",
          // The handle stands in as the sample; the real image is supplied per
          // card when the message is actually sent.
          example: { header_handle: [handles[card.imageUrl] ?? card.imageUrl] },
        },
        { type: "BODY", text: card.body },
        {
          type: "BUTTONS",
          buttons: card.buttons.map(button =>
            button.type === "URL"
              ? { type: "URL", text: button.text, url: button.url }
              : { type: "QUICK_REPLY", text: button.text },
          ),
        },
      ],
    })),
  }
}

/**
 * The per-card parameters a send needs.
 *
 * Sending differs from creating: the card index matters, and each card supplies
 * its own image and its own button payloads.
 */
export function carouselSendComponent(cards: CarouselCard[]) {
  return {
    type: "carousel",
    cards: cards.map((card, index) => ({
      card_index: index,
      components: [
        {
          type: "header",
          parameters: [{ type: "image", image: { link: card.imageUrl } }],
        },
        ...card.buttons.map((button, b) =>
          button.type === "QUICK_REPLY"
            ? {
                type: "button",
                sub_type: "quick_reply",
                index: String(b),
                parameters: [{ type: "payload", payload: `card_${index}_btn_${b}` }],
              }
            : {
                type: "button",
                sub_type: "url",
                index: String(b),
                parameters: [{ type: "text", text: "" }],
              },
        ),
      ],
    })),
  }
}
