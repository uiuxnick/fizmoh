import type { MetadataRoute } from "next"
import { absoluteUrl } from "@/lib/seo"

/**
 * robots.txt for production.
 *
 * Three principles decided this file:
 *
 * 1. **robots.txt is crawl control, not access control and not index control.**
 *    A disallowed URL can still appear in results when something links to it,
 *    and disallowing a page prevents Google from ever seeing a `noindex` on
 *    it. So application screens are marked `noindex` in their own metadata and
 *    left crawlable here; only things with nothing to read are disallowed.
 *
 * 2. **Nothing private relies on this file.** `/platform` redirects
 *    unauthenticated visitors to sign-in, and `/api` is gated by the proxy's
 *    allow-list. Those protections stand whether or not a crawler reads this.
 *
 * 3. **No blocking of assets.** Blocking `/_next/` would stop Google
 *    rendering the pages it is being asked to rank.
 *
 * Deliberately *not* included: a wall of per-crawler blocks. Every rule below
 * applies to every well-behaved crawler, AI ones included, because the
 * business goal is to be found and cited. Bots that ignore robots.txt are not
 * addressed by adding more lines to it.
 */

/** No content for a reader, or actively harmful to have crawled. */
const DISALLOW = [
  "/api/",        // JSON endpoints; gated separately, and never useful in results
  "/platform",    // staff console, redirects to sign-in
  "/join/",       // single-use invitation tokens
  "/preview/",    // internal render previews of marketing pages
  "/booking/",    // a customer's own order page, reachable only by reference
]

export default function robots(): MetadataRoute.Robots {
  const aiSearchBots = [
    "GPTBot",
    "ChatGPT-User",
    "PerplexityBot",
    "ClaudeBot",
    "Google-Extended",
    "Applebot-Extended",
    "Bingbot",
  ]

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/llms.txt"],
        disallow: DISALLOW,
      },
      ...aiSearchBots.map(bot => ({
        userAgent: bot,
        allow: ["/", "/llms.txt"],
        disallow: DISALLOW,
      })),
      {
        // Meta must fetch agent-selected attachments for Messenger/Instagram.
        // Keep other API paths blocked and preserve the wildcard SEO rules.
        userAgent: "facebookexternalhit",
        allow: ["/", "/api/media/"],
        disallow: DISALLOW,
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: "app.fizmoh.cloud",
  }
}
