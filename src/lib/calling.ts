import { getWhatsAppConfig, isWhatsAppConfigured } from "@/lib/whatsapp"
import { getConfigValue } from "@/lib/app-config"

/**
 * WhatsApp voice calling.
 *
 * Meta's Business Calling API is real, and this speaks it. What it cannot do
 * on its own is carry the audio: a connected call is a WebRTC session, and
 * something has to hold the other end of it. That something is not a Next.js
 * route handler.
 *
 * So this covers what a server can honestly do — turning calling on for the
 * number, reading whether it is on, and placing the call request — and the
 * apps carry the audio. Until the number is verified and calling is enabled by
 * Meta, every function here reports that plainly rather than failing in a way
 * that looks like a bug in the app.
 */

export interface CallingStatus {
  /** Whether the API says calling is switched on for this number. */
  enabled: boolean
  /** Whether we could ask at all. */
  known: boolean
  reason?: string
}

export async function callingStatus(): Promise<CallingStatus> {
  if (!(await isWhatsAppConfigured())) {
    return { enabled: false, known: false, reason: "WhatsApp is not configured" }
  }
  const config = await getWhatsAppConfig()

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${config.phoneNumberId}/settings?fields=calling`,
      { headers: { Authorization: `Bearer ${config.accessToken}` }, cache: "no-store" },
    )
    const data = await response.json()
    if (!response.ok) {
      return {
        enabled: false,
        known: false,
        reason: data?.error?.message || `Meta returned ${response.status}`,
      }
    }
    const status = data?.calling?.status || data?.calling?.call_icon_visibility
    return { enabled: String(status).toUpperCase() === "ENABLED", known: true }
  } catch (error) {
    return { enabled: false, known: false, reason: "Could not reach Meta" }
  }
}

/** Turns calling on for the number. Requires the number to be verified. */
export async function enableCalling(enable: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!(await isWhatsAppConfigured())) return { ok: false, error: "WhatsApp is not configured" }
  const config = await getWhatsAppConfig()

  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${config.phoneNumberId}/settings`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        calling: {
          status: enable ? "ENABLED" : "DISABLED",
          call_icon_visibility: enable ? "DEFAULT" : "DISABLE_ALL",
        },
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      return { ok: false, error: data?.error?.error_user_msg || data?.error?.message || `Meta returned ${response.status}` }
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: "Could not reach Meta" }
  }
}

/**
 * Asks Meta to place a call to a customer.
 *
 * A business may only call somebody who has agreed to it — Meta requires call
 * permission, usually granted by the customer tapping a call button in the
 * chat. Without it this returns Meta's refusal rather than pretending to dial.
 */
export async function placeCall(to: string, sdpOffer?: string): Promise<{ ok: boolean; callId?: string; error?: string }> {
  if (!(await isWhatsAppConfigured())) return { ok: false, error: "WhatsApp is not configured" }

  const status = await callingStatus()
  if (!status.enabled) {
    return {
      ok: false,
      error: status.known
        ? "Calling is not switched on for this number yet"
        : status.reason || "Calling is unavailable",
    }
  }

  // Without an audio session there is nothing to connect the customer to, so
  // this refuses rather than ringing somebody and then going silent.
  if (!sdpOffer) {
    return { ok: false, error: "No audio session was offered, so there is nothing to connect" }
  }

  const config = await getWhatsAppConfig()
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${config.phoneNumberId}/calls`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        action: "connect",
        session: { sdp_type: "offer", sdp: sdpOffer },
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      return { ok: false, error: data?.error?.error_user_msg || data?.error?.message || `Meta returned ${response.status}` }
    }
    return { ok: true, callId: data?.calls?.[0]?.id }
  } catch (error) {
    return { ok: false, error: "Could not reach Meta" }
  }
}

/**
 * Answers a ringing call with the SDP the agent's device produced.
 *
 * Two requests, in this order and not merged: pre-accept establishes the
 * WebRTC connection before Meta starts sending audio, so the first second of
 * the caller's sentence is not clipped while ICE and DTLS finish. Accept then
 * opens the media path on a connection that already exists.
 *
 * A failed pre-accept is not fatal — the call can still be accepted, just with
 * a rougher start — so it is attempted and its failure noted rather than
 * abandoning a call somebody is waiting on.
 */
export async function answerCall(
  callId: string,
  sdpAnswer: string,
): Promise<{ ok: boolean; error?: string; preAccepted: boolean }> {
  const pre = await callAction({ callId, action: "pre_accept", sdp: sdpAnswer })
  const accepted = await callAction({ callId, action: "accept", sdp: sdpAnswer })
  return { ok: accepted.ok, error: accepted.error, preAccepted: pre.ok }
}

/** Declines a ringing call. The caller hears it refused rather than ringing out. */
export function rejectCall(callId: string) {
  return callAction({ callId, action: "reject" })
}

/**
 * Hangs up.
 *
 * Required even when the other end has already gone and an RTCP BYE has been
 * seen in the media path: Meta only counts a call as ended when told.
 */
export function terminateCall(callId: string) {
  return callAction({ callId, action: "terminate" })
}

async function callAction(params: {
  callId: string
  action: "pre_accept" | "accept" | "reject" | "terminate"
  sdp?: string
}): Promise<{ ok: boolean; error?: string }> {
  if (!(await isWhatsAppConfigured())) return { ok: false, error: "WhatsApp is not configured" }
  const config = await getWhatsAppConfig()

  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${config.phoneNumberId}/calls`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        call_id: params.callId,
        action: params.action,
        ...(params.sdp ? { session: { sdp_type: "answer", sdp: params.sdp } } : {}),
      }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return {
        ok: false,
        error: data?.error?.error_user_msg || data?.error?.message || `Meta returned ${response.status}`,
      }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: "Could not reach Meta" }
  }
}

/** The number a customer should ring, when WhatsApp calling is not available. */
export async function fallbackNumber(): Promise<string | null> {
  return (await getConfigValue("business_phone")) || null
}
