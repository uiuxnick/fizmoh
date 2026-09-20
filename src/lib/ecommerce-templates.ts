import { db } from "@/lib/db"
import { sendCtaUrlMessage, sendInteractiveMessage, sendTemplateMessage, sendTextMessage } from "@/lib/whatsapp"

export type EcommerceEventType =
  | "ORDER_CREATED"
  | "ORDER_PROCESSING"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "ORDER_CANCELLED"
  | "CART_ABANDONED_STEP1"
  | "CART_ABANDONED_STEP2"
  | "CART_ABANDONED_STEP3"
  | "NEWSLETTER_WELCOME"

export interface DefaultEcommerceTemplate {
  key: EcommerceEventType
  title: string
  description: string
  defaultHeader: string
  defaultBody: string
  buttonType: "CTA_URL" | "QUICK_REPLY" | "NONE"
  defaultButtonText: string
  defaultButtonUrlParam?: string
  defaultReplyId?: string
  allowedVariables: string[]
}

export const DEFAULT_ECOMMERCE_TEMPLATES: Record<EcommerceEventType, DefaultEcommerceTemplate> = {
  ORDER_CREATED: {
    key: "ORDER_CREATED",
    title: "Order Confirmation",
    description: "Sent instantly when a customer completes a checkout or places a new order.",
    defaultHeader: "🛍️ Order Confirmed",
    defaultBody: "Hi {{name}}, thank you for your order #{{order_number}} from {{store_name}}!\n\n💰 Total: {{total}} {{currency}}\n📦 Items: {{item_count}} item(s)\n\nWe have received your order and are packing your items. You can check the live order progress below:",
    buttonType: "CTA_URL",
    defaultButtonText: "Track My Order",
    defaultButtonUrlParam: "tracking_url",
    allowedVariables: ["name", "order_number", "store_name", "total", "currency", "item_count", "tracking_url", "order_url"],
  },
  ORDER_PROCESSING: {
    key: "ORDER_PROCESSING",
    title: "Order Processing",
    description: "Sent when order is marked processing or payment is confirmed.",
    defaultHeader: "⏳ Packing Your Order",
    defaultBody: "Hi {{name}}, your order #{{order_number}} at {{store_name}} is now being prepared for shipping by our warehouse team!",
    buttonType: "CTA_URL",
    defaultButtonText: "View Order",
    defaultButtonUrlParam: "order_url",
    allowedVariables: ["name", "order_number", "store_name", "order_url"],
  },
  ORDER_SHIPPED: {
    key: "ORDER_SHIPPED",
    title: "Order Shipped / Dispatched",
    description: "Sent when tracking number is generated and carrier has picked up the package.",
    defaultHeader: "🚚 Package on the Way!",
    defaultBody: "Great news {{name}}! Your order #{{order_number}} has been dispatched via {{carrier}}.\n\n📍 Tracking #: {{tracking_number}}\n\nTap below for live courier delivery tracking:",
    buttonType: "CTA_URL",
    defaultButtonText: "Track Shipment",
    defaultButtonUrlParam: "tracking_url",
    allowedVariables: ["name", "order_number", "store_name", "carrier", "tracking_number", "tracking_url"],
  },
  ORDER_DELIVERED: {
    key: "ORDER_DELIVERED",
    title: "Order Delivered",
    description: "Sent when the order is marked delivered or completed.",
    defaultHeader: "✅ Order Delivered",
    defaultBody: "Hi {{name}}, your package for order #{{order_number}} from {{store_name}} has been delivered. We hope you love your purchase!\n\nIf you have any questions or feedback, let us know here.",
    buttonType: "QUICK_REPLY",
    defaultButtonText: "Chat With Support",
    defaultReplyId: "ecom_support",
    allowedVariables: ["name", "order_number", "store_name"],
  },
  ORDER_CANCELLED: {
    key: "ORDER_CANCELLED",
    title: "Order Cancelled",
    description: "Sent when an order is cancelled or refunded.",
    defaultHeader: "❌ Order Cancelled",
    defaultBody: "Hi {{name}}, order #{{order_number}} from {{store_name}} has been cancelled. Any payments made are being refunded according to our return policy.",
    buttonType: "QUICK_REPLY",
    defaultButtonText: "Speak with Team",
    defaultReplyId: "ecom_support",
    allowedVariables: ["name", "order_number", "store_name"],
  },
  CART_ABANDONED_STEP1: {
    key: "CART_ABANDONED_STEP1",
    title: "Abandoned Cart - Stage 1 (15–30 Mins)",
    description: "Gentle reminder nudge sent 15 to 30 minutes after cart abandonment.",
    defaultHeader: "🛒 Did you forget something?",
    defaultBody: "Hi {{name}}, we noticed you left items in your shopping bag at {{store_name}} ({{item_count}} item(s) • {{total}} {{currency}}).\n\nWe have saved your basket so you don't lose your selections. Tap below to complete your checkout in 1-click:",
    buttonType: "CTA_URL",
    defaultButtonText: "Complete My Order",
    defaultButtonUrlParam: "checkout_url",
    allowedVariables: ["name", "store_name", "item_count", "total", "currency", "checkout_url"],
  },
  CART_ABANDONED_STEP2: {
    key: "CART_ABANDONED_STEP2",
    title: "Abandoned Cart - Stage 2 (4–6 Hours)",
    description: "Incentive offer with discount code sent 4 to 6 hours later.",
    defaultHeader: "🎁 Special Discount for You",
    defaultBody: "Hi {{name}}, your favorite items at {{store_name}} are still waiting!\n\nTo make it even sweeter, here is an exclusive 10% discount code: {{coupon_code}}\n\nTap below to automatically apply your coupon and checkout:",
    buttonType: "CTA_URL",
    defaultButtonText: "Claim 10% & Checkout",
    defaultButtonUrlParam: "checkout_url_with_coupon",
    allowedVariables: ["name", "store_name", "coupon_code", "checkout_url", "checkout_url_with_coupon"],
  },
  CART_ABANDONED_STEP3: {
    key: "CART_ABANDONED_STEP3",
    title: "Abandoned Cart - Stage 3 (24 Hours)",
    description: "Final urgency alert sent 24 hours after abandonment.",
    defaultHeader: "⏰ Your Cart is Expiring Soon",
    defaultBody: "Hi {{name}}, the reserved items in your cart at {{store_name}} will be released back to stock soon.\n\nDon't miss out! Tap below to secure your items before they sell out:",
    buttonType: "CTA_URL",
    defaultButtonText: "Secure My Items",
    defaultButtonUrlParam: "checkout_url",
    allowedVariables: ["name", "store_name", "checkout_url"],
  },
  NEWSLETTER_WELCOME: {
    key: "NEWSLETTER_WELCOME",
    title: "Newsletter Welcome",
    description: "Sent when customer opts in to updates at checkout or via newsletter widget.",
    defaultHeader: "🎉 Welcome to the Club!",
    defaultBody: "Hi {{name}}, welcome to {{store_name}} on WhatsApp!\n\nThank you for subscribing. You'll be the first to hear about special promotions, VIP releases, and private discounts.\n\nHere is your welcome gift: use code {{welcome_coupon}} on your next order!",
    buttonType: "CTA_URL",
    defaultButtonText: "Shop New Arrivals",
    defaultButtonUrlParam: "store_url",
    allowedVariables: ["name", "store_name", "welcome_coupon", "store_url"],
  },
}

