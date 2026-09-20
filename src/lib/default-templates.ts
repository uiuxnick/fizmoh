import { raw } from "@/lib/db"

export interface DefaultTemplateDef {
  name: string
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION"
  language: string
  channel: string
  type: string
  headerType?: string
  headerContent?: string
  bodyContent: string
  footerContent?: string
  variables: string[]
  buttons?: Array<{ type: string; text: string; url?: string }>
}

export const DEFAULT_ADMIN_ORDER_TEMPLATES: DefaultTemplateDef[] = [
  {
    name: "restaurant_order_confirmation",
    category: "UTILITY",
    language: "en_US",
    channel: "WHATSAPP",
    type: "INTERACTIVE",
    headerType: "TEXT",
    headerContent: "Order Confirmed 🍽️",
    bodyContent: `Thank you {{1}}! Your order #{{2}} ({{3}}) has been received by our kitchen.

Total: {{4}}

Tap Track Order to follow live cooking progress in real-time, or tap Call Waiter if you need assistance at your table.`,
    footerContent: "Smart Dining & Ordering",
    variables: [
      "Customer Name",
      "Order Number",
      "Table or Location",
      "Total Amount",
    ],
    buttons: [
      { type: "URL", text: "Track Order", url: "https://app.fizmoh.cloud/order/{{1}}" },
      { type: "QUICK_REPLY", text: "Call Waiter" },
    ],
  },
  {
    name: "admin_booking_notification",
    category: "UTILITY",
    language: "en_US",
    channel: "WHATSAPP",
    type: "TEXT",
    bodyContent: `🔔 *New Booking Received!*

👤 Customer: {{1}}
📞 Phone: {{2}}
🎫 Booking: {{3}}
📅 Date & Time: {{4}}
💰 Total: {{5}} OMR
🔢 Order ID: {{6}}

Log in to your admin dashboard to review and manage this booking.`,
    variables: [
      "Customer Name",
      "Customer Phone",
      "Service / Booking Type",
      "Date & Time",
      "Total Amount",
      "Order ID",
    ],
  },
  {
    name: "admin_booking_notification_ar",
    category: "UTILITY",
    language: "ar",
    channel: "WHATSAPP",
    type: "TEXT",
    bodyContent: `🔔 *إشعار حجز جديد!*

👤 العميل: {{1}}
📞 رقم الهاتف: {{2}}
🎫 الحجز: {{3}}
📅 التاريخ والوقت: {{4}}
💰 الإجمالي: {{5}} ر.ع.
🔢 رقم الطلب: {{6}}

يرجى تسجيل الدخول إلى لوحة التحكم لمراجعة تفاصيل الحجز وإدارته.`,
    variables: [
      "اسم العميل",
      "رقم الهاتف",
      "الخدمة / نوع الحجز",
      "التاريخ والوقت",
      "المبلغ الإجمالي",
      "رقم الطلب",
    ],
  },
]

/**
 * Ensures default administrative order notification templates exist for a tenant.
 * Created in DRAFT status so the tenant can inspect and submit them to Meta for approval.
 */
export async function ensureDefaultOrderTemplates(tenantId: string): Promise<void> {
  if (!tenantId) return

  for (const tpl of DEFAULT_ADMIN_ORDER_TEMPLATES) {
    // Check if template already exists for this tenant by name
    const existing = await raw.template.findFirst({
      where: {
        tenantId,
        channel: tpl.channel,
        name: tpl.name,
      },
    })

    if (!existing) {
      await raw.template.create({
        data: {
          tenantId,
          channel: tpl.channel,
          name: tpl.name,
          category: tpl.category,
          language: tpl.language,
          type: tpl.type,
          headerType: tpl.headerType || null,
          headerContent: tpl.headerContent || null,
          bodyContent: tpl.bodyContent,
          footerContent: tpl.footerContent || null,
          variables: JSON.stringify(tpl.variables),
          buttons: tpl.buttons ? JSON.stringify(tpl.buttons) : undefined,
          status: "DRAFT",
        },
      }).catch((err) => {
        console.error(`Failed to auto-seed template ${tpl.name} for tenant ${tenantId}:`, err)
      })
    }
  }
}
