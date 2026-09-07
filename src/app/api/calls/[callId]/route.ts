import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { sessionFromRequest } from "@/lib/auth"
import { answerCall, rejectCall, terminateCall } from "@/lib/calling"
import { getCall, claimCall, forgetCall } from "@/lib/live-calls"
import { publish } from "@/lib/realtime"
import { z } from "zod"

/**
 * Answering a WhatsApp call.
 *
 * The audio is carried by the agent's device, not by this server: the app
 * builds an SDP answer to the caller's offer and posts it here, and this hands
 * it to Meta. That keeps the media path directly between the caller and the
 * person speaking, with no media server in the middle to pay for, scale, or
 * wake up at three in the morning.
 *
 * Everything here is on a clock. Meta gives roughly 30 to 60 seconds from the
 * ring to the accept, so this route does the minimum: claim, forward, reply.
 */

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("answer"), sdp: z.string().min(1).max(60_000) }),
  z.object({ action: z.literal("reject") }),
  z.object({ action: z.literal("terminate") }),
])

export const POST = withErrors(withModule("CALLS", 
  async (request: NextRequest, { params }: { params: Promise<{ callId: string }> }) => {
    const { callId } = await params

    const session = await sessionFromRequest(request)
    const staffId = session?.kind === "staff" ? session.staffId : null
    if (!staffId) return NextResponse.json({ error: "Sign in first" }, { status: 401 })

    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "That is not a call action" }, { status: 400 })
    }
    const body = parsed.data

    if (body.action === "terminate") {
      const result = await terminateCall(callId)
      forgetCall(callId)
      publish({ type: "call", conversationId: "", status: "TERMINATE", callId, ringing: false })
      return NextResponse.json({ ok: result.ok, error: result.error })
    }

    const call = getCall(callId)
    if (!call) {
      // Either it was answered elsewhere, the caller gave up, or the window
      // closed. All three mean the same thing to the agent holding the phone.
      return NextResponse.json(
        { error: "That call is no longer ringing", gone: true },
        { status: 409 },
      )
    }

    if (body.action === "reject") {
      const result = await rejectCall(callId)
      forgetCall(callId)
      publish({
        type: "call",
        conversationId: call.conversationId,
        status: "REJECTED",
        callId,
        ringing: false,
      })
      return NextResponse.json({ ok: result.ok, error: result.error })
    }

    // Two agents tapping Answer at the same moment would both open a
    // microphone; Meta takes the first answer and the second would be live
    // with nobody on the other end.
    const claim = claimCall(callId, staffId)
    if (!claim.ok) {
      return NextResponse.json(
        { error: "Someone else answered this call", taken: true },
        { status: 409 },
      )
    }

    const result = await answerCall(callId, body.sdp)
    if (!result.ok) {
      forgetCall(callId)
      return NextResponse.json({ error: result.error || "Meta refused the answer" }, { status: 502 })
    }

    // Every other device stops ringing the moment this one connects.
    publish({
      type: "call",
      conversationId: call.conversationId,
      status: "ANSWERED",
      callId,
      ringing: false,
    })

    return NextResponse.json({ ok: true, preAccepted: result.preAccepted })
  },
))

/** The offer for a call that is still ringing, for an app that has just reconnected. */
export const GET = withErrors(withModule("CALLS", 
  async (request: NextRequest, { params }: { params: Promise<{ callId: string }> }) => {
    const { callId } = await params
    const session = await sessionFromRequest(request)
    if (session?.kind !== "staff") return NextResponse.json({ error: "Sign in first" }, { status: 401 })

    const call = getCall(callId)
    if (!call) return NextResponse.json({ error: "That call is no longer ringing" }, { status: 404 })
    return NextResponse.json({ call })
  },
))