/**
 * Replaces {{key}} variables in text template
 */
export function interpolateVariables(template: string, vars: Record<string, any>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const val = vars[key]
    return val !== undefined && val !== null ? String(val) : ""
  })
}

/**
 * Unified sender for e-commerce notifications.
 * Inspects template mapping for tenant/store:
 * - If merchant mapped an approved Meta template, dispatches official Meta template message.
 * - Otherwise, dispatches the rich default interactive template with CTA URL / Quick Reply buttons.
 */
export async function sendEcommerceNotification(params: {
  tenantId: string
  storeId?: string | null
  eventType: EcommerceEventType
  to: string
  data: Record<string, any>
}): Promise<{ success: boolean; messageId?: string; error?: string; usedCustomTemplate?: boolean }> {
  const { tenantId, storeId, eventType, to, data } = params
  const defaultDef = DEFAULT_ECOMMERCE_TEMPLATES[eventType]
  if (!defaultDef) {
    return { success: false, error: `Unknown e-commerce event type: ${eventType}` }
  }

  // Check if tenant has a custom template mapping
  const mapping = await db.ecommerceTemplateMapping.findFirst({
    where: {
      tenantId,
      eventType,
      isEnabled: true,
      ...(storeId ? { OR: [{ storeId }, { storeId: null }] } : {}),
    },
    orderBy: { storeId: "desc" }, // store-specific wins over global
  }).catch(() => null)

  // 1. Merchant configured a custom Meta WhatsApp Approved Template
  if (mapping && !mapping.useDefaultTemplate && mapping.customTemplateName) {
    const varMap = (mapping.variableMapping as Record<string, string>) || {}
    const components: any[] = []

    // Build body variables array based on mapping (e.g. "1" -> "name", "2" -> "order_number")
    const bodyVars: string[] = []
    const sortedKeys = Object.keys(varMap).sort((a, b) => Number(a) - Number(b))
    for (const k of sortedKeys) {
      const fieldName = varMap[k]
      const val = data[fieldName] ?? ""
      bodyVars.push(String(val))
    }

    const buttonUrl = data.tracking_url || data.checkout_url || data.store_url || undefined

    const res = await sendTemplateMessage({
      to,
      templateName: mapping.customTemplateName,
      language: mapping.customTemplateLang || "en",
      variables: bodyVars.length > 0 ? bodyVars : undefined,
      buttonUrl,
    })

    return { ...res, usedCustomTemplate: true }
  }

  // 2. Default rich interactive template with action buttons
  const bodyText = interpolateVariables(defaultDef.defaultBody, data)
  const headerText = defaultDef.defaultHeader ? interpolateVariables(defaultDef.defaultHeader, data) : undefined

  // URL Button
  if (defaultDef.buttonType === "CTA_URL") {
    const urlKey = defaultDef.defaultButtonUrlParam || "tracking_url"
    let targetUrl = data[urlKey] || data.url || data.checkout_url || data.store_url || ""

    // Validate HTTPS requirement for WhatsApp CTA buttons
    if (targetUrl && /^https:\/\//i.test(targetUrl)) {
      const buttonLabel = (defaultDef.defaultButtonText || "View Details").slice(0, 20)
      const res = await sendCtaUrlMessage({
        to,
        body: bodyText,
        headerText,
        buttonText: buttonLabel,
        url: targetUrl,
      })
      if (res.success) return { ...res, usedCustomTemplate: false }
    }

    // If URL is invalid or missing, fallback to interactive message or text
    const textRes = await sendTextMessage(to, `${headerText ? `*${headerText}*\n\n` : ""}${bodyText}`)
    return { ...textRes, usedCustomTemplate: false }
  }

  // Quick Reply Button
  if (defaultDef.buttonType === "QUICK_REPLY") {
    const res = await sendInteractiveMessage({
      to,
      body: bodyText,
      headerText,
      buttons: [
        {
          id: defaultDef.defaultReplyId || "ecom_action",
          title: (defaultDef.defaultButtonText || "Support").slice(0, 20),
        },
      ],
    })
    if (res.success) return { ...res, usedCustomTemplate: false }

    // Fallback to text
    const textRes = await sendTextMessage(to, `${headerText ? `*${headerText}*\n\n` : ""}${bodyText}`)
    return { ...textRes, usedCustomTemplate: false }
  }

  // Plain text fallback
  const textRes = await sendTextMessage(to, `${headerText ? `*${headerText}*\n\n` : ""}${bodyText}`)
  return { ...textRes, usedCustomTemplate: false }
}
