import { NextRequest, NextResponse } from "next/server"
import { sessionFromRequest } from "@/lib/auth"
import { db } from "@/lib/db"
import { transcribeAudio } from "@/lib/ai"
import { readMedia } from "@/lib/media-store"
import { withErrors } from "@/lib/api-handler"

/**
 * POST /api/ai/transcribe
 *
 * Transcribes audio / voice notes into text (Arabic, English, Urdu, etc.)
 * Supports:
 * - { messageId: string } -> loads message from DB, extracts audio, transcribes, updates message caption
 * - { url: string, mimeType?: string } -> fetches audio from URL, transcribes
 * - FormData with audio file attachment
 */
export const POST = withErrors(async (req: NextRequest) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let messageId: string | null = null
  let audioBuffer: Buffer | null = null
  let mimeType = "audio/ogg"

  const contentType = req.headers.get("content-type") || ""

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    messageId = (formData.get("messageId") as string) || null

    if (file) {
      const arrayBuffer = await file.arrayBuffer()
      audioBuffer = Buffer.from(arrayBuffer)
      mimeType = file.type || "audio/ogg"
    }
  } else {
    const body = await req.json().catch(() => ({}))
    messageId = body.messageId || null
    const url = body.url || ""
    if (body.mimeType) mimeType = body.mimeType

    if (messageId) {
      const msg = await db.message.findUnique({
        where: { id: messageId },
        select: { id: true, mediaUrl: true, caption: true, type: true },
      })

      if (!msg) {
        return NextResponse.json({ error: "Message not found" }, { status: 404 })
      }

      // Check if already transcribed
      if (msg.caption && msg.caption.startsWith("Transcript: ")) {
        return NextResponse.json({
          success: true,
          text: msg.caption.replace(/^Transcript:\s*/, "").trim(),
          cached: true,
          messageId: msg.id,
        })
      }

      const mediaUrl = msg.mediaUrl || ""
      if (!mediaUrl) {
        return NextResponse.json({ error: "Message contains no audio media" }, { status: 400 })
      }

      // Handle media store files (/api/media/filename.ext)
      const mediaMatch = mediaUrl.match(/([a-f0-9-]{36}\.[a-z0-9]{1,5})/i)
      if (mediaMatch) {
        const stored = await readMedia(mediaMatch[1])
        if (stored) {
          audioBuffer = stored.body
          mimeType = stored.mimeType || "audio/ogg"
        }
      }

      // If not in local media store, fetch from full URL or data URI
      if (!audioBuffer && (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://"))) {
        const res = await fetch(mediaUrl)
        if (res.ok) {
          const ab = await res.arrayBuffer()
          audioBuffer = Buffer.from(ab)
          const fetchedType = res.headers.get("content-type")
          if (fetchedType) mimeType = fetchedType
        }
      } else if (!audioBuffer && mediaUrl.startsWith("data:")) {
        const parts = mediaUrl.split(",")
        if (parts.length === 2) {
          const match = parts[0].match(/data:(.*?);base64/)
          if (match) mimeType = match[1]
          audioBuffer = Buffer.from(parts[1], "base64")
        }
      }
    } else if (url) {
      const mediaMatch = url.match(/([a-f0-9-]{36}\.[a-z0-9]{1,5})/i)
      if (mediaMatch) {
        const stored = await readMedia(mediaMatch[1])
        if (stored) {
          audioBuffer = stored.body
          mimeType = stored.mimeType || "audio/ogg"
        }
      }

      if (!audioBuffer && (url.startsWith("http://") || url.startsWith("https://"))) {
        const res = await fetch(url)
        if (res.ok) {
          const ab = await res.arrayBuffer()
          audioBuffer = Buffer.from(ab)
          const fetchedType = res.headers.get("content-type")
          if (fetchedType) mimeType = fetchedType
        }
      }
    }
  }

  if (!audioBuffer) {
    return NextResponse.json({ error: "Could not retrieve audio data to transcribe" }, { status: 400 })
  }

  const result = await transcribeAudio(audioBuffer, mimeType)
  if (result.error || !result.text) {
    return NextResponse.json({ error: result.error || "Transcription failed" }, { status: 422 })
  }

  const transcribedText = result.text.trim()

  // Persist transcript on message if messageId was provided
  if (messageId) {
    await db.message.update({
      where: { id: messageId },
      data: {
        caption: `Transcript: ${transcribedText}`,
      },
    }).catch(err => console.error("Failed to update message with transcript:", err))
  }

  return NextResponse.json({
    success: true,
    text: transcribedText,
    messageId,
  })
})
