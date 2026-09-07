import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { storeMedia, mediaCategory, MAX_MEDIA_BYTES, isAllowedMediaType } from "@/lib/media-store"

/**
 * Accepts a file from the agent composer.
 *
 * The composer previously asked for a public URL, which meant an agent could
 * not send anything that was not already on the internet — no photo from their
 * phone, no scan, no voice note.
 */
export const POST = withErrors(async (request: NextRequest) => {
  const form = await request.formData().catch(() => null)
  const file = form?.get("file")

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file received" }, { status: 400 })
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "That file is empty" }, { status: 400 })
  }
  if (file.size > MAX_MEDIA_BYTES) {
    return NextResponse.json({ error: `Files must be under ${Math.round(MAX_MEDIA_BYTES / 1024 / 1024)} MB` }, { status: 413 })
  }

  const mimeType = file.type || "application/octet-stream"
  if (!isAllowedMediaType(mimeType)) {
    return NextResponse.json({ error: `WhatsApp does not accept ${mimeType} files` }, { status: 415 })
  }

  const stored = await storeMedia(Buffer.from(await file.arrayBuffer()), mimeType, file.name)
  return NextResponse.json({ ...stored, category: mediaCategory(mimeType) }, { status: 201 })
})
