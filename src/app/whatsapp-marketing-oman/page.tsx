import type { Metadata } from "next"
import { absoluteUrl } from "@/lib/seo"
import { OmanMoneyLanding } from "@/components/marketing/oman-money-landing"

export const metadata: Metadata = {
  title: "WhatsApp Marketing Software Oman — Promotional Broadcasts & Ads | Fizmoh",
  description:
    "Grow your revenue in Oman with high-converting WhatsApp marketing campaigns. 98% open rates, Click-to-WhatsApp ad tracking, audience segmentation, and rich media carousels.",
  keywords: [
    "WhatsApp marketing Oman",
    "WhatsApp marketing software Oman",
    "WhatsApp marketing platform",
    "WhatsApp promotional messages",
    "WhatsApp mass messaging Oman",
    "WhatsApp marketing agency Oman",
    "Click to WhatsApp Ads Oman",
  ],
  alternates: {
    canonical: absoluteUrl("/whatsapp-marketing-oman"),
  },
  openGraph: {
    title: "WhatsApp Marketing Software Oman — Promotional Broadcasts & Ads | Fizmoh",
    description: "Launch high-converting WhatsApp marketing campaigns in Oman with 98% open rates.",
    url: absoluteUrl("/whatsapp-marketing-oman"),
    images: [{ url: absoluteUrl("/marketing/products/broadcast-campaigns.jpg"), width: 1200, height: 630 }],
  },
}

const DATA = {
  slug: "whatsapp-marketing-oman",
  badge: "WhatsApp Marketing & Campaign Engine — Oman",
  h1: "WhatsApp Marketing Software in Oman",
  subheadline:
    "Reach your customers on the app they open 30+ times a day. Launch broadcast campaigns with 98% open rates, interactive CTA buttons, and direct in-chat purchasing.",
  introHeading: "The Highest-ROI Marketing Channel in the Sultanate",
  introText:
    "Traditional digital advertising costs in Oman continue to rise, while email and SMS open rates continue to decline. WhatsApp marketing provides direct, conversational access to your verified customer base with unmatched engagement and conversion rates.",
  keyFeatures: [
    {
      title: "Interactive CTA & Quick Reply Buttons",
      description: "Drive immediate actions with tappable buttons like 'Order Now', 'View Catalog', or 'Book Consultation'.",
    },
    {
      title: "Audience Segmentation & Tags",
      description: "Segment customers by purchase history, location, or interest to send highly targeted, relevant offers.",
    },
    {
      title: "Click-to-WhatsApp Ad Integration",
      description: "Direct Instagram and Facebook ad traffic straight into WhatsApp with pre-filled greeting messages and automated tracking.",
    },
    {
      title: "Rich Media & Product Carousels",
      description: "Showcase new collections, seasonal discounts, and special menus with high-resolution images, videos, and PDFs.",
    },
    {
      title: "Opt-In & Quality Rating Protection",
      description: "Built-in opt-out management ensures your phone number maintains an elite green quality rating with Meta.",
    },
    {
      title: "Detailed Campaign Analytics",
      description: "Track exact metrics: messages sent, delivered, read, button clicks, and resulting revenue in OMR.",
    },
  ],
  benefits: [
    {
      stat: "45%",
      label: "Click-Through Rate (CTR)",
      description: "Interactive WhatsApp buttons dramatically outperform standard SMS text links.",
    },
    {
      stat: "60%",
      label: "Lower Cost Per Lead",
      description: "Click-to-WhatsApp ads convert colder traffic into active, qualified conversations.",
    },
    {
      stat: "99%",
      label: "Delivery Rate",
      description: "Direct official Meta Cloud API pipe guarantees fast delivery across all Omani telcos.",
    },
  ],
  faqs: [
    {
      q: "Can I send marketing broadcasts to customers who haven't saved my number?",
      a: "Yes! With the official WhatsApp Business Cloud API, messages are delivered directly to the customer's chat list regardless of whether they have your number saved in their contacts.",
    },
    {
      q: "How does Meta approve promotional message templates?",
      a: "You submit your marketing template through Fizmoh's dashboard. Meta's automated review typically approves templates within 2 to 10 minutes.",
    },
    {
      q: "How do I prevent my number from being banned?",
      a: "By using official Meta Cloud API through Fizmoh and sending only to opted-in customers with clear opt-out buttons. Unofficial bulk spam software gets banned; official API does not.",
    },
  ],
}

export default function WhatsAppMarketingOmanPage() {
  return <OmanMoneyLanding data={DATA} />
}
