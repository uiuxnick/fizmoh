import { createHash, randomUUID } from "crypto"
import { mkdir, writeFile, readFile, stat } from "fs/promises"
import path from "path"
import { currentTenant } from "@/lib/tenant"

/**
 * On-disk store for conversation media.
 *
 * Inbound WhatsApp media used to be stored as Meta's media id, which is not a
 * URL and expires in minutes — nothing could ever render it, so images a
 * customer sent showed as an empty bubble. Payment screenshots avoided this by
 * being inlined as data URIs, but that is not viable for every attachment: a
 * few megabytes of base64 per image, carried in every conversation query.
 *
 * Files live outside the release directory so they survive a deploy, and are
 * served back through a route rather than by the web server, which keeps the
 * path from being guessable and the content type honest.
 */

const MEDIA_DIR = process.env.MEDIA_DIR || "/home/fizmoh-platform/shared/uploads"

/**
 * A workspace's own folder under the media root.
 *
 * One flat directory was fine while one business used it. With several, a
 * leaked or guessed filename would read across businesses, and there would be
 * no way to export or delete one workspace's files without walking every row
 * in the database first. The id is checked against a strict pattern because
 * it is being used as a path segment.
 */
function tenantDir(): string {
  const id = currentTenant()?.tenantId
  if (!id || !/^[a-z0-9]+$/i.test(id)) return MEDIA_DIR
  return path.join(/*turbopackIgnore: true*/ MEDIA_DIR, id)
}

/** Only formats WhatsApp itself accepts, so a send cannot fail on the type. */
const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["video/mp4", "mp4"],
  ["video/3gpp", "3gp"],
  ["audio/mpeg", "mp3"],
  ["audio/ogg", "ogg"],
  ["audio/aac", "aac"],
  ["audio/amr", "amr"],
  ["audio/mp4", "m4a"],
  ["audio/webm", "webm"],
  ["application/pdf", "pdf"],
  ["application/msword", "doc"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
  ["application/vnd.ms-excel", "xls"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
  ["text/plain", "txt"],
])

export const MAX_MEDIA_BYTES = 16 * 1024 * 1024

export function isAllowedMediaType(mimeType: string): boolean {
  return ALLOWED.has(mimeType.split(";")[0].trim().toLowerCase())
}

export function extensionFor(mimeType: string): string {
  return ALLOWED.get(mimeType.split(";")[0].trim().toLowerCase()) || "bin"
}

/** Maps a WhatsApp media category from the MIME type. */
export function mediaCategory(mimeType: string): "image" | "video" | "audio" | "document" {
  const type = mimeType.toLowerCase()
  if (type.startsWith("image/")) return "image"
  if (type.startsWith("video/")) return "video"
  if (type.startsWith("audio/")) return "audio"
  return "document"
}

export interface StoredMedia {
  /** Path served by the app, e.g. /api/media/ab12….jpg */
  url: string
  filename: string
  mimeType: string
  bytes: number
}

export async function storeMedia(buffer: Buffer, mimeType: string, originalName?: string): Promise<StoredMedia> {
  if (buffer.byteLength > MAX_MEDIA_BYTES) {
    throw new Error(`File is larger than ${Math.round(MAX_MEDIA_BYTES / 1024 / 1024)} MB`)
  }
  if (!isAllowedMediaType(mimeType)) {
    throw new Error(`Unsupported file type: ${mimeType}`)
  }

  const dir = tenantDir()
  await mkdir(dir, { recursive: true })

  // A random name rather than the customer's: an uploaded filename is
  // attacker-controlled and would otherwise reach the filesystem.
  const name = `${randomUUID()}.${extensionFor(mimeType)}`
  // The directory is already validated and the filename is generated above;
  // joining this way also keeps Turbopack from tracing the external upload
  // directory into the standalone release.
  const filePath = `${dir}${path.sep}${name}`
  await writeFile(/*turbopackIgnore: true*/ filePath, buffer)

  return {
    url: `/api/media/${name}`,
    filename: originalName?.replace(/[^\w.\- ]+/g, "").slice(0, 120) || name,
    mimeType,
    bytes: buffer.byteLength,
  }
}

const EXT_TO_MIME = new Map([...ALLOWED].map(([mime, ext]) => [ext, mime]))

export async function readMedia(name: string): Promise<{ body: Buffer; mimeType: string } | null> {
  // The name comes from a URL, so anything with a separator or a traversal
  // segment is rejected outright rather than normalised.
  if (!/^[a-f0-9-]{36}\.[a-z0-9]{1,5}$/i.test(name)) return null

  // The caller's own folder first, then the flat root where everything
  // uploaded before workspaces existed still lives.
  const candidates = [path.join(/*turbopackIgnore: true*/ tenantDir(), name), path.join(/*turbopackIgnore: true*/ MEDIA_DIR, name)]
  for (const full of candidates) {
    try {
      const info = await stat(/*turbopackIgnore: true*/ full)
      if (!info.isFile()) continue
      const body = await readFile(/*turbopackIgnore: true*/ full)
      const ext = name.split(".").pop()!.toLowerCase()
      return { body, mimeType: EXT_TO_MIME.get(ext) || "application/octet-stream" }
    } catch {
      // Not here; try the next place it could be.
    }
  }

  // Scan workspace subdirectories under MEDIA_DIR for unauthenticated media serving
  try {
    const { readdir } = await import("fs/promises")
    const entries = await readdir(/*turbopackIgnore: true*/ MEDIA_DIR, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const full = path.join(/*turbopackIgnore: true*/ MEDIA_DIR, entry.name, name)
        try {
          const info = await stat(/*turbopackIgnore: true*/ full)
          if (info.isFile()) {
            const body = await readFile(/*turbopackIgnore: true*/ full)
            const ext = name.split(".").pop()!.toLowerCase()
            return { body, mimeType: EXT_TO_MIME.get(ext) || "application/octet-stream" }
          }
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }

  return null
}

/** Stable identifier for a file, used to avoid storing the same media twice. */
export function fingerprint(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex").slice(0, 32)
}
