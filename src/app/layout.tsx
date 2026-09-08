import type { Metadata, Viewport } from "next"
import Script from "next/script"
import { DM_Sans, Plus_Jakarta_Sans, Instrument_Serif, Cairo } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { PWA } from "@/components/pwa"
import { Push } from "@/components/push"
import { SeoStructuredData } from "@/components/seo-structured-data"
import { LanguageProvider } from "@/context/language-context"
import { absoluteUrl, DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE, KEYWORDS_AR, KEYWORDS_EN, SITE_NAME, SITE_URL } from "@/lib/seo"

import { AnalyticsScripts } from "@/components/analytics-scripts"

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
})

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
})

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal"],
  display: "swap",
})

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic"],
  weight: ["500", "700"],
  display: "swap",
  preload: false,
})

/**
 * Built per request from Settings, so the owner can change the site title,
 * description, keywords and share image without a deploy. Every field falls
 * back to what shipped, so an empty setting never produces an empty tag.
 */
/*
 * Metadata is read from Settings, and marketing pages are statically cached —
 * so without this, a changed title or verification token would not appear
 * until the next deploy, which defeats the point of making them editable.
 * Five minutes keeps the pages fast while letting an edit show up on its own.
 */
export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const { siteSeo } = await import("@/lib/seo-config")
  const seo = await siteSeo()

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: seo.title, template: seo.titleTemplate },
    description: seo.description,
    keywords: seo.keywords,
    applicationName: seo.siteName,
    creator: "Fizmoh Cloud Platform",
    publisher: "Fizmoh Cloud Platform",
    alternates: {
      canonical: absoluteUrl("/"),
      languages: {
        en: absoluteUrl("/"),
        ar: `${absoluteUrl("/")}?lang=ar`,
        "x-default": absoluteUrl("/"),
      },
    },
    openGraph: {
      type: "website",
      url: SITE_URL,
      siteName: seo.siteName,
      title: seo.title,
      description: seo.description,
      locale: "en_US",
      alternateLocale: ["ar_OM", "ar_SA", "ar_AE"],
      images: [{ url: absoluteUrl(seo.ogImage), width: 1200, height: 630, alt: seo.siteName }],
    },
    /*
     * Search-engine ownership tokens, emitted into <head> by Next itself.
     *
     * The Google tag was previously rendered by a client component in the
     * body and left to React to hoist. Declaring it here guarantees it is in
     * the head of the served HTML, which is what the verifier fetches.
     */
    verification: {
      ...(seo.googleSiteVerification ? { google: seo.googleSiteVerification } : {}),
      ...(seo.bingSiteVerification ? { other: { "msvalidate.01": seo.bingSiteVerification } } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [absoluteUrl(seo.ogImage)],
      ...(seo.twitterHandle ? { site: seo.twitterHandle, creator: seo.twitterHandle } : {}),
    },
  }
}

export const viewport: Viewport = {
  themeColor: "#00E785",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" className="ltr" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${dmSans.variable} ${plusJakartaSans.variable} ${instrumentSerif.variable} ${cairo.variable} font-[family-name:var(--font-dm-sans)] antialiased bg-white text-[#1D1D1D]`}>
        <AnalyticsScripts />
        <SeoStructuredData />
        <LanguageProvider>
          {children}
          <Toaster />
          <SonnerToaster position="top-right" richColors />
          <PWA />
          <Push />
        </LanguageProvider>
        <Script src="/widget.js" data-tenant="fizmoh-support" strategy="lazyOnload" />
      </body>
    </html>
  )
}
