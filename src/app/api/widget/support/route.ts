import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { raw } from "@/lib/db"
import { checkSharedRateLimit, requestIp } from "@/lib/rate-limit"
import { platformSupportReply } from "@/lib/platform-support-ai"
import { supportOrigin, SUPPORT_AI_ID, SUPPORT_CHANNELS, SUPPORT_WELCOME, supportLead, supportReference, signSupportSession, verifySupportSession } from "@/lib/platform-support"

export const dynamic = "force-dynamic"

function headers(request: NextRequest) {
  const origin = supportOrigin(request.headers.get("origin"))
  if (!origin) return null
  return { "Access-Control-Allow-Origin": origin || "https://app.fizmoh.cloud", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Cache-Control": "no-store", Vary: "Origin" }
}

export async function OPTIONS(request: NextRequest) {
  const cors = headers(request)
  return new NextResponse(null, { status: cors ? 204 : 403, headers: cors || {} })
}

const messageBody = z.object({ content: z.string().trim().min(1).max(4000).optional(), requestHumanHandoff: z.boolean().optional() })

async function handle(request: NextRequest) {
  const cors = headers(request)
  if (!cors) return NextResponse.json({ error: "Origin not allowed" }, { status: 403 })
  const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: cors })
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    if (!token) {
      if (request.method !== "POST") return json({ error: "Support session required" }, 401)
      const limit = await checkSharedRateLimit(`support-start:${requestIp(request.headers)}`, 5, 60 * 60 * 1000)
      if (!limit.allowed) return json({ error: "Please wait before starting another support request" }, 429)
      const lead = supportLead.safeParse(await request.json().catch(() => null))
      if (!lead.success) return json({ error: "Enter your name, international phone number, and ticket details if creating a ticket" }, 400)
      const { name, phone, mode, subject, content } = lead.data
      const visitorId = `visitor:${randomUUID()}`
      const id = randomUUID()
      // Sign first so a missing signing key cannot leave an inaccessible ticket.
      const sessionToken = await signSupportSession(id, visitorId)
      const ticket = await raw.supportTicket.create({ data: {
        id, tenantId: null, reference: supportReference(), createdById: visitorId,
        subject: subject || `Website chat — ${name}`, body: `Name: ${name}\nPhone: ${phone}\n\n${content || "Website live support conversation"}`,
        channel: mode === "ticket" ? "WEBSITE" : "LIVE_CHAT", status: mode === "ticket" ? "WAITING" : "OPEN",
        replies: { create: { staffId: SUPPORT_AI_ID, body: mode === "ticket" ? "Your ticket has been submitted to the platform support team. Keep this chat to see replies." : SUPPORT_WELCOME } },
      } })
      return json({ sessionId: ticket.id, sessionToken, reference: ticket.reference, status: ticket.status, botActive: mode !== "ticket" }, 201)
    }
    const session = await verifySupportSession(token)
    if (!session) return json({ error: "Support session expired. Please start a new chat." }, 401)
    const ticket = await raw.supportTicket.findFirst({ where: { id: session.ticketId, createdById: session.visitorId, tenantId: null, channel: { in: SUPPORT_CHANNELS } } })
    if (!ticket) return json({ error: "Support chat not found" }, 404)
    const limit = await checkSharedRateLimit(`support-${request.method}:${ticket.id}`, request.method === "GET" ? 40 : 12, 60_000)
    if (!limit.allowed) return json({ error: "Please wait a moment before trying again" }, 429)
    const toMessage = (reply: { id: string; staffId: string; body: string; createdAt: Date }) => ({ id: reply.id, direction: reply.staffId === session.visitorId ? "INBOUND" : reply.staffId === SUPPORT_AI_ID ? "BOT" : "OUTBOUND", content: reply.body, createdAt: reply.createdAt })
    if (request.method === "GET") {
      const replies = await raw.supportTicketReply.findMany({ where: { ticketId: ticket.id, isInternal: false }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100 })
      return json({ reference: ticket.reference, status: ticket.status, botActive: ticket.status === "OPEN" && !ticket.assignedStaffId, messages: replies.reverse().map(toMessage) })
    }
    const parsed = messageBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success || (!parsed.data.content && !parsed.data.requestHumanHandoff)) return json({ error: "Enter a message" }, 400)
    if (["RESOLVED", "CLOSED"].includes(ticket.status)) return json({ error: "This ticket is closed. Start a new support request." }, 409)
    const { content, requestHumanHandoff } = parsed.data
    const inbound = await raw.$transaction(async tx => {
      // Serialize visitor writes with owner replies and AI completion.
      await tx.$queryRaw`SELECT id FROM "SupportTicket" WHERE id = ${ticket.id} FOR UPDATE`
      const current = await tx.supportTicket.findUniqueOrThrow({ where: { id: ticket.id } })
      if (["RESOLVED", "CLOSED"].includes(current.status)) return null
      const updated = await tx.supportTicket.update({ where: { id: ticket.id }, data: { ...(requestHumanHandoff ? { status: "IN_PROGRESS" } : {}), updatedAt: new Date() } })
      const reply = await tx.supportTicketReply.create({ data: { ticketId: ticket.id, staffId: session.visitorId, body: requestHumanHandoff ? "Please connect me with the platform support team." : content! } })
      return { reply, ticket: updated }
    })
    if (!inbound) return json({ error: "This ticket is closed" }, 409)
    let aiResponse = null
    if (!requestHumanHandoff && inbound.ticket.status === "OPEN" && !inbound.ticket.assignedStaffId) {
      const history = await raw.supportTicketReply.findMany({ where: { ticketId: ticket.id, isInternal: false }, orderBy: { createdAt: "desc" }, take: 20 })
      let answer: string
      let unavailable = false
      try {
        answer = await platformSupportReply(history.reverse().map(reply => ({ role: reply.staffId === session.visitorId ? "user" : "assistant", content: reply.body })))
      } catch {
        unavailable = true
        answer = "AI support is unavailable right now. Your message is saved and queued for the platform support team. You can also contact us on WhatsApp at +96898314456."
        console.warn("[platform-support] AI unavailable; queued for human support")
      }
      aiResponse = await raw.$transaction(async tx => {
        // A human takeover or newer message wins over an in-flight AI reply.
        const claimed = await tx.supportTicket.updateMany({ where: { id: ticket.id, status: "OPEN", assignedStaffId: null, updatedAt: inbound.ticket.updatedAt }, data: { updatedAt: new Date(), ...(unavailable ? { status: "WAITING" } : {}) } })
        if (!claimed.count) return null
        return tx.supportTicketReply.create({ data: { ticketId: ticket.id, staffId: SUPPORT_AI_ID, body: answer.slice(0, 8000) } })
      })
    }
    return json({ message: toMessage(inbound.reply), aiResponse: aiResponse ? toMessage(aiResponse) : null, handoff: !!requestHumanHandoff })
  } catch {
    console.error("[platform-support] Request failed")
    return json({ error: "Support is temporarily unavailable. Please try again or use WhatsApp." }, 503)
  }
}

export const GET = handle
export const POST = handle
