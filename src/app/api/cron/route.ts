import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendWhatsApp, sendPreTourReminder, sendPostTourReviewRequest, sendEmail } from "@/lib/notifications"
import { sendCtaUrlMessage } from "@/lib/whatsapp"
import { settleFromGateway } from "@/lib/amwalpay-settle"
import { withErrors } from "@/lib/api-handler"
import { sweepSubscriptions } from "@/lib/billing"
import { forEachTenant, currentTenant } from "@/lib/tenant"

/**
 * Scheduled automation runner.
 *
 * Driven by the wptour-cron systemd timer, not by the app — an in-process
 * scheduler would die on every deploy and be invisible to journalctl.
 *
 * Every job here is idempotent: each writes a "sent at" marker on the row it
 * acted on, so a re-run (timer overlap, manual trigger, retry) never messages
 * the same customer twice.
 *
 * Auth: CRON_SECRET bearer token. The route is public in proxy.ts because the
 * timer has no session cookie, so this check is the only gate.
 */

export const maxDuration = 300

function authorize(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.get("authorization") || ""
  return header === `Bearer ${secret}`
}

// ─── Abandoned booking recovery (BRD §7) ───
async function runAbandonedRecovery() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)

  const abandoned = await db.order.findMany({
    where: {
      orderStatus: "PENDING_PAYMENT",
      createdAt: { lt: oneHourAgo, gt: twoDaysAgo },
      recoverySentAt: null,
    },
    include: { tour: true, slot: true, customer: true },
    take: 100,
  })

  let sent = 0
  for (const order of abandoned) {
    if (!order.customer?.whatsappOptIn) {
      await db.order.update({ where: { id: order.id }, data: { recoverySentAt: new Date() } })
      continue
    }
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://app.fizmoh.cloud"

    /*
     * The link is built from the order *number*, not its id.
     *
     * /booking/[orderNumber] looks the order up by orderNumber, so a recovery
     * message built from `order.id` sent every customer to a 404 — the one
     * message whose entire purpose is a working link back to the checkout.
     */
    const payUrl = `${baseUrl}/booking/${encodeURIComponent(order.orderNumber)}`

    // Answer in the language the booking was actually held in. The flow
    // records it on the conversation, so a customer who booked in Arabic is
    // not chased in English.
    const convo = await db.conversation.findFirst({
      where: { customerId: order.customerId },
      orderBy: { updatedAt: "desc" },
      select: { bookingState: true },
    })
    let arabic = false
    try {
      const raw = convo?.bookingState
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
      arabic = (parsed as { lang?: string } | null)?.lang === "ar"
    } catch { /* an unreadable state just means English */ }
    const tourName = arabic && order.tour.nameAr ? order.tour.nameAr : order.tour.name

    const body = arabic
      ? `مرحباً ${order.customerName}، لم تكمل حجز "${tourName}". أكمل حجزك الآن:`
      : `Hi ${order.customerName}, you left "${tourName}" in your cart. Complete your booking:`

    // A tappable button rather than a bare link — it opens WhatsApp's in-app
    // browser the same way, and is acted on far more often.
    let result = await sendCtaUrlMessage({
      to: order.customerPhone,
      body,
      buttonText: arabic ? "أكمل الحجز" : "Complete booking",
      url: payUrl,
    })
    if (!result.success) {
      result = await sendWhatsApp({
        to: order.customerPhone,
        templateName: "abandoned_cart",
        templateVariables: [order.customerName || "there", tourName],
        body: `${body} ${payUrl}`,
      })
    }
    // Mark regardless of outcome — a failed send should not become a retry loop
    // that spams the customer once delivery recovers.
    await db.order.update({ where: { id: order.id }, data: { recoverySentAt: new Date() } })
    if (result.success) sent++
  }
  return { candidates: abandoned.length, sent }
}

/**
 * Card orders that never heard back from the gateway.
 *
 * A customer can pay and then close the tab before the return page loads, or
 * the notification can simply not arrive. Rather than leave the order pending
 * over money that was taken, every recent unsettled card order is checked
 * against AmwalPay directly. Orders it cannot confirm are left untouched.
 */
