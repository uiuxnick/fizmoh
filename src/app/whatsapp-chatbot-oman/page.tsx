import type { Metadata } from "next"
import { absoluteUrl } from "@/lib/seo"
import { OmanMoneyLanding } from "@/components/marketing/oman-money-landing"

export const metadata: Metadata = {
  title: {
    absolute: "WhatsApp Chatbot Software Oman — AI Bot Builder & Auto Responder | Fizmoh",
  },
  description:
    "Build smart WhatsApp chatbots for your business in Oman. Understands Omani Arabic dialects, books appointments, answers FAQs, and qualifies leads 24/7.",
  keywords: [
    "WhatsApp chatbot Oman",
    "WhatsApp chatbot software Oman",
    "WhatsApp AI chatbot",
    "WhatsApp automated replies",
    "WhatsApp auto-responder Oman",
    "WhatsApp flow builder",
    "WhatsApp conversational AI",
    "WhatsApp bot builder Oman",
  ],
  alternates: {
    canonical: absoluteUrl("/whatsapp-chatbot-oman"),
    languages: {
      en: absoluteUrl("/whatsapp-chatbot-oman"),
      ar: `${absoluteUrl("/whatsapp-chatbot-oman")}?lang=ar`,
      "x-default": absoluteUrl("/whatsapp-chatbot-oman"),
    },
  },
  openGraph: {
    title: "WhatsApp Chatbot Software Oman — AI Bot Builder & Auto Responder | Fizmoh",
    description: "Build AI-powered WhatsApp chatbots with Omani Arabic dialect support and visual flow builder.",
    url: absoluteUrl("/whatsapp-chatbot-oman"),
    images: [{ url: absoluteUrl("/marketing/products/botflow-studio.jpg"), width: 1200, height: 630 }],
  },
}

const DATA = {
  slug: "whatsapp-chatbot-oman",
  badge: "AI-Powered WhatsApp Botflow Engine — Oman",
  h1: "WhatsApp Chatbot Software in Oman",
  subheadline:
    "Deploy intelligent AI bots that understand Omani Arabic and English. Handle routine inquiries, qualify leads, and take bookings around the clock.",
  introHeading: "Answer Inquiries in Seconds, Day or Night",
  introText:
    "Customer expectations in Muscat and across the GCC have shifted: if you don't answer within minutes, they move on. Fizmoh's Botflow Studio lets you design interactive chatbots with buttons, carousels, and generative AI without writing a line of code.",
  keyFeatures: [
    {
      title: "No-Code Visual Drag & Drop Builder",
      description: "Design conversational trees visually. Add menus, buttons, media files, and logic conditions in minutes.",
    },
    {
      title: "Omani & Gulf Arabic Comprehension",
      description: "Trained on regional Gulf dialects to naturally understand colloquial phrases and everyday questions.",
    },
    {
      title: "Instant Human Agent Handover",
      description: "When a customer requests human help or encounters complex issues, the bot transfers the chat with full context.",
    },
    {
      title: "AI Knowledge Base Integration",
      description: "Upload your PDFs, price sheets, and website links to train a custom GPT assistant specifically on your business.",
    },
    {
      title: "Calendar & Appointment Booking",
      description: "Let customers view available slots, pick a date, and confirm bookings directly within WhatsApp.",
    },
    {
      title: "Interactive Menu & Catalog Cards",
      description: "Showcase food items, properties, or retail products with rich images and instant checkout buttons.",
    },
  ],
  benefits: [
    {
      stat: "70%",
      label: "Support Deflection",
      description: "Resolve frequent inquiries (hours, locations, pricing) automatically without human staff.",
    },
    {
      stat: "24/7",
      label: "Always-On Availability",
      description: "Capture leads and bookings during evenings, weekends, and national holidays.",
    },
    {
      stat: "0",
      label: "Lines of Code Required",
      description: "Easily maintain and modify conversational flows in our intuitive visual canvas.",
    },
  ],
  faqs: [
    {
      q: "Can the WhatsApp chatbot answer in Arabic?",
      a: "Yes. Fizmoh natively supports Modern Standard Arabic, Omani colloquial Arabic, and English, detecting the customer's language automatically.",
    },
    {
      q: "Can I test my chatbot before going live?",
      a: "Yes! Fizmoh includes an interactive browser simulator that runs your exact bot flows in real time with zero messaging fees.",
    },
    {
      q: "What happens if the bot doesn't know the answer?",
      a: "You can configure a fallback step that either pings a live agent, asks for clarification, or creates a follow-up ticket in the team queue.",
    },
  ],
}

export default function WhatsAppChatbotOmanPage() {
  return <OmanMoneyLanding data={DATA} />
}
