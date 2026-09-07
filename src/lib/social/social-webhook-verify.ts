import crypto from "crypto"
import { getConfigValue } from "@/lib/app-config"

/**
 * X-Hub-Signature-256 verification, the same HMAC construction WhatsApp's
 * own webhook already uses (whatsapp.ts verifyWebhookSignature) — Meta signs
 * every product's webhook the same way, keyed to whichever app the webhook
 * is configured against.
 *
 * Split in two: `verifySignatureWithSecret` is the pure cryptographic check
 * (what the test suite exercises, with no database involved), and
 * `verifySocialWebhookSignature` is the thin wrapper that resolves which
 * secret to use for a given app.
 */
export function verifySignatureWithSecret(payload: string, signature: string | null, secret: string, failClosed: boolean): boolean {
  if (!secret) return !failClosed
  if (!signature) return !failClosed

  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex")
  const received = signature.replace("sha256=", "")

  const expectedDigest = crypto.createHash("sha256").update(expected).digest()
  const receivedDigest = crypto.createHash("sha256").update(received).digest()
  if (expectedDigest.length !== receivedDigest.length) return false
  return crypto.timingSafeEqual(expectedDigest, receivedDigest)
}

export async function verifySocialWebhookSignature(payload: string, signature: string | null, appSecretKey: "meta_app_secret" | "meta_instagram_app_secret"): Promise<boolean> {
  const secret = await getConfigValue(appSecretKey)
  const failClosed = process.env.NODE_ENV === "production"
  if (!secret && failClosed) console.error(`${appSecretKey} is not set — rejecting webhook delivery`)
  return verifySignatureWithSecret(payload, signature, secret, failClosed)
}
