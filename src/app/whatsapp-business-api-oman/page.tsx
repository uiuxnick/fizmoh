import type { Metadata } from "next"
import { absoluteUrl } from "@/lib/seo"
import { OmanMoneyLanding } from "@/components/marketing/oman-money-landing"

export const metadata: Metadata = {
  title: {
    absolute: "WhatsApp Business API Oman — Official Meta Cloud API Provider | Fizmoh",
  },
  description:
    "Connect your Oman business to official WhatsApp Business API. Verified Meta Green Tick, AmwalPay payments in OMR, multi-agent shared inbox, and 0% markup.",
  keywords: [
    "WhatsApp Business API Oman",
    "WhatsApp API Oman",
    "WhatsApp Cloud API Oman",
    "WhatsApp Business Platform Oman",
    "WhatsApp API provider Oman",
    "WhatsApp BSP Oman",
    "WhatsApp solution provider Oman",
    "WhatsApp Green Tick Oman",
    "how to get WhatsApp Business API in Oman",
    "WhatsApp API pricing Oman",
  ],
  alternates: {
    canonical: absoluteUrl("/whatsapp-business-api-oman"),
    languages: {
      en: absoluteUrl("/whatsapp-business-api-oman"),
      ar: `${absoluteUrl("/whatsapp-business-api-oman")}?lang=ar`,
      "x-default": absoluteUrl("/whatsapp-business-api-oman"),
    },
  },
  openGraph: {
    title: "WhatsApp Business API Oman — Official Meta Cloud API Provider | Fizmoh",
    description: "Official WhatsApp Cloud API platform in Oman with AmwalPay and multi-agent CRM.",
    url: absoluteUrl("/whatsapp-business-api-oman"),
    images: [{ url: absoluteUrl("/marketing/products/team-inbox.jpg"), width: 1200, height: 630 }],
  },
}

const DATA = {
  slug: "whatsapp-business-api-oman",
  badge: "Official WhatsApp Business Platform Provider — Oman",
  h1: "WhatsApp Business API in Oman: Official Cloud Platform",
  subheadline:
    "Upgrade from the standard phone app to official Meta Cloud API. Unlimited agents on one +968 number, AmwalPay in-chat payments, and guaranteed delivery.",
  introHeading: "The Enterprise Messaging Foundation for Omani Businesses",
  introText:
    "With over 94% smartphone penetration in the Sultanate of Oman, your customers expect instant, professional communication on WhatsApp. Fizmoh provides direct, official Meta Cloud API connectivity that scales seamlessly with your business without phone disconnections or device limits.",
  keyFeatures: [
    {
      title: "One +968 Number, Unlimited Agents",
      description: "Allow your entire sales and support team in Muscat to collaborate from a single verified WhatsApp business profile.",
    },
    {
      title: "Direct AmwalPay (OMR) Checkout",
      description: "Generate and send secure local payment links in chat. Receive instant confirmations directly in Omani Rials.",
    },
    {
      title: "Verified Meta Green Tick Assistance",
      description: "We guide your Commercial Registration (CR) verification with Meta to secure the official green badge beside your business name.",
    },
    {
      title: "Zero Markup on Meta Messages",
      description: "Enjoy completely transparent billing with 100% pass-through Meta conversation rates and no per-message surcharges.",
    },
    {
      title: "Arabic Dialect AI Assistant",
      description: "Our conversational engine understands Omani Arabic and regional colloquialisms, answering FAQs instantly 24/7.",
    },
    {
      title: "Enterprise CRM & Webhook Sync",
      description: "Seamlessly connect with WooCommerce, Shopify, CRMs, and internal billing systems via robust REST APIs.",
    },
  ],
  benefits: [
    {
      stat: "98%",
      label: "Average Open Rate",
      description: "Beat traditional email and SMS with messages opened within 15 minutes of delivery.",
    },
    {
      stat: "< 3s",
      label: "First Response Time",
      description: "Automated AI bots greet and qualify customer inquiries around the clock.",
    },
    {
      stat: "0%",
      label: "Markup on Meta Fees",
      description: "Transparent software subscription with pure pass-through conversation pricing.",
    },
  ],
  faqs: [
    {
      q: "Can I use my existing Omani phone number for WhatsApp Business API?",
      a: "Yes. Any mobile or landline number in Oman (+968) can be connected to the WhatsApp Cloud API, provided it is removed from the standard consumer WhatsApp app.",
    },
    {
      q: "How does billing work for WhatsApp API in Oman?",
      a: "Meta charges per 24-hour conversation window by category (Marketing, Utility, Authentication, Service). Fizmoh charges a flat platform subscription in OMR with zero markup on Meta fees.",
    },
    {
      q: "What documents are required for WhatsApp verification in Oman?",
      a: "A valid Commercial Registration (CR) from MOCIIP, Chamber of Commerce certificate, and an official telecom phone bill in your business name.",
    },
  ],
}

export default function WhatsAppBusinessApiOmanPage() {
  return <OmanMoneyLanding data={DATA} />
}
