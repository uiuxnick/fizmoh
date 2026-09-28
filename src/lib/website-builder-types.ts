export type ElementType =
  // Text
  | "heading" | "subheading" | "paragraph" | "caption" | "quote" | "badge-text"
  // Media
  | "image" | "video-embed" | "video-hero" | "icon" | "logo" | "gallery" | "image-carousel" | "before-after"
  // Buttons & Links
  | "button" | "button-outline" | "link" | "whatsapp-cta" | "cta-banner" | "cta-multi"
  // Forms
  | "input-field" | "textarea-field" | "select-field" | "checkbox" | "contact-form" | "custom-form" | "newsletter-signup"
  // Layout
  | "divider" | "spacer" | "container" | "two-column" | "three-column" | "card"
  // Navigation
  | "navbar" | "breadcrumb" | "tabs" | "accordion" | "pagination"
  // Commerce
  | "product-card" | "product-grid" | "product-carousel" | "price-tag" | "cart-button" | "checkout-form"
  | "promo-badge" | "countdown-timer" | "countdown-sale"
  // Social Proof
  | "testimonial" | "testimonials-slider" | "rating-stars" | "review-card" | "trust-badges" | "customer-count"
  // Marketing
  | "hero-banner" | "feature-box" | "stat-counter" | "team-member" | "pricing-table"
  | "faq-item" | "faq-accordion" | "timeline-item" | "social-links" | "logo-marquee"
  // Maps & Contact
  | "map-embed" | "contact-info" | "business-hours"

export interface BuilderElement {
  id: string
  type: ElementType
  props: Record<string, string | number | boolean>
  children?: BuilderElement[]
}

export interface WebsitePage {
  id: string
  title: string
  name?: string // Alias for title
  slug: string // "home", "about", "services", "contact", etc.
  elements: BuilderElement[]
  seoTitle?: string
  seoDescription?: string
}

export interface WebsiteData {
  pages: WebsitePage[]
  activePageSlug?: string
  elements?: BuilderElement[] // Legacy fallback / convenience
}

/**
 * Normalizes any website JSON representation (legacy array, single page, or multi-page object)
 * into a structured WebsiteData object with guaranteed pages.
 */
export function normalizeWebsiteData(raw: any): WebsiteData {
  if (!raw) {
    return {
      pages: [
        {
          id: "home",
          title: "Home",
          name: "Home",
          slug: "home",
          elements: [],
        },
      ],
      activePageSlug: "home",
      elements: [],
    }
  }

  // Legacy case: raw is directly an array of elements
  if (Array.isArray(raw)) {
    return {
      pages: [
        {
          id: "home",
          title: "Home",
          name: "Home",
          slug: "home",
          elements: raw,
        },
      ],
      activePageSlug: "home",
      elements: raw,
    }
  }

  // Object case: might have `pages` or `elements`
  if (typeof raw === "object") {
    const rawPages = Array.isArray(raw.pages) ? raw.pages : []
    const pages: WebsitePage[] =
      rawPages.length > 0
        ? rawPages.map((p: any, idx: number) => {
            const pageTitle = p.title || p.name || (idx === 0 ? "Home" : `Page ${idx + 1}`)
            return {
              id: p.id || (idx === 0 ? "home" : `page-${idx}`),
              title: pageTitle,
              name: p.name || pageTitle,
              slug: (p.slug || (idx === 0 ? "home" : `page-${idx + 1}`))
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, "-"),
              elements: Array.isArray(p.elements) ? p.elements : [],
              seoTitle: p.seoTitle || "",
              seoDescription: p.seoDescription || "",
            }
          })
        : [
            {
              id: "home",
              title: "Home",
              name: "Home",
              slug: "home",
              elements: Array.isArray(raw.elements) ? raw.elements : [],
            },
          ]

    const activePageSlug = raw.activePageSlug || pages[0]?.slug || "home"
    const activePage = pages.find((p) => p.slug === activePageSlug) || pages[0]

    return {
      pages,
      activePageSlug: activePage?.slug || "home",
      elements: activePage?.elements || [],
    }
  }

  return {
    pages: [{ id: "home", title: "Home", name: "Home", slug: "home", elements: [] }],
    activePageSlug: "home",
    elements: [],
  }
}
