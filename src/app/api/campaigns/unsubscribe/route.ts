import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"

/**
 * Unsubscribing, from the link in an email.
 *
 * One click, no sign-in, no confirmation step. A person who wants to stop
 * hearing from a business has already decided, and every hoop between them and
 * that decision is a complaint, a spam report, or a fine.
 *
 * The consent change is logged, because being able to show when and how
 * somebody opted out is the point of keeping the log at all.
 */
export const GET = withErrors(async (request: NextRequest) => {
  const recipientId = new URL(request.url).searchParams.get("r")
  const page = (message: string) =>
    new NextResponse(
      `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unsubscribed</title>
<div style="font-family:system-ui,sans-serif;max-width:32rem;margin:18vh auto;padding:0 1.5rem;text-align:center;color:#0f172a">
  <h1 style="font-size:1.35rem;margin-bottom:.5rem">${message}</h1>
  <p style="color:#64748b;font-size:.95rem">You will not receive marketing email from us again.
  Messages about a booking you have made will still reach you.</p>
</div>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } },
    )

  if (!recipientId) return page("That link is not valid")

  const recipient = await db.campaignRecipient.findUnique({
    where: { id: recipientId },
    select: { customerId: true },
  })
  if (!recipient) return page("You are unsubscribed")

  const customer = await db.customer.findFirst({ where: { id: recipient.customerId } })
  if (customer?.emailOptIn) {
    await db.customer.update({
      where: { id: customer.id },
      data: { emailOptIn: false, optOutAt: new Date(), optOutReason: "Unsubscribed from an email" },
    })
    await db.consentLog.create({
      data: {
        customerId: customer.id,
        channel: "EMAIL",
        type: "MARKETING",
        action: "OPT_OUT",
        source: "UNSUBSCRIBE_LINK",
      },
    }).catch(() => {})
  }

  return page("You are unsubscribed")
})