async function runCardSettlementSweep() {
  const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  const pending = await db.order.findMany({
    where: {
      paymentMethod: "AMWALPAY",
      paymentStatus: { notIn: ["APPROVED", "PAID", "REFUNDED"] },
      orderStatus: { notIn: ["CANCELLED", "COMPLETED"] },
      createdAt: { gte: since },
    },
    select: { orderNumber: true },
    take: 100,
  })

  let settled = 0
  for (const order of pending) {
    if (await settleFromGateway(order.orderNumber).catch(() => false)) settled++
  }
  return { checked: pending.length, settled }
}

// ─── Pre-tour reminders (BRD §6.3: 24h before) ───
async function runTourReminders() {
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const in36h = new Date(now.getTime() + 36 * 60 * 60 * 1000)

  const orders = await db.order.findMany({
    where: {
      orderStatus: "CONFIRMED",
      reminderSentAt: null,
      slot: { date: { gte: in24h, lt: in36h } },
    },
    select: { id: true },
    take: 200,
  })

  let sent = 0
  for (const { id } of orders) {
    await sendPreTourReminder(id)
    await db.order.update({ where: { id }, data: { reminderSentAt: new Date() } })
    sent++
  }
  return { candidates: orders.length, sent }
}

// ─── Post-tour review requests (BRD §6.3) ───
async function runReviewRequests() {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000)

  const orders = await db.order.findMany({
    where: {
      orderStatus: { in: ["COMPLETED", "CONFIRMED"] },
      reviewRequestSentAt: null,
      slot: { date: { gte: threeDaysAgo, lt: yesterday } },
    },
    select: { id: true },
    take: 200,
  })

  let sent = 0
  for (const { id } of orders) {
    await sendPostTourReviewRequest(id)
    await db.order.update({ where: { id }, data: { reviewRequestSentAt: new Date() } })
    sent++
  }
  return { candidates: orders.length, sent }
}

