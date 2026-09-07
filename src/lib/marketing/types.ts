/**
 * Shared shape for the Product and Industry landing pages.
 *
 * One rule governs every entry in `products.ts` and `industries.ts`: the page
 * is a real argument written for one reader, not a template with a noun swapped
 * in. Google suppresses shell-generated "doorway" pages, and a prospect can
 * tell the difference in a sentence — so the pain points, workflows, feature
 * table and questions below are written per page, and every capability named
 * is one the platform genuinely has today.
 *
 * Every visible string is bilingual. English is the primary market copy;
 * Arabic is Gulf-dialect-aware and used when the visitor toggles the language
 * (see `useLanguage`). Meta length targets apply to the English string:
 * `metaTitle` 50-60 chars, `metaDescription` 140-160 chars.
 */

export type Locale = "en" | "ar"

/** A bilingual string. `ar` is written for a Gulf reader, not machine-translated. */
export type L = { en: string; ar: string }

/** A concrete workflow this page's reader would recognise as their own. */
export type UseCase = {
  /** lucide-react icon name, e.g. "CalendarClock". */
  icon: string
  title: L
  body: L
}

/** One step of "how it works", in the order it happens. */
export type Step = { title: L; body: L }

/** A capability mapped to the business outcome it produces. */
export type FeatureBenefit = { feature: L; benefit: L }

/**
 * A headline number. `estimate: true` renders an "est." tag and the value is
 * phrased as a range — we never present an industry figure as a measured one.
 */
export type Stat = { value: L; label: L; estimate?: boolean }

/**
 * A social-proof slot. These are placeholders: `todo` is always true and the
 * UI marks them until real, attributable quotes replace them. We never attach
 * an invented quote to a real company.
 */
export type Testimonial = {
  quote: L
  /** Left blank on purpose — filled when a real quote is approved. */
  name: string
  role: L
  company: string
  todo: true
}

export type Faq = { q: L; a: L }

/** A descriptive internal link to a related page on the other template. */
export type RelatedLink = { href: string; label: L }

export type HeroImage = {
  /** Path under /public. Ignored when `kind` is "css". */
  src: string
  alt: L
  width: number
  height: number
  /** true when the asset is a generated/stock placeholder to be swapped later. */
  placeholder?: boolean
  /**
   * "image" (default) renders `src` through next/image. "css" renders a
   * brand-token gradient panel with the eyebrow icon — a zero-download,
   * zero-CLS stand-in for a slot with no photo yet.
   */
  kind?: "image" | "css"
  /** lucide-react icon name shown on a "css" hero. */
  icon?: string
}

export type MarketingPage = {
  slug: string

  /* ---- SEO targeting (stated explicitly per the content brief) ---- */
  /** The one term this page is built to win. Belongs in the title and the H1. */
  primaryKeyword: string
  /** 2-3 supporting terms the body copy also covers. */
  secondaryKeywords: string[]
  /** Full keyword list emitted in the meta tag (Bing/Yandex still read it). */
  keywords: string[]

  metaTitle: L
  metaDescription: L

  /* ---- Hero ---- */
  eyebrow: L
  h1: L
  subheadline: L
  hero: HeroImage
  /** Small reassurance line under the hero CTAs. */
  heroNote: L

  /* ---- Body sections ---- */
  /** What is going wrong for this reader today. Exactly 3. */
  problems: { title: L; body: L }[]
  /** 3-5 workflows specific to this product or industry. */
  useCases: UseCase[]
  /** 3-4 plain-language steps. */
  how: Step[]
  /** feature -> outcome. 5-6 rows. */
  features: FeatureBenefit[]
  stats: Stat[]
  testimonials: Testimonial[]
  /** 4-6, written to answer long-tail search queries. */
  faqs: Faq[]
  related: RelatedLink[]

  /* ---- Structured data ---- */
  schemaType: "Product" | "Service"
}

export function localized<T extends { [K in Locale]: string }>(value: T, locale: Locale): string {
  return value[locale] || value.en
}
