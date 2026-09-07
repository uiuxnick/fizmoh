import { readFile } from "fs/promises"
import http2 from "http2"
import jwt from "jsonwebtoken"

/**
 * Apple push, spoken directly.
 *
 * No Firebase in the middle. Firebase would mean a second vendor holding the
 * same key, a second SDK in the app, and a second place for a delivery to go
 * missing — for a service that is one signed JWT and one HTTP/2 request.
 *
 * Two kinds of push leave here. An alert push is an ordinary notification. A
 * VoIP push is delivered even when the app is asleep and wakes it immediately,
 * which is the only way a WhatsApp call can ring in time: Meta stops accepting
 * an answer after about a minute, and an ordinary notification the agent has
 * to notice and tap is not fast enough. Apple requires a VoIP push to result
 * in a reported call, so it is only ever sent when a phone is genuinely
 * ringing.
 */

const KEY_PATH = process.env.APNS_KEY_PATH
const KEY_ID = process.env.APNS_KEY_ID
const TEAM_ID = process.env.APNS_TEAM_ID
const BUNDLE_ID = process.env.APNS_BUNDLE_ID
const PRODUCTION = "https://api.push.apple.com"
const SANDBOX = "https://api.sandbox.push.apple.com"
const HOST = process.env.APNS_ENVIRONMENT === "development" ? SANDBOX : PRODUCTION

export function isApnsConfigured(): boolean {
  return Boolean(KEY_PATH && KEY_ID && TEAM_ID && BUNDLE_ID)
}

/**
 * The provider token.
 *
 * Apple rejects a token older than an hour and, separately, refuses tokens
 * regenerated more often than once every 20 minutes. So it is cached and
 * rotated at 40 — comfortably inside both limits.
 */
let cached: { token: string; madeAt: number } | null = null
let key: string | null = null

async function providerToken(): Promise<string> {
  if (cached && Date.now() - cached.madeAt < 40 * 60_000) return cached.token
  if (!key) key = await readFile(KEY_PATH!, "utf8")

  const token = jwt.sign({ iss: TEAM_ID, iat: Math.floor(Date.now() / 1000) }, key, {
    algorithm: "ES256",
    header: { alg: "ES256", kid: KEY_ID! },
  })
  cached = { token, madeAt: Date.now() }
  return token
}

export interface PushResult {
  ok: boolean
  status: number
  /** Apple's reason string, which is the only useful part of a failure. */
  reason?: string
  /** True when the device is gone and its token should be deleted. */
  expired?: boolean
}

interface PushOptions {
  deviceToken: string
  payload: Record<string, unknown>
  /** "alert" for a notification, "voip" for a ringing call. */
  type: "alert" | "voip"
  /** Collapses earlier pushes with the same id, so one chat is one banner. */
  collapseId?: string
  priority?: "10" | "5"
}

export async function sendPush(options: PushOptions): Promise<PushResult> {
  if (!isApnsConfigured()) {
    return { ok: false, status: 0, reason: "APNs is not configured" }
  }

  const result = await push(HOST, options)

  // A token from a build signed for development only exists in the sandbox,
  // and one from TestFlight or the App Store only exists in production.
  // Apple's answer for the wrong one is BadDeviceToken, which reads exactly
  // like a broken key — and both kinds of build are in use at once while an
  // app is being tested. So the other environment is tried before giving up.
  if (result.reason === "BadDeviceToken") {
    const other = HOST === PRODUCTION ? SANDBOX : PRODUCTION
    const retried = await push(other, options)
    if (retried.ok) return retried
    // Rejected by both: the token really is dead, whichever build made it.
    return retried
  }

  return result
}

async function push(host: string, options: PushOptions): Promise<PushResult> {
  const token = await providerToken()
  // A VoIP push goes to a different topic — the bundle id with .voip appended.
  const topic = options.type === "voip" ? `${BUNDLE_ID}.voip` : BUNDLE_ID!

  return new Promise<PushResult>(resolve => {
    const client = http2.connect(host)
    let settled = false

    const finish = (result: PushResult) => {
      if (settled) return
      settled = true
      client.close()
      resolve(result)
    }

    client.on("error", error => {
      finish({ ok: false, status: 0, reason: String((error as Error).message) })
    })

    const body = Buffer.from(JSON.stringify(options.payload))
    const request = client.request({
      ":method": "POST",
      ":path": `/3/device/${options.deviceToken}`,
      "authorization": `bearer ${token}`,
      "apns-topic": topic,
      "apns-push-type": options.type,
      "apns-priority": options.priority ?? "10",
      ...(options.collapseId ? { "apns-collapse-id": options.collapseId.slice(0, 64) } : {}),
      "content-type": "application/json",
      "content-length": body.length,
    })

    let status = 0
    let raw = ""

    request.on("response", headers => {
      status = Number(headers[":status"] ?? 0)
    })
    request.setEncoding("utf8")
    request.on("data", chunk => { raw += chunk })
    request.on("end", () => {
      if (status === 200) return finish({ ok: true, status })
      let reason: string | undefined
      try {
        reason = JSON.parse(raw)?.reason
      } catch {
        reason = raw || undefined
      }
      // 410 means the app was deleted; BadDeviceToken means it never existed
      // for this environment. Either way the row is dead and keeping it means
      // pushing into a void forever.
      const expired = status === 410 || reason === "BadDeviceToken" || reason === "Unregistered"
      finish({ ok: false, status, reason, expired })
    })
    request.on("error", error => {
      finish({ ok: false, status: 0, reason: String((error as Error).message) })
    })

    request.end(body)
  })
}

/** An ordinary notification: a banner, a sound, and a badge. */
export function alertPayload(params: {
  title: string
  body: string
  badge?: number
  conversationId?: string
  messageId?: string
}) {
  return {
    aps: {
      alert: { title: params.title, body: params.body },
      sound: "default",
      ...(params.badge !== undefined ? { badge: params.badge } : {}),
      // Groups a chat's notifications together in Notification Centre.
      ...(params.conversationId ? { "thread-id": params.conversationId } : {}),
    },
    conversationId: params.conversationId,
    messageId: params.messageId,
  }
}

/**
 * A ringing call.
 *
 * Everything the device needs to show the caller and answer is in here,
 * because the app is woken with seconds to spare and cannot spend them on a
 * round trip. The SDP offer is large but well inside the 5KB a VoIP push
 * allows.
 */
export function callPayload(params: {
  callId: string
  conversationId: string
  customerName: string
  from: string
  offer: string
}) {
  return { ...params, kind: "incoming_call" }
}