// ─── Scheduled campaigns (BRD §6.5.3) ───
async function runScheduledCampaigns(request: NextRequest) {
  const due = await db.campaign.findMany({
    where: {
      OR: [
        // Scheduled and the time has come.
        { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
        // Or already running with more to do — including one started by hand,
        // which has no scheduledAt and was therefore never picked up again.
        { status: "SENDING", pausedAt: null, cancelledAt: null },
      ],
    },
    select: { id: true },
    take: 5,
  })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin
  let dispatched = 0
  for (const { id } of due) {
    try {
      const res = await fetch(`${baseUrl}/api/campaigns/${id}/send`, {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      })
      if (res.ok) dispatched++
      else {
        const text = await res.text()
        await db.campaign.update({
          where: { id },
          data: { status: "FAILED", lastError: text.slice(0, 500) },
        })
      }
    } catch (error) {
      await db.campaign.update({
        where: { id },
        data: { status: "FAILED", lastError: String(error).slice(0, 500) },
      })
    }
  }
  return { due: due.length, dispatched }
}

// ─── Flows waiting on a timer ───
//
// A flow that pauses cannot hold the webhook open — Meta would have given up
// and redelivered the message long before a five-minute wait was over. The
// pause is a row with a time on it, and this is what comes back for it.
async function runDelayedFlows() {
  const due = await db.flowRun.findMany({
    where: { status: "WAITING", resumeAt: { lte: new Date() } },
    take: 25,
  })

  let resumed = 0
  for (const run of due) {
    const claimed = await db.flowRun.updateMany({ where: { id: run.id, status: "WAITING" }, data: { status: "RUNNING" } })
    if (!claimed.count) continue
    try {
      const conversation = await db.conversation.findUnique({
        where: { id: run.conversationId },
        select: { tenantId: true, customerPhone: true, customerId: true, botActive: true, automationPaused: true, channel: true, flowState: true },
      })
      // Somebody took the conversation over while the flow was waiting. The
      // flow does not get to talk over them.
      if (!conversation || !conversation.botActive || conversation.automationPaused || conversation.channel !== "WHATSAPP" || !conversation.flowState) {
        await db.flowRun.update({ where: { id: run.id }, data: { status: "DONE", endedAt: new Date() } })
        continue
      }

      const state = typeof conversation.flowState === "string" ? JSON.parse(conversation.flowState) : conversation.flowState as { runId?: string }
      const inbound = await db.message.findFirst({ where: { conversationId: run.conversationId, direction: "INBOUND" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } })
      if (state?.runId !== run.id || !inbound || Date.now() - inbound.createdAt.getTime() >= 86_400_000) {
        await db.flowRun.update({ where: { id: run.id }, data: { status: "EXPIRED", endedAt: new Date() } })
        continue
      }
      const { resumeFlowAt } = await import("@/lib/botflow-engine")
      const result = await resumeFlowAt({
        runId: run.id,
        tenantId: conversation.tenantId || run.tenantId || "",
        flowId: run.flowId,
        nodeId: run.currentNodeId || "",
        conversationId: run.conversationId,
        customerId: conversation.customerId || run.customerId || "",
        customerPhone: conversation.customerPhone,
        answers: (run.variables as Record<string, string>) || {},
      })
      if (!result.matched) await db.flowRun.update({ where: { id: run.id }, data: { status: "CANCELLED", endedAt: new Date() } })
      else resumed++
    } catch (error) {
      await db.flowRun.update({
        where: { id: run.id },
        data: { status: "FAILED", error: String(error).slice(0, 300), endedAt: new Date() },
      })
    }
  }
  return { due: due.length, resumed }
}

async function runWebhookRetries(request: NextRequest) {
  const due = await db.webhookDelivery.findMany({
    where: { status: "RETRYING", nextRetryAt: { lte: new Date() }, provider: { in: ["WOOCOMMERCE", "AMWALPAY", "WHATSAPP"] } },
    take: 25,
  })
  let processed = 0
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin
  for (const delivery of due) {
    try {
      const path = delivery.provider === "AMWALPAY"
        ? "/api/amwalpay/cloud-notification"
        : delivery.provider === "WHATSAPP"
        ? "/api/whatsapp/webhook"
        : "/api/woocommerce/webhook"
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-fizmoh-replay": process.env.CRON_SECRET || "" },
        body: JSON.stringify(delivery.payload || {}),
      })
      if (response.ok) {
        await db.webhookDelivery.update({
          where: { id: delivery.id },
          data: { status: "PROCESSED", processedAt: new Date(), response: { replayed: true } },
        })
        processed++
      } else {
        await db.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: delivery.attempts >= 8 ? "DEAD" : "RETRYING",
            attempts: { increment: 1 },
            nextRetryAt: new Date(Date.now() + 300_000),
            lastError: `Replay HTTP ${response.status}`,
          },
        })
      }
    } catch (error) {
      await db.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: delivery.attempts >= 8 ? "DEAD" : "RETRYING",
          attempts: { increment: 1 },
          nextRetryAt: new Date(Date.now() + 300_000),
          lastError: String(error).slice(0, 1000),
        },
      })
    }
  }
  return { due: due.length, processed }
}

// ─── Periodic WooCommerce catalog cache synchronization ───
async function runWooCommerceSync() {
  const tenantId = currentTenant()?.tenantId
  if (!tenantId) return { skipped: "No tenant context" }

  const { wcRequest } = await import("@/lib/woocommerce-client")
  try {
    const products = await wcRequest("products?per_page=100")
    const list = Array.isArray(products) ? products : []
    if (list.length > 0) {
      const existing = await db.systemSetting.findFirst({ where: { tenantId, key: "WOOCOMMERCE_PRODUCTS_CACHE" } })
      const payload = {
        lastSyncedAt: new Date().toISOString(),
        count: list.length,
        products: list,
      }
      if (existing) {
        await db.systemSetting.update({ where: { id: existing.id }, data: { value: JSON.stringify(payload) } })
      } else {
        await db.systemSetting.create({
          data: { tenantId, key: "WOOCOMMERCE_PRODUCTS_CACHE", value: JSON.stringify(payload), type: "JSON", category: "INTEGRATION" },
        })
      }
    }
    return { syncedCount: list.length }
  } catch (err: any) {
    return { skipped: err.message || "WooCommerce not configured or unreachable" }
  }
}

