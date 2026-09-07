import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { readMedia } from "@/lib/media-store"

/**
 * Serves conversation media.
 *
 * Public by necessity: WhatsApp fetches attachments from its own servers with
 * no session cookie, so a send would fail against an authenticated route. The
 * filenames are random UUIDs, so the path cannot be walked to enumerate other
 * conversations' files.
 */
export const GET = withErrors(async (_: NextRequest, { params }: { params: Promise<{ name: string }> }) => {
  const { name } = await params
  const file = await readMedia(name)
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(file.body.byteLength),
      "Cache-Control": "private, max-age=86400",
      // Never let a stored file execute in the browser as markup.
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  })
})
