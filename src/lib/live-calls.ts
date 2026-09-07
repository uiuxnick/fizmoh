/**
 * Calls that are ringing right now.
 *
 * A WhatsApp call arrives as a webhook carrying an SDP offer, and the business
 * has roughly 30–60 seconds to answer it with an SDP answer. That is far too
 * short to be worth a database row and a migration: the offer is worthless the
 * moment the window closes, and nothing outside that window ever reads it.
 *
 * So it lives in memory, next to the realtime bus, which is already in-process
 * for the same reason. If this app is ever run as more than one instance, both
 * need moving behind Redis together — an offer stored on instance A cannot be
 * answered by an agent connected to instance B.
 */

export interface LiveCall {
  callId: string
  from: string
  conversationId: string
  customerName: string
  /** The caller's SDP offer, which the answering device must reply to. */
  offer: string
  receivedAt: number
  /** Set once an agent has taken it, so a second agent is told rather than racing. */
  answeredBy?: string
  answeredAt?: number
}

/** Meta gives 30–60s; anything older than that cannot be answered anyway. */
const RING_TTL_MS = 75_000

const globalForCalls = globalThis as unknown as { __wptourCalls?: Map<string, LiveCall> }

function store(): Map<string, LiveCall> {
  if (!globalForCalls.__wptourCalls) globalForCalls.__wptourCalls = new Map()
  return globalForCalls.__wptourCalls
}

/** Drops calls whose answer window has passed, so the map cannot grow forever. */
function sweep() {
  const now = Date.now()
  for (const [id, call] of store()) {
    if (now - call.receivedAt > RING_TTL_MS) store().delete(id)
  }
}

export function rememberCall(call: Omit<LiveCall, "receivedAt">): LiveCall {
  sweep()
  const entry: LiveCall = { ...call, receivedAt: Date.now() }
  store().set(call.callId, entry)
  return entry
}

export function getCall(callId: string): LiveCall | undefined {
  sweep()
  return store().get(callId)
}

/**
 * Claims a ringing call for one agent.
 *
 * Two agents tapping Answer at the same moment would both build a WebRTC
 * answer and both post it; Meta accepts the first and the second's microphone
 * would be live with nothing on the other end. The first claim wins here.
 */
export function claimCall(callId: string, staffId: string): { ok: boolean; takenBy?: string } {
  const call = getCall(callId)
  if (!call) return { ok: false }
  if (call.answeredBy && call.answeredBy !== staffId) {
    return { ok: false, takenBy: call.answeredBy }
  }
  call.answeredBy = staffId
  call.answeredAt = Date.now()
  return { ok: true }
}

export function forgetCall(callId: string) {
  store().delete(callId)
}

/** Ringing calls, newest first — what an app asks for after reconnecting. */
export function ringingCalls(): LiveCall[] {
  sweep()
  return [...store().values()]
    .filter(call => !call.answeredBy)
    .sort((a, b) => b.receivedAt - a.receivedAt)
}