// ─── Overdue conversation alerts (emails assigned staff after 2h no reply) ───
async function runOverdueAlerts() {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return { skipped: true }
  const tenantId = tenant.tenantId

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
  const { getConfigValue, saveConfigValues } = await import("@/lib/app-config")

  const overdue = await db.conversation.findMany({
    where: {
      tenantId,
      status: { in: ["OPEN", "PENDING"] },
      lastMessageAt: { lt: twoHoursAgo },
    },
    include: {
      customer: { select: { name: true, phone: true } },
      assignedStaff: { select: { name: true, email: true } },
    },
    take: 50,
  })

  let alerted = 0
  const fourHoursMs = 4 * 60 * 60 * 1000

  for (const convo of overdue) {
    // Idempotency via SystemSetting: skip if we alerted within the last 4h
    const alertKey = `overdue_alert_${convo.id}`
    const lastAlert = await getConfigValue(alertKey).catch(() => "")
    if (lastAlert && Date.now() - Number(lastAlert) < fourHoursMs) continue

    // Check last message was inbound (from customer, not staff reply)
    const lastMsg = await db.message.findFirst({
      where: { conversationId: convo.id },
      orderBy: { createdAt: "desc" },
      select: { direction: true, createdAt: true },
    })
    if (!lastMsg || lastMsg.direction !== "IN") continue

    const staffEmail = convo.assignedStaff?.email
    const waitMins = Math.round((Date.now() - lastMsg.createdAt.getTime()) / 60000)
    const customerName = convo.customer?.name || convo.customer?.phone || "A customer"
    const subject = `⏰ Unread message waiting ${waitMins} min — ${customerName}`
    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#dc2626">⏰ Conversation needs attention</h2>
        <p><strong>${customerName}</strong> sent a message <strong>${waitMins} minutes ago</strong> and hasn't received a reply yet.</p>
        <p style="margin:20px 0">
          <a href="https://app.fizmoh.cloud/inbox" style="background:#0d9488;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
            Open Inbox →
          </a>
        </p>
        <p style="color:#64748b;font-size:13px">
          Assigned to: ${convo.assignedStaff?.name || "Unassigned"}<br/>
          Last message: ${lastMsg.createdAt.toLocaleString("en-GB", { timeZone: "Asia/Muscat" })}
        </p>
      </div>`

    const target = staffEmail || await getConfigValue("smtp_user").catch(() => "")
    const emailSubject = staffEmail ? subject : `[Unassigned] ${subject}`
    if (target) {
      await sendEmail({ to: target, subject: emailSubject, html, text: `${customerName} has been waiting ${waitMins} min. Open: https://app.fizmoh.cloud/inbox` })
    }
    await saveConfigValues({ [alertKey]: String(Date.now()) })
    alerted++
  }
  return { alerted, checked: overdue.length }
}

