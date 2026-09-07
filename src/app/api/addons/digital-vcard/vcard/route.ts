import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"
import { vCardUpdateSchema } from "@/lib/digital-vcard/validation"
import { isSlugAvailable, suggestAvailableSlug, slugify } from "@/lib/digital-vcard/slug"
import { DEFAULT_WEEKLY_SCHEDULE } from "@/lib/digital-vcard/business-hours"

/**
 * Returns or initializes the digital business card for the active tenant.
 */
export const GET = withErrors(withModule("DIGITAL_VCARD", async () => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: "No active tenant selected" }, { status: 400 })
  }

  let card = await (db as any).businessVCard.findFirst({
    where: { tenantId: tenant.tenantId },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
      },
      gallery: {
        orderBy: { sortOrder: "asc" },
      },
    },
  })

  // Auto-initialize if first time accessing
  if (!card) {
    const tenantRecord = await db.tenant.findUnique({
      where: { id: tenant.tenantId },
      select: { name: true, slug: true, logoUrl: true, timezone: true, currency: true },
    })

    const initialSlug = await suggestAvailableSlug(tenantRecord?.slug || tenantRecord?.name || "card")

    card = await (db as any).businessVCard.create({
      data: {
        tenantId: tenant.tenantId,
        slug: initialSlug,
        title: tenantRecord?.name || "My Business",
        subtitle: "Professional Services & Solutions",
        bio: "Welcome to our digital business card. Explore our services, connect with us on WhatsApp, or save our contact details directly to your phone.",
        logoUrl: tenantRecord?.logoUrl || null,
        primaryColor: "#0f766e", // Fizmoh Teal
        secondaryColor: "#0284c7",
        accentColor: "#10b981",
        themeMode: "system",
        cardTemplate: "modern",
        buttonStyle: "rounded",
        coverType: "IMAGE",
        serviceLayout: "SLIDER",
        country: "Oman",
        timezone: tenantRecord?.timezone || "Asia/Muscat",
        businessHours: DEFAULT_WEEKLY_SCHEDULE,
        status: "DRAFT",
      },
      include: {
        items: true,
        gallery: true,
      },
    })
  }

  return NextResponse.json({ card })
}))

/**
 * Updates digital business card settings for the active tenant.
 */
export const PUT = withErrors(withModule("DIGITAL_VCARD", async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: "No active tenant selected" }, { status: 400 })
  }

  const existingCard = await (db as any).businessVCard.findFirst({
    where: { tenantId: tenant.tenantId },
  })

  if (!existingCard) {
    return NextResponse.json({ error: "Business card not found. Please reload to initialize." }, { status: 404 })
  }

  const body = await request.json()
  const parseResult = vCardUpdateSchema.safeParse(body)

  if (!parseResult.success) {
    const flattened = parseResult.error.flatten()
    const errorDetails = Object.entries(flattened.fieldErrors)
      .map(([field, errs]) => `${field}: ${errs?.join(", ")}`)
      .join("; ")
    return NextResponse.json(
      { error: errorDetails ? `Validation failed: ${errorDetails}` : "Validation failed", details: flattened },
      { status: 422 },
    )
  }

  const data = parseResult.data

  // If slug is being updated, check availability
  if (data.slug) {
    const normalizedSlug = slugify(data.slug)
    if (normalizedSlug !== existingCard.slug) {
      const isAvailable = await isSlugAvailable(normalizedSlug, existingCard.id)
      if (!isAvailable) {
        return NextResponse.json(
          { error: `The slug '${normalizedSlug}' is already taken or reserved. Please choose another.` },
          { status: 409 },
        )
      }
      data.slug = normalizedSlug
    }
  }

  // Handle publishedAt timestamp when status transitions to PUBLISHED
  let publishedAt = existingCard.publishedAt
  if (data.status === "PUBLISHED" && !existingCard.publishedAt) {
    publishedAt = new Date()
  }

  const updatedCard = await (db as any).businessVCard.update({
    where: { id: existingCard.id },
    data: {
      ...data,
      publishedAt,
      crExpiryDate: data.crExpiryDate ? new Date(data.crExpiryDate) : data.crExpiryDate === "" ? null : undefined,
    },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
      },
      gallery: {
        orderBy: { sortOrder: "asc" },
      },
    },
  })

  return NextResponse.json({
    success: true,
    card: updatedCard,
  })
}))
