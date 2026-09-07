import type { Metadata } from "next"
import { absoluteUrl } from "@/lib/seo"
import { OmanMoneyLanding } from "@/components/marketing/oman-money-landing"

export const metadata: Metadata = {
  title: "WhatsApp CRM Software Oman — Multi-Agent Shared Team Inbox | Fizmoh",
  description:
    "The complete WhatsApp CRM for businesses in Oman. Manage customer conversations, assign leads, track response times, and protect client data with one unified +968 number.",
  keywords: [
    "WhatsApp CRM Oman",
    "WhatsApp CRM software",
    "WhatsApp shared inbox Oman",
    "WhatsApp multi-agent chat Oman",
    "WhatsApp team inbox",
    "WhatsApp customer service software Oman",
    "WhatsApp customer engagement platform",
  ],
  alternates: {
    canonical: absoluteUrl("/whatsapp-crm-oman"),
  },
  openGraph: {
    title: "WhatsApp CRM Software Oman — Multi-Agent Shared Team Inbox | Fizmoh",
    description: "Enterprise WhatsApp CRM and multi-agent shared inbox for companies in Oman.",
    url: absoluteUrl("/whatsapp-crm-oman"),
    images: [{ url: absoluteUrl("/marketing/products/team-inbox.jpg"), width: 1200, height: 630 }],
  },
}

const DATA = {
  slug: "whatsapp-crm-oman",
  badge: "WhatsApp CRM & Shared Inbox — Oman & GCC",
  h1: "WhatsApp CRM & Shared Team Inbox in Oman",
  subheadline:
    "Transform WhatsApp into your company's sales and support CRM. Route incoming leads, assign conversations, and collaborate with internal notes.",
  introHeading: "One Number for Your Entire Organization",
  introText:
    "Stop letting customer chats get trapped on individual sales reps' personal smartphones. Fizmoh unifies your customer relationships in a secure, audited team workspace that keeps your client data safe and your team aligned.",
  keyFeatures: [
    {
      title: "Multi-Agent Conversation Assignment",
      description: "Assign chats manually or automatically based on agent availability, skillset, or department.",
    },
    {
      title: "Private Internal Notes & Mentions",
      description: "Collaborate with colleagues behind the scenes without the customer seeing your internal discussions.",
    },
    {
      title: "Contact Profiles & Custom Tags",
      description: "Tag leads by VIP status, lead stage, or purchased product. View full conversation histories in one click.",
    },
    {
      title: "Response Time & SLA Analytics",
      description: "Track average first-reply times, resolution rates, and agent productivity across your support organization.",
    },
    {
      title: "Customer List Protection",
      description: "Client contact numbers and chat records belong to your business—preventing data loss when staff depart.",
    },
    {
      title: "Canned Quick Replies",
      description: "Arm your team with pre-written, approved answers to common questions for consistent service quality.",
    },
  ],
  benefits: [
    {
      stat: "3x",
      label: "Faster Resolution Time",
      description: "Streamlined queues and pre-saved answers resolve customer inquiries in record time.",
    },
    {
      stat: "100%",
      label: "Visibility on Pipeline",
      description: "Managers can audit every customer touchpoint and conversation status from one dashboard.",
    },
    {
      stat: "0",
      label: "Leads Lost on Staff Phones",
      description: "Centralized workspace ensures every inquiry is accounted for and followed up.",
    },
  ],
  faqs: [
    {
      q: "Can managers monitor agent conversations in real time?",
      a: "Yes. Supervisors have full visibility into live chats, agent response times, and unresolved inquiries.",
    },
    {
      q: "Can I restrict staff from seeing other departments' chats?",
      a: "Yes. Granular role-based permissions let you restrict team members to their own assigned queue or department.",
    },
    {
      q: "Does Fizmoh export contacts and conversation logs?",
      a: "Yes. You can export customer records and conversation analytics to CSV or sync them with external CRM databases via API.",
    },
  ],
}

export default function WhatsAppCrmOmanPage() {
  return <OmanMoneyLanding data={DATA} />
}