// ─── Daily staff digest (8am Oman time — sent once per calendar day) ─────────
async function runDailyDigest() {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return { skipped: true }
  const tenantId = tenant.tenantId

  // Only run between 07:00–09:00 Oman time (UTC+4)
  const omanHour = (new Date().getUTCHours() + 4) % 24
  if (omanHour < 7 || omanHour >= 9) return { skipped: "outside_window" }

  const { getConfigValue, saveConfigValues } = await import("@/lib/app-config")
  const todayKey = `digest_sent_${new Date().toISOString().slice(0, 10)}`
  const alreadySent = await getConfigValue(todayKey).catch(() => "")
  if (alreadySent === "1") return { skipped: "already_sent_today" }

  const [openCount, pendingCount, unrepliedCount] = await Promise.all([
    db.conversation.count({ where: { tenantId, status: "OPEN" } }),
    db.conversation.count({ where: { tenantId, status: "PENDING" } }),
    db.conversation.count({
      where: {
        tenantId,
        status: { in: ["OPEN", "PENDING"] },
        lastMessageAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      },
    }),
  ])

  const waiting = await db.conversation.findMany({
    where: { tenantId, status: { in: ["OPEN", "PENDING"] } },
    orderBy: { lastMessageAt: "asc" },
    take: 5,
    include: { customer: { select: { name: true, phone: true } }, assignedStaff: { select: { name: true } } },
  })

  const rows = waiting.map(c => {
    const waitH = Math.round((Date.now() - (c.lastMessageAt ?? new Date()).getTime()) / 3600000)
    const customer = c.customer?.name || c.customer?.phone || "Unknown"
    const staff = c.assignedStaff?.name || "Unassigned"
    return `<tr><td style="padding:6px 10px">${customer}</td><td style="padding:6px 10px">${staff}</td><td style="padding:6px 10px;color:${waitH > 4 ? "#dc2626" : "#64748b"}">${waitH}h</td></tr>`
  }).join("")

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#0d9488">📋 Daily Inbox Digest</h2>
      <div style="display:flex;gap:24px;margin:20px 0">
        <div style="text-align:center"><div style="font-size:2rem;font-weight:900;color:#0d9488">${openCount}</div><div style="color:#64748b;font-size:13px">Open</div></div>
        <div style="text-align:center"><div style="font-size:2rem;font-weight:900;color:#f59e0b">${pendingCount}</div><div style="color:#64748b;font-size:13px">Pending</div></div>
        <div style="text-align:center"><div style="font-size:2rem;font-weight:900;color:#dc2626">${unrepliedCount}</div><div style="color:#64748b;font-size:13px">Waiting 2h+</div></div>
      </div>
      ${rows ? `<h3>Longest waiting</h3><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f1f5f9"><th style="padding:6px 10px;text-align:left">Customer</th><th style="padding:6px 10px;text-align:left">Assigned</th><th style="padding:6px 10px;text-align:left">Wait</th></tr></thead><tbody>${rows}</tbody></table>` : ""}
      <p style="margin:24px 0"><a href="https://app.fizmoh.cloud/inbox" style="background:#0d9488;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Open Inbox →</a></p>
    </div>`

  const opsEmail = await getConfigValue("smtp_user").catch(() => "")
  if (!opsEmail) return { skipped: "no_smtp_user" }

  await sendEmail({
    to: opsEmail,
    subject: `📋 Inbox digest — ${openCount} open, ${unrepliedCount} waiting 2h+`,
    html,
    text: `Open: ${openCount} | Pending: ${pendingCount} | Waiting 2h+: ${unrepliedCount}\nhttps://app.fizmoh.cloud/inbox`,
  })

  await saveConfigValues({ [todayKey]: "1" })
  return { sent: true, openCount, pendingCount, unrepliedCount }
}

// ─── Auto-wake snoozed conversations when duration expires ───────────
async function runSnoozedConversationsSweep() {
  const snoozed = await db.conversation.findMany({
    where: { status: "SNOOZED" },
    select: { id: true, flowState: true, tenantId: true },
    take: 200,
  })
  const now = new Date()
  let reopenedCount = 0
  for (const c of snoozed) {
    let fs: Record<string, any> = {}
    try {
      fs = c.flowState && typeof c.flowState === "object" ? { ...(c.flowState as Record<string, any>) } : {}
    } catch {}
    const until = fs._snooze?.snoozedUntil ? new Date(fs._snooze.snoozedUntil) : null
    if (until && now >= until) {
      delete fs._snooze
      await db.conversation.update({
        where: { id: c.id },
        data: { status: "OPEN", flowState: fs },
      })
      reopenedCount++
      try {
        const { publish } = await import("@/lib/realtime")
        publish({ type: "conversation", conversationId: c.id, tenantId: c.tenantId || undefined })
      } catch {}
    }
  }
  return { checked: snoozed.length, reopened: reopenedCount }
}

