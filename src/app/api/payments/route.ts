import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { notifyStaff } from "@/lib/realtime"
import { generateVoucherCode } from "@/lib/helpers"
import { confirmSlotSeats, createAuditLog } from "@/lib/slots-server"
import { analyzePaymentScreenshot } from "@/lib/ai"
import { z } from "zod"
import { checkSharedRateLimit as checkRateLimit, requestIp } from "@/lib/rate-limit"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant } from "@/lib/tenant"

const paymentSubmissionSchema = z.object({
  orderId: z.string().min(1).max(100),
  screenshotUrl: z.string().max(3_000_000).optional(),
  bankReference: z.string().trim().min(3).max(120),
  transferDate: z.string().datetime().optional(),
  bankName: z.string().trim().max(120).optional(),
})

export const GET = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  const tenant = currentTenant()
  if (session?.kind !== "staff" || !tenant?.tenantId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const method = searchParams.get("method")

  const where: any = { tenantId: tenant.tenantId }
  if (status) where.status = status
  if (method) where.method = method

  const payments = await db.payment.findMany({
    where,
    include: { order: { include: { tour: true, slot: true, customer: true } }, verifier: true },
    orderBy: { createdAt: "desc" },
  })

  // Include training registrations with manual bank transfer receipts
  let trainingPayments: any[] = []
  try {
    const { getTenantRegistrations } = await import("@/lib/training-service")
    const trainingRegs = await getTenantRegistrations(tenant.tenantId).catch(() => [])
    trainingPayments = trainingRegs
      .filter(r => {
        const hasProof = r.notes && r.notes.includes("Payment receipt proof uploaded")
        if (!hasProof && r.paymentMethod !== "BANK_TRANSFER") return false
        if (status === "SUBMITTED") return r.paymentStatus !== "PAID"
        if (status === "APPROVED") return r.paymentStatus === "PAID"
        return true
      })
      .map(r => {
        const m = (r.notes || "").match(/https?:\/\/[^\s"'<>]+|\/api\/media\/[^\s"'<>]+|whatsapp_media:\/\/[^\s"'<>]+/)
        const proofUrl = m ? m[0] : null
        return {
          id: `tr_${r.id}`,
          amount: r.totalAmount,
          method: "BANK_TRANSFER",
          status: r.paymentStatus === "PAID" ? "APPROVED" : "SUBMITTED",
          bankReference: r.registrationNumber,
          bankName: "Bank Muscat",
          transferDate: r.createdAt,
          screenshotUrl: proofUrl,
          screenshotOcr: null,
          fraudScore: 0,
          fraudFlags: null,
          verifiedAt: r.paymentStatus === "PAID" ? r.updatedAt : null,
          verifierComment: null,
          rejectionReason: null,
          order: {
            orderNumber: r.registrationNumber,
            customerName: r.customerName,
            customerPhone: r.customerPhone,
            totalAmount: r.totalAmount,
            tour: { name: r.courseName },
            slot: { date: r.createdAt, startTime: "Training Cohort" },
          },
          gatewayReference: `TRAINING-${r.registrationNumber}`,
        }
      })
  } catch (tErr) {
    console.warn("[payments] Failed to fetch training registrations for queue:", tErr)
  }

  return NextResponse.json({ payments: [...trainingPayments, ...payments] })
})

// Submit bank transfer payment with screenshot
export const POST = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  const rate = await checkRateLimit(`payments:${requestIp(request.headers)}`, 20, 60 * 60 * 1000)
  if (!rate.allowed) return NextResponse.json({ error: "Too many payment submissions" }, { status: 429 })
  const parsed = paymentSubmissionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid payment submission" }, { status: 400 })
  const { orderId, screenshotUrl, bankReference, transferDate, bankName } = parsed.data

  const order = await db.order.findFirst({
    where: { id: orderId, tenantId: tenant.tenantId },
    include: { tour: true, customer: true },
  })
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  if (order.paymentMethod !== "BANK_TRANSFER" || !["PENDING", "SUBMITTED"].includes(order.paymentStatus)) {
    return NextResponse.json({ error: "Payment cannot be submitted for this order" }, { status: 409 })
  }

  // Run VLM fraud analysis on the screenshot
  let screenshotAnalysis: Awaited<ReturnType<typeof analyzePaymentScreenshot>> | null = null
  let fraudScore = 0
  let fraudFlags: string[] = []
  if (screenshotUrl) {
    try {
      screenshotAnalysis = await analyzePaymentScreenshot(screenshotUrl, order.totalAmount, "OMR")
      fraudScore = 1 - (screenshotAnalysis.confidence || 0)
      fraudFlags = screenshotAnalysis.fraudFlags || []
      if (!screenshotAnalysis.matchesExpected) {
        fraudFlags.push("Amount mismatch detected by AI")
        fraudScore = Math.max(fraudScore, 0.6)
      }
    } catch (e) {
      console.error("VLM analysis failed:", e)
    }
  }

  const existingPayment = await db.payment.findFirst({ where: { orderId } })
  if (!existingPayment) {
    return NextResponse.json({ error: "Payment record not found for this order" }, { status: 404 })
  }

  const payment = await db.payment.update({
    where: { id: existingPayment.id },
    data: {
      status: "SUBMITTED",
      screenshotUrl,
      screenshotOcr: screenshotAnalysis as any,
      bankReference,
      bankName,
      transferDate: transferDate ? new Date(transferDate) : null,
      fraudScore,
      fraudFlags: JSON.stringify(fraudFlags),
    },
  })

  await db.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: "SUBMITTED",
      orderStatus: "PAYMENT_SUBMITTED",
    },
  })

  // Create notification for finance team
  await notifyStaff({
    type: "PAYMENT_SUBMITTED",
    title: "New payment verification needed",
    message: `${order.orderNumber} - ${order.customerName} - OMR ${order.totalAmount.toFixed(3)}${fraudScore > 0.5 ? " ⚠️ High fraud risk" : ""}`,
    data: { orderId, paymentId: payment.id, fraudScore },
    forRole: "FINANCE",
  })

  return NextResponse.json({ payment, fraudScore, fraudFlags }, { status: 201 })
})
