import type { Metadata } from "next"
import { absoluteUrl } from "@/lib/seo"
import { OmanMoneyLanding } from "@/components/marketing/oman-money-landing"

export const metadata: Metadata = {
  title: "WhatsApp Automation Software Oman — Automate Broadcasts & Workflows | Fizmoh",
  description:
    "Automate your business on WhatsApp in Oman. Scheduled broadcast campaigns, abandoned cart recovery, appointment reminders, and automated customer journeys.",
  keywords: [
    "WhatsApp automation Oman",
    "WhatsApp automation software Oman",
    "WhatsApp business software Oman",
    "WhatsApp business automation software",
    "WhatsApp sales automation Oman",
    "WhatsApp broadcast Oman",
    "WhatsApp bulk messaging Oman",
    "WhatsApp marketing automation",
  ],
  alternates: {
    canonical: absoluteUrl("/whatsapp-automation-oman"),
  },
  openGraph: {
    title: "WhatsApp Automation Software Oman — Automate Broadcasts & Workflows | Fizmoh",
    description: "Automate your business on WhatsApp in Oman with Fizmoh's enterprise Cloud platform.",
    url: absoluteUrl("/whatsapp-automation-oman"),
    images: [{ url: absoluteUrl("/marketing/products/broadcast-campaigns.jpg"), width: 1200, height: 630 }],
  },
}

const DATA = {
  slug: "whatsapp-automation-oman",
  badge: "Enterprise WhatsApp Automation — Oman & GCC",
  h1: "WhatsApp Automation Software in Oman",
  subheadline:
    "Put your sales, marketing, and customer service on autopilot. Send personalized broadcast campaigns, automated reminders, and recover lost revenue 24/7.",
  introHeading: "Stop Answering Repetitive Questions and Chasing Manual Follow-Ups",
  introText:
    "Manual messaging drains hours of your team's day. Fizmoh's automation engine triggers personalized messages at the exact right moment—whether confirming an appointment in Muscat, alerting a shopper of a restocked product, or recovering an abandoned cart.",
  keyFeatures: [
    {
      title: "Scheduled Broadcast Campaigns",
      description: "Send pre-approved promotional messages to thousands of opted-in customers with verified delivery reports.",
    },
    {
      title: "E-Commerce Cart Recovery Sequences",
      description: "Automatically message shoppers who leave checkout, recovering up to 45% of lost online sales in Oman.",
    },
    {
      title: "Appointment & Service Reminders",
      description: "Reduce clinic and salon no-shows by 80% with automated reminder messages sent 24 hours and 2 hours prior.",
    },
    {
      title: "Automated Lead Qualification",
      description: "Ask prospective buyers for their budget, timeline, and requirements before assigning to a senior sales executive.",
    },
    {
      title: "Two-Way Trigger Webhooks",
      description: "Trigger WhatsApp messages automatically from your existing CRM, ERP, or point-of-sale systems.",
    },
    {
      title: "Smart Working Hours Auto-Replies",
      description: "Set expectations when your office is closed while queuing urgent customer inquiries for the morning shift.",
    },
  ],
  benefits: [
    {
      stat: "80%",
      label: "Reduction in No-Shows",
      description: "Automated booking confirmations and timely reminders ensure customers show up.",
    },
    {
      stat: "45%",
      label: "Cart Recovery Rate",
      description: "Timely WhatsApp nudges convert abandoned carts significantly better than email.",
    },
    {
      stat: "10x",
      label: "Faster Campaign Launch",
      description: "Launch pre-approved broadcast campaigns in minutes with CSV audience uploads.",
    },
  ],
  faqs: [
    {
      q: "Does WhatsApp allow bulk promotional messaging in Oman?",
      a: "Yes, when using official WhatsApp Business Platform pre-approved Marketing templates sent to opted-in contacts, adhering to Meta's quality guidelines.",
    },
    {
      q: "Can I automate messages from my WooCommerce or Shopify store?",
      a: "Yes. Fizmoh offers dedicated webhooks to trigger order confirmations, shipment tracking numbers, and cart recovery alerts automatically.",
    },
    {
      q: "What happens if a customer replies to an automated broadcast?",
      a: "Replies land directly in your Fizmoh shared team inbox where AI or human agents can continue the conversation seamlessly.",
    },
  ],
}

export default function WhatsAppAutomationOmanPage() {
  return <OmanMoneyLanding data={DATA} />
}
