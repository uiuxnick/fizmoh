import { NextRequest, NextResponse } from "next/server"
import { sendOrderConfirmation } from "@/lib/notifications"
import { withErrors } from "@/lib/api-handler"

/**
 * Send order confirmation (Email + WhatsApp + staff notification)
 * Per BRD §6.7: "Unified Order Confirmation Flow"
 * Can be triggered manually by admin or automatically after payment approval
 */
export const POST = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const result = await sendOrderConfirmation(id)
  return NextResponse.json(result)
})
