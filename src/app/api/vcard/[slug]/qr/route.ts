import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { generateQrPngBuffer, generateQrSvg } from "@/lib/digital-vcard/qr"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 })
  }

  const card = await (db as any).businessVCard.findFirst({
    where: {
      slug: slug.toLowerCase(),
      status: { in: ["PUBLISHED", "DRAFT"] }, // Allow draft preview QR in admin console
    },
    select: { id: true, slug: true, primaryColor: true },
  })

  if (!card) {
    return NextResponse.json({ error: "Business card not found" }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const format = searchParams.get("format")?.toLowerCase() || "png"
  const color = searchParams.get("color") || card.primaryColor || "#0f172a"
  const width = Math.min(1200, Math.max(200, parseInt(searchParams.get("size") || "600", 10)))

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "app.fizmoh.cloud"
  const protocol = request.headers.get("x-forwarded-proto") || "https"
  const cardUrl = `${protocol}://${host}/card/${card.slug}?src=qr`

  if (format === "svg") {
    const svg = await generateQrSvg(cardUrl, { darkColor: color, width })
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    })
  }

  const pngBuffer = await generateQrPngBuffer(cardUrl, { darkColor: color, width })
  return new Response(new Uint8Array(pngBuffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  })
}