export const POST = withErrors(async (request: NextRequest) => {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const only = searchParams.get("job")

  const results: Record<string, unknown> = {}

  /*
   * Jobs that act on one business's data, run once per business.
   *
   * Each of these reads bookings, conversations and campaigns and then sends
   * messages about them. Run without a workspace in scope they would gather
   * every business's rows into a single pass and send them all through
   * whichever WhatsApp credentials were loaded — one company's customers
   * messaged by another company's number.
   */
  const perTenant: Record<string, () => Promise<unknown>> = {
    abandoned_recovery: runAbandonedRecovery,
    card_settlement: runCardSettlementSweep,
    tour_reminders: runTourReminders,
    review_requests: runReviewRequests,
    scheduled_campaigns: () => runScheduledCampaigns(request),
    delayed_flows: runDelayedFlows,
    scheduled_bot_flows: async () => {
      const { runScheduledBotFlows } = await import("@/lib/flow-scheduler")
      return runScheduledBotFlows()
    },
    bot_maintenance: async () => {
      const { expireBotSeatHolds } = await import("@/lib/slots-server")
      await expireBotSeatHolds()
      const tenantId = currentTenant()?.tenantId
      if (!tenantId) return
      const { Prisma } = await import("@prisma/client")
      const stale = await db.conversation.findMany({ where: { tenantId, lastMessageAt: { lt: new Date(Date.now() - 86_400_000) }, NOT: { flowState: { equals: Prisma.DbNull } } }, select: { id: true, flowState: true, updatedAt: true }, take: 500 })
      let expired = 0
      for (const conversation of stale) {
        let state: any
        try { state = typeof conversation.flowState === "string" ? JSON.parse(conversation.flowState) : conversation.flowState } catch { continue }
        if (!state || !Number.isFinite(Date.parse(state.startedAt)) || Date.parse(state.startedAt) > Date.now() - 86_400_000) continue
        const cleared = await db.conversation.updateMany({ where: { id: conversation.id, updatedAt: conversation.updatedAt }, data: { flowState: Prisma.DbNull } })
        if (!cleared.count) continue
        await db.flowRun.updateMany({ where: { conversationId: conversation.id, status: "WAITING" }, data: { status: "EXPIRED", endedAt: new Date() } })
        expired++
      }
      return { expired }
    },
    social_replies: async () => {
      const { runSocialReplyQueue } = await import("@/lib/social/social-reply-queue")
      return runSocialReplyQueue()
    },
    webhook_retries: () => runWebhookRetries(request),
    woocommerce_sync: runWooCommerceSync,
    apt_reminders: async () => {
      const { processDueReminders } = await import("@/lib/apt-reminders")
      return processDueReminders()
    },
    review_auto_reply: async () => {
      const { runReviewAutoReplyForTenant } = await import("@/lib/review-reply-engine")
      return runReviewAutoReplyForTenant()
    },
    social_token_refresh: async () => {
      const { refreshSocialTokensForTenant } = await import("@/lib/social/social-oauth")
      return refreshSocialTokensForTenant()
    },
    snooze_sweep: runSnoozedConversationsSweep,
    drip_sequences: async () => {
      const { processDueSequences } = await import("@/lib/sequences")
      return processDueSequences()
    },
    overdue_alerts: runOverdueAlerts,
    daily_digest: runDailyDigest,
  }

  // Jobs that are the platform's own business, run once for everybody.
  const platform: Record<string, () => Promise<unknown>> = {
    subscriptions: sweepSubscriptions,
  }

  for (const [name, run] of Object.entries(perTenant)) {
    if (only && only !== name) continue
    try {
      const perWorkspace = await forEachTenant(async () => {
        try {
          return await run()
        } catch (error) {
          // One workspace failing must not stop the rest. A broken token in
          // one business would otherwise silently stop every other business's
          // reminders.
          console.error(`Cron job ${name} failed for a workspace:`, error)
          return { error: String(error).slice(0, 300) }
        }
      })
      results[name] = perWorkspace.length === 1 ? perWorkspace[0].result : perWorkspace
    } catch (error) {
      console.error(`Cron job ${name} failed:`, error)
      results[name] = { error: String(error).slice(0, 300) }
    }
  }

  for (const [name, run] of Object.entries(platform)) {
    if (only && only !== name) continue
    try {
      results[name] = await run()
    } catch (error) {
      console.error(`Cron job ${name} failed:`, error)
      results[name] = { error: String(error).slice(0, 300) }
    }
  }

  return NextResponse.json({ ranAt: new Date().toISOString(), results })
})

// Convenience for manual checks — reports what each job would pick up.
export const GET = withErrors(async (request: NextRequest) => {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const [abandoned, reminders, reviews, campaigns] = await Promise.all([
    db.order.count({ where: { orderStatus: "PENDING_PAYMENT", recoverySentAt: null } }),
    db.order.count({ where: { orderStatus: "CONFIRMED", reminderSentAt: null } }),
    db.order.count({ where: { orderStatus: "COMPLETED", reviewRequestSentAt: null } }),
    db.campaign.count({ where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } } }),
  ])
  return NextResponse.json({
    pending: { abandoned, reminders, reviews, campaigns },
  })
})
