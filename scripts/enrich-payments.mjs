// One-off enrichment script: ensures there are several SUBMITTED bank-transfer
// payments with varied AI fraud-analysis outcomes so the queue is immediately demoable.
import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
  // ---- Step 1: Convert up to 2 PENDING_BANK_TRANSFER payments to SUBMITTED
  //              with a screenshot, so the queue has more than 1 item.
  const pending = await db.payment.findMany({
    where: { status: "PENDING", method: "BANK_TRANSFER" },
    include: { order: { include: { customer: true } } },
    take: 2,
  })
  console.log(`Found ${pending.length} PENDING bank-transfer payments to convert`)

  const variants = [
    {
      detectedAmount: null,
      matchesExpected: true,
      bankName: "Bank Muscat",
      referenceNumber: "TRX441209",
      transferDate: "2025-01-12",
      fraudFlags: [],
      confidence: 0.95,
      summary: "Bank Muscat mobile transfer. Amount matches expected. Clean screenshot.",
    },
    {
      detectedAmount: 12.0,
      matchesExpected: false,
      bankName: "Bank Muscat",
      referenceNumber: "TRX000XXX",
      transferDate: "2025-01-10",
      fraudFlags: [
        "Amount mismatch: detected 12.000 OMR vs expected",
        "Reference number contains non-standard characters",
        "Metadata suggests image was re-saved multiple times",
      ],
      confidence: 0.31,
      summary: "Detected amount significantly lower than expected. Multiple fraud indicators.",
    },
  ]

  let vi = 0
  for (const p of pending) {
    const variant = { ...variants[vi % variants.length] }
    if (variant.detectedAmount === null && variant.matchesExpected) {
      variant.detectedAmount = p.amount
    }
    const fraudScore = Math.max(0, Math.min(1, 1 - variant.confidence))
    await db.payment.update({
      where: { id: p.id },
      data: {
        status: "SUBMITTED",
        screenshotUrl: "/payments/proof-sample.jpg",
        screenshotOcr: variant,
        fraudScore,
        fraudFlags: JSON.stringify(variant.fraudFlags),
        bankReference: variant.referenceNumber,
        bankName: variant.bankName,
        transferDate: new Date(variant.transferDate),
      },
    })
    await db.order.update({
      where: { id: p.orderId },
      data: { paymentStatus: "SUBMITTED", orderStatus: "PAYMENT_SUBMITTED" },
    })
    console.log(`  Converted ${p.id} (ord ${p.order.orderNumber}) — fraudScore=${fraudScore.toFixed(2)}`)
    vi++
  }

  // ---- Step 2: For existing SUBMITTED bank-transfer payments, ensure they have OCR data
  const submitted = await db.payment.findMany({
    where: { status: "SUBMITTED", method: "BANK_TRANSFER" },
    include: { order: true },
  })
  console.log(`\nFound ${submitted.length} existing SUBMITTED bank-transfer payments`)

  let si = 0
  for (const p of submitted) {
    if (p.screenshotOcr && (p.fraudScore ?? 0) > 0) {
      console.log(`  ${p.id} (ord ${p.order.orderNumber}) already enriched — skipping`)
      si++
      continue
    }
    const variant = { ...variants[si % variants.length] }
    if (variant.detectedAmount === null && variant.matchesExpected) {
      variant.detectedAmount = p.amount
    }
    const fraudScore = Math.max(0, Math.min(1, 1 - variant.confidence))
    await db.payment.update({
      where: { id: p.id },
      data: {
        screenshotUrl: p.screenshotUrl || "/payments/proof-sample.jpg",
        screenshotOcr: variant,
        fraudScore,
        fraudFlags: JSON.stringify(variant.fraudFlags),
        bankReference: p.bankReference || variant.referenceNumber,
        bankName: p.bankName || variant.bankName,
        transferDate: p.transferDate || new Date(variant.transferDate),
      },
    })
    console.log(`  Enriched ${p.id} (ord ${p.order.orderNumber}) — fraudScore=${fraudScore.toFixed(2)}`)
    si++
  }

  console.log("\nDone.")
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
