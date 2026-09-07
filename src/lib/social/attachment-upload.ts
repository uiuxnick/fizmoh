import { readFile, stat } from "node:fs/promises"
import path from "node:path"
import { currentTenant } from "@/lib/tenant-context"

type MediaType = "IMAGE" | "VIDEO" | "AUDIO" | "FILE"
type GraphHost = "graph.facebook.com" | "graph.instagram.com"

export function localAttachmentName(mediaUrl: string): string | null {
  const url = new URL(mediaUrl)
  const base = new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://app.fizmoh.cloud")
  if (url.origin !== base.origin) return null
  const match = /^\/api\/media\/([a-f0-9-]{36}\.[a-z0-9]{1,5})$/i.exec(url.pathname)
  if (!match || url.search || url.hash) throw new Error("Invalid local attachment URL")
  return match[1]
}

export async function uploadAttachmentBytes(
  host: GraphHost, version: string, token: string, type: MediaType,
  bytes: Uint8Array, filename: string, request: typeof fetch = fetch,
): Promise<string> {
  const mime: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", mp4: "video/mp4", mp3: "audio/mpeg", ogg: "audio/ogg", pdf: "application/pdf" }
  const form = new FormData()
  form.set("message", JSON.stringify({ attachment: { type: type.toLowerCase(), payload: { is_reusable: true } } }))
  form.set("filedata", new Blob([new Uint8Array(bytes)], { type: mime[filename.split(".").pop()!] || "application/octet-stream" }), filename)
  const res = await request(`https://${host}/${version}/me/message_attachments`, {
    method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form, signal: AbortSignal.timeout(30000),
  })
  const data = await res.json()
  if (!res.ok || typeof data.attachment_id !== "string" || !data.attachment_id) {
    console.error("[social-attachment-upload]", { host, status: res.status, code: data.error?.code, subcode: data.error?.error_subcode })
    throw new Error(`Media upload to ${host === "graph.facebook.com" ? "Facebook" : "Instagram"} failed (HTTP ${res.status}, code ${data.error?.code ?? "unknown"})`)
  }
  return data.attachment_id
}

/** Read only the active tenant's upload directory; never fetch arbitrary URLs
 * or search other tenants' folders to prepare a social attachment. */
export async function socialAttachmentPayload(host: GraphHost, version: string, token: string, mediaUrl: string, type: MediaType) {
  const name = localAttachmentName(mediaUrl)
  if (!name) return { url: mediaUrl }
  const tenantId = currentTenant()?.tenantId
  if (!tenantId || !/^[a-z0-9]+$/i.test(tenantId)) throw new Error("A workspace is required to send this attachment")
  const root = process.env.MEDIA_DIR || "/home/fizmoh-platform/shared/uploads"
  const filename = path.join(/*turbopackIgnore: true*/ root, tenantId, name)
  const info = await stat(/*turbopackIgnore: true*/ filename)
  if (!info.isFile() || info.size <= 0 || info.size > 16 * 1024 * 1024) throw new Error("Attachment must be between 1 byte and 16 MB")
  const bytes = await readFile(/*turbopackIgnore: true*/ filename)
  const attachmentId = await uploadAttachmentBytes(host, version, token, type, bytes, name)
  return { attachment_id: attachmentId }
}
