import { randomUUID } from "node:crypto"
import { SignJWT, jwtVerify } from "jose"
import { z } from "zod"

export const SUPPORT_PHONE = "+96898314456"
export const SUPPORT_AI_ID = "platform-support-ai"
export const SUPPORT_CHANNELS = ["LIVE_CHAT", "WEBSITE"]
export const SUPPORT_WELCOME = "Hi! I'm Fizmoh's AI support assistant. How can I help? You can request the platform support team at any time."
// LiteSpeed can repeat Origin; accept only identical approved values, never mixed origins.
export function supportOrigin(value: string | null): string | null {
  if (!value) return "https://app.fizmoh.cloud"
  const origins = value.split(",").map(origin => origin.trim()).filter(Boolean)
  if (origins.length === 0) return "https://app.fizmoh.cloud"
  if (!origins.every(origin => origin === origins[0])) return null

  const target = origins[0]
  try {
    const url = new URL(target)
    const hostname = url.hostname.toLowerCase()
    if (
      hostname === "fizmoh.cloud" ||
      hostname.endsWith(".fizmoh.cloud") ||
      hostname === "fizmoh.com" ||
      hostname.endsWith(".fizmoh.com") ||
      (process.env.NODE_ENV !== "production" && (hostname === "localhost" || hostname === "127.0.0.1"))
    ) {
      return target
    }
  } catch {
    return null
  }
  return null
}
export const supportReference = () => `FZ-${randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`
export const supportLead = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  phone: z.string().trim().max(30).transform(value => value.replace(/[\s()-]/g, "")).pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, "Include your country code, for example +96898314456")),
  mode: z.enum(["chat", "ticket"]).default("chat"),
  subject: z.string().trim().min(3).max(160).optional(),
  content: z.string().trim().min(1).max(4000).optional(),
}).refine(value => value.mode !== "ticket" || (value.subject && value.content), "A ticket needs a subject and description")

function secret() {
  const value = process.env.JWT_SECRET
  if (!value || value.length < 32) throw new Error("Support session signing is not configured")
  return new TextEncoder().encode(value)
}

export async function signSupportSession(ticketId: string, visitorId: string) {
  return new SignJWT({ ticketId, visitorId })
    .setProtectedHeader({ alg: "HS256" }).setIssuer("fizmoh-support")
    .setAudience("fizmoh-support-widget").setIssuedAt().setExpirationTime("7d").sign(secret())
}

export async function verifySupportSession(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"], issuer: "fizmoh-support", audience: "fizmoh-support-widget",
    })
    if (typeof payload.ticketId !== "string" || typeof payload.visitorId !== "string" || !payload.visitorId.startsWith("visitor:")) return null
    return { ticketId: payload.ticketId, visitorId: payload.visitorId }
  } catch { return null }
}

export function supportAuthor(staffId: string) {
  return staffId === SUPPORT_AI_ID ? "AI assistant" : staffId.startsWith("visitor:") ? "Website visitor" : "Support team"
}
