import { createHmac } from "node:crypto"

const SECRET = process.env.AUTH_SECRET || "fizmoh_email_tracking_secret_2026"

export interface TrackingTokenPayload {
  tId: string // tenantId
  cId: string // campaignId
  sId: string // subscriberId
  rId: string // recipientId
  lId?: string // linkId
  url?: string // target url
}

export function encodeTrackingToken(payload: TrackingTokenPayload): string {
  const json = JSON.stringify(payload)
  const base64 = Buffer.from(json).toString("base64url")
  const hmac = createHmac("sha256", SECRET).update(base64).digest("base64url")
  return `${base64}.${hmac}`
}

export function decodeTrackingToken(token: string): TrackingTokenPayload | null {
  try {
    const [base64, sig] = token.split(".")
    if (!base64 || !sig) return null

    const expected = createHmac("sha256", SECRET).update(base64).digest("base64url")
    if (sig !== expected) return null

    const json = Buffer.from(base64, "base64url").toString("utf8")
    return JSON.parse(json) as TrackingTokenPayload
  } catch {
    return null
  }
}
