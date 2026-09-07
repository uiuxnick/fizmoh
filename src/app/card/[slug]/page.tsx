import { Metadata } from "next"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { PublicCardClient } from "@/components/digital-vcard/public-card-client"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const card = await (db as any).businessVCard.findFirst({
    where: {
      slug: slug.toLowerCase(),
      status: "PUBLISHED",
    },
  })

  if (!card) {
    return {
      title: "Digital Business Card | Fizmoh",
      description: "Smart Digital Business Card and Contact Profile",
    }
  }

  const title = card.metaTitle || card.title || card.companyName || "Digital Business Card"
  const description =
    card.metaDescription || card.bio || card.aboutUs || card.subtitle || card.tagline || `Connect with ${title} on Fizmoh.`
  const ogImage = card.bannerUrl || card.logoUrl

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    icons: card.logoUrl ? [{ url: card.logoUrl }] : undefined,
  }
}

export default async function PublicCardPage({ params }: PageProps) {
  const { slug } = await params

  const card = await (db as any).businessVCard.findFirst({
    where: {
      slug: slug.toLowerCase(),
    },
    include: {
      items: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
      gallery: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  })

  // If card doesn't exist or is not published
  if (!card || card.status !== "PUBLISHED") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 mb-4 shadow-xs">
          <span className="font-mono text-2xl font-black">📇</span>
        </div>
        <h1 className="text-xl font-black text-slate-900 mb-1">
          {card ? "Card Unavailable" : "Card Not Found"}
        </h1>
        <p className="text-sm text-slate-600 max-w-sm mb-6 leading-relaxed">
          {card && card.status === "DRAFT"
            ? "This business card is currently in draft mode and has not been published yet."
            : card && card.status === "DISABLED"
            ? "This business card has been temporarily deactivated."
            : "The digital business card you are looking for does not exist or has been moved."}
        </p>
        <a
          href="https://fizmoh.cloud"
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 transition-colors shadow-xs"
        >
          Create Your Own Card on Fizmoh
        </a>
      </div>
    )
  }

  const reqHeaders = await headers()
  const host = reqHeaders.get("x-forwarded-host") || reqHeaders.get("host") || "app.fizmoh.cloud"
  const proto = reqHeaders.get("x-forwarded-proto") || "https"
  const cardUrl = `${proto}://${host}/card/${card.slug}`

  const cardTitle = card.title || card.companyName || "Business Card"
  const cardSubtitle = card.subtitle || card.tagline || null
  const cardBio = card.bio || card.aboutUs || card.shortBio || null

  // Schema.org JSON-LD structured data for search engine rich snippets
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: cardTitle,
    description: cardBio || cardSubtitle || "",
    image: card.logoUrl || card.bannerUrl,
    telephone: card.mobileNumber || card.whatsappNumber,
    email: card.email,
    url: card.websiteUrl || cardUrl,
    address: card.addressLine1
      ? {
          "@type": "PostalAddress",
          streetAddress: card.addressLine1,
          addressLocality: card.city,
          addressRegion: card.state,
          postalCode: card.postalCode,
          addressCountry: card.country || "OM",
        }
      : undefined,
    geo:
      card.latitude && card.longitude
        ? {
            "@type": "GeoCoordinates",
            latitude: card.latitude,
            longitude: card.longitude,
          }
        : undefined,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicCardClient
        card={{
          ...card,
          title: cardTitle,
          subtitle: cardSubtitle,
          bio: cardBio,
          items: undefined,
          gallery: undefined,
        }}
        items={(card.items || []).map((it: any) => ({
          ...it,
          price: it.price ? Number(it.price) : null,
          salePrice: it.salePrice ? Number(it.salePrice) : null,
        }))}
        gallery={card.gallery || []}
        cardUrl={cardUrl}
      />
    </>
  )
}
