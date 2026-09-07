import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { sendTextMessage, sendInteractiveMessage, sendCtaUrlMessage } from "@/lib/whatsapp"
import { notifyStaff } from "@/lib/realtime"
import { APP_TIMEZONE } from "@/lib/timezone"

export type MarketingStep =
  | "IDLE"
  | "MAIN_MENU"
  | "OPT1_SERVICE_SELECT"
  | "OPT1_DETAILS"
  | "OPT1_GOALS"
  | "OPT1_STRATEGY"
  | "OPT1_NEXT_STEPS"
  | "OPT1_CONTACT_NAME"
  | "OPT1_CONTACT_EMAIL"
  | "OPT1_CONTACT_COMPANY"
  | "OPT1_CONTACT_BUDGET"
  | "OPT2_INDUSTRY_SELECT"
  | "OPT2_DETAILS"
  | "OPT3_CASE_SELECT"
  | "OPT3_DETAILS"
  | "OPT4_PACKAGE_SELECT"
  | "OPT4_DETAILS"
  | "OPT4_CUSTOM_INPUT"
  | "OPT5_NAME"
  | "OPT5_COMPANY"
  | "OPT5_EMAIL"
  | "OPT5_WEBSITE"
  | "OPT5_INDUSTRY"
  | "OPT5_SERVICES"
  | "OPT5_GOALS"
  | "OPT5_BUDGET"
  | "OPT6_ABOUT"
  | "OPT7_EXPERT_NAME"
  | "OPT7_EXPERT_TOPIC"
  | "OPT7_HANDOFF"

export interface MarketingState {
  step: MarketingStep
  name?: string
  companyName?: string
  email?: string
  website?: string
  service?: string
  industry?: string
  goal?: string
  package?: string
  budget?: string
  topic?: string
  updatedAt: string
}

export interface FlowContext {
  conversationId: string
  customerId: string
  phone: string
  tenantId?: string
}

const PREFIX = "fiz_"

export function isMarketingTrigger(text: string): boolean {
  const t = text.trim().toLowerCase()
  return /^(marketing|fizmoh|agency|seo|ads|ppc|grow|growth|proposal|pricing|packages|expert|تسويق|فزموه|إعلانات|خطة|استشارة)$/i.test(t) ||
    /(\bfizmoh\b|\bdigital marketing\b|\bseo audit\b|\bgoogle ads\b|\bmeta ads\b|\bmarketing proposal\b)/i.test(t)
}

export function isMarketingReply(id?: string | null): boolean {
  return !!id && id.startsWith(PREFIX)
}

async function getState(conversationId: string): Promise<MarketingState | null> {
  const conv = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { appointmentState: true },
  })
  if (!conv?.appointmentState) return null
  try {
    const parsed = typeof conv.appointmentState === "string" ? JSON.parse(conv.appointmentState) : conv.appointmentState
    if (parsed && (parsed as any)._isFizMoh) return parsed as MarketingState
  } catch {
    return null
  }
  return null
}

async function setState(conversationId: string, state: MarketingState | null) {
  await db.conversation.update({
    where: { id: conversationId },
    data: {
      appointmentState: state ? JSON.stringify({ ...state, _isFizMoh: true, updatedAt: new Date().toISOString() }) : Prisma.DbNull,
    },
  })
}

// ── Save to CRM & Appointments Engine ────────────────────────────────────────

async function saveLeadToCRM(ctx: FlowContext, state: MarketingState) {
  const tenantId = ctx.tenantId || "cmsqevt2a0000i3g24a2qc10w"
  const tags = ["Digital Marketing", "FizMoh Lead"]
  if (state.service) tags.push(state.service)
  if (state.industry) tags.push(state.industry)
  if (state.package) tags.push(state.package)
  if (state.budget) tags.push("Budget: " + state.budget)

  const notesLines = [
    "🚀 FIZMOH DIGITAL MARKETING LEAD",
    "--------------------------------",
    "👤 Contact Name: " + (state.name || "N/A"),
    "🏢 Company: " + (state.companyName || "N/A"),
    "🌐 Website: " + (state.website || "N/A"),
    "📱 Phone/WhatsApp: " + ctx.phone,
    "📧 Email: " + (state.email || "N/A"),
    "🎯 Required Service: " + (state.service || "General Digital Marketing"),
    "🏭 Industry: " + (state.industry || "General"),
    "🎯 Main Goal: " + (state.goal || "Business Growth"),
    "💰 Monthly Budget: " + (state.budget || "N/A"),
    "📦 Package Selected: " + (state.package || "Custom"),
    "📅 Submitted At: " + new Date().toLocaleString(),
  ]
  const notes = notesLines.join("\n")

  // 1. Save or Update CRM Customer
  const customer = await db.customer.upsert({
    where: { id: ctx.customerId },
    update: {
      name: state.name || undefined,
      email: state.email || undefined,
      stage: "QUALIFIED",
      source: "WHATSAPP",
      tags: tags as any,
      notes: notes,
      lastContactAt: new Date(),
    },
    create: {
      id: ctx.customerId,
      tenantId: tenantId,
      name: state.name || "FizMoh Growth Lead",
      phone: ctx.phone,
      email: state.email || null,
      stage: "QUALIFIED",
      source: "WHATSAPP",
      tags: tags as any,
      notes: notes,
      lastContactAt: new Date(),
    },
  })

  // 2. Schedule Initial Digital Strategy Consultation (Appointment)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(10, 0, 0, 0)

  const serviceRow = await db.aptService.findFirst({
    where: { tenantId, id: "srv_seo_audit" },
  }) || await db.aptService.findFirst({
    where: { tenantId },
  })

  const ref = "APT-" + Date.now().toString().slice(-6)
  const meetCode = "fiz-" + Math.random().toString(36).substring(2, 5) + "-" + Math.random().toString(36).substring(2, 6)
  const meetLink = "https://meet.google.com/" + meetCode

  if (serviceRow) {
    await db.aptAppointment.create({
      data: {
        tenantId,
        reference: ref,
        customerId: customer.id,
        customerName: state.name || "Client",
        customerPhone: ctx.phone,
        customerEmail: state.email || null,
        serviceId: serviceRow.id,
        appointmentDate: tomorrow,
        startTime: "10:00",
        endTime: "10:30",
        durationMins: 30,
        status: "CONFIRMED",
        paymentStatus: "NOT_REQUIRED",
        bookingSource: "WHATSAPP",
        notes: notes,
        meetLink: meetLink,
        conversationId: ctx.conversationId,
      },
    })
  }

  // 3. Notify Staff in Realtime
  await notifyStaff({
    type: "NEW_LEAD",
    title: "🚀 New FizMoh Marketing Lead & Appointment",
    message: (state.name || "Client") + " (" + ctx.phone + ") · " + (state.service || "Digital Marketing"),
    data: {
      phone: ctx.phone,
      service: state.service,
      budget: state.budget,
      meetLink: meetLink,
    },
  })

  return { meetLink, ref, tomorrow }
}

// ── Screen Senders ───────────────────────────────────────────────────────────

export async function sendMainMenu(ctx: FlowContext) {
  await setState(ctx.conversationId, { step: "MAIN_MENU", updatedAt: new Date().toISOString() })

  return sendInteractiveMessage({
    to: ctx.phone,
    body: "👋 *Hello! Welcome to FizMoh.*\n\nI’m your Digital Marketing Growth Assistant. How can I help you grow your business today?\n\nPlease choose an option from our main menu below 👇",
    list: {
      title: "View Main Menu",
      sections: [
        {
          title: "Growth & Solutions",
          rows: [
            { id: PREFIX + "opt_1_services", title: "1️⃣ Marketing Services", description: "SEO, PPC, Social Media, Web & AI" },
            { id: PREFIX + "opt_2_industries", title: "2️⃣ Industries We Serve", description: "Real Estate, Healthcare, E-Com & more" },
            { id: PREFIX + "opt_3_cases", title: "3️⃣ Case Studies / Portfolio", description: "Proven Results & ROAS Case Studies" },
            { id: PREFIX + "opt_4_pricing", title: "4️⃣ Pricing & Packages", description: "Starter, Growth & Advanced Packs" },
            { id: PREFIX + "opt_5_proposal", title: "5️⃣ Request a Proposal", description: "Get a Tailored Strategy & Quote" },
            { id: PREFIX + "opt_6_about", title: "6️⃣ About FizMoh", description: "Why Choose FizMoh & Methodology" },
            { id: PREFIX + "opt_7_expert", title: "7️⃣ Talk to Expert", description: "Live Chat with Senior Strategist" },
          ],
        },
      ],
    },
  })
}

// ── Main Handlers ────────────────────────────────────────────────────────────

export async function startMarketingFlow(ctx: FlowContext): Promise<boolean> {
  await sendMainMenu(ctx)
  return true
}

export async function handleMarketingReply(ctx: FlowContext, replyId: string): Promise<boolean> {
  const action = replyId.replace(PREFIX, "")
  const state = (await getState(ctx.conversationId)) || { step: "MAIN_MENU", updatedAt: new Date().toISOString() }

  // Universal Commands
  if (action === "cmd_menu" || action === "opt_main_menu") {
    await sendMainMenu(ctx)
    return true
  }

  // 1. Menu Selections
  if (action === "opt_1_services") {
    await setState(ctx.conversationId, { ...state, step: "OPT1_SERVICE_SELECT" })
    await sendInteractiveMessage({
      to: ctx.phone,
      body: "📢 *Our Digital Marketing Services*\n\nWhich digital marketing service are you interested in?",
      list: {
        title: "Choose Service",
        sections: [
          {
            title: "Select Service",
            rows: [
              { id: PREFIX + "srv_seo", title: "🔍 SEO / Google Ranking", description: "Top rankings for high-intent keywords" },
              { id: PREFIX + "srv_ppc", title: "🎯 Google Ads / PPC", description: "High-ROAS performance search & display" },
              { id: PREFIX + "srv_meta", title: "📱 Meta / Instagram & FB Ads", description: "Viral campaigns & lead generation" },
              { id: PREFIX + "srv_web", title: "💻 Web Design & E-Commerce", description: "Ultra-fast Next.js & WooCommerce" },
              { id: PREFIX + "srv_ai", title: "🤖 AI & WhatsApp Automation", description: "Automated chatbot & lead engines" },
              { id: PREFIX + "srv_package", title: "👑 Complete 360° Package", description: "Full-funnel digital marketing engine" },
            ],
          },
        ],
      },
    })
    return true
  }

  // Service selected
  if (action.startsWith("srv_")) {
    const serviceName =
      action === "srv_seo" ? "SEO & Google Ranking" :
      action === "srv_ppc" ? "Google Ads / PPC" :
      action === "srv_meta" ? "Meta / Instagram Ads" :
      action === "srv_web" ? "Web & E-Commerce Development" :
      action === "srv_ai" ? "AI WhatsApp Automation" : "Complete 360° Growth Package"

    await setState(ctx.conversationId, { ...state, service: serviceName, step: "OPT1_GOALS" })
    await sendInteractiveMessage({
      to: ctx.phone,
      body: "✨ *Great choice: " + serviceName + "!*\n\nWhat is your main marketing goal right now?",
      list: {
        title: "Select Goal",
        sections: [
          {
            title: "Primary Goal",
            rows: [
              { id: PREFIX + "goal_leads", title: "🎯 Generate More Leads", description: "High quality B2B / B2C inquiries" },
              { id: PREFIX + "goal_sales", title: "💰 Increase Online Sales", description: "Scale e-commerce revenue & ROAS" },
              { id: PREFIX + "goal_traffic", title: "📈 More Website Traffic", description: "Dominant Google organic visibility" },
              { id: PREFIX + "goal_brand", title: "💎 Build Brand Awareness", description: "Omni-channel presence in GCC" },
            ],
          },
        ],
      },
    })
    return true
  }

  // Goal selected
  if (action.startsWith("goal_")) {
    const goalName =
      action === "goal_leads" ? "Generate More Leads" :
      action === "goal_sales" ? "Increase Online Sales" :
      action === "goal_traffic" ? "More Website Traffic" : "Build Brand Awareness"

    await setState(ctx.conversationId, { ...state, goal: goalName, step: "OPT1_CONTACT_NAME" })
    await sendTextMessage(
      ctx.phone,
      "📊 *Strategy Recommendation*\n\nThanks! Based on your goal to *" + goalName + "*, our team recommends a multi-channel performance strategy with dedicated conversion-rate optimization.\n\n👉 Please reply with your *Full Name* to receive your tailored proposal roadmap:"
    )
    return true
  }

  // 2. Industries
  if (action === "opt_2_industries") {
    await setState(ctx.conversationId, { ...state, step: "OPT2_INDUSTRY_SELECT" })
    await sendInteractiveMessage({
      to: ctx.phone,
      body: "🏢 *Industries We Serve*\n\nWe deliver specialized growth solutions for businesses across diverse verticals. Select your industry:",
      list: {
        title: "Choose Industry",
        sections: [
          {
            title: "Industries",
            rows: [
              { id: PREFIX + "ind_realestate", title: "🏠 Real Estate & Property", description: "High-ticket buyer & investor leads" },
              { id: PREFIX + "ind_health", title: "🏥 Healthcare & Clinics", description: "Patient bookings & doctor visibility" },
              { id: PREFIX + "ind_ecom", title: "🛍️ E-Commerce & Retail", description: "High ROAS multi-channel scaling" },
              { id: PREFIX + "ind_hospitality", title: "🍽️ Hospitality & Tourism", description: "Guests, tours & table reservations" },
              { id: PREFIX + "ind_b2b", title: "🏭 B2B & Manufacturing", description: "Qualified corporate RFQs & contracts" },
            ],
          },
        ],
      },
    })
    return true
  }

  if (action.startsWith("ind_")) {
    const indName =
      action === "ind_realestate" ? "Real Estate" :
      action === "ind_health" ? "Healthcare" :
      action === "ind_ecom" ? "E-Commerce" :
      action === "ind_hospitality" ? "Hospitality" : "B2B / Manufacturing"

    await setState(ctx.conversationId, { ...state, industry: indName, step: "OPT5_NAME" })
    await sendTextMessage(
      ctx.phone,
      "🏢 *FizMoh " + indName + " Growth Framework*\n\nWe have battle-tested lead funnels and proven campaigns for " + indName + ".\n\nTo prepare an industry case study & proposal, please reply with your *Full Name*:"
    )
    return true
  }

  // 3. Case Studies
  if (action === "opt_3_cases") {
    await sendTextMessage(
      ctx.phone,
      "💼 *FizMoh Case Studies & Verified Results*\n\n" +
      "📈 *1. Real Estate & Luxury Villas:*\n• Results: 240+ verified buyer leads in 30 days\n• Channel: Meta Ads + WhatsApp Instant Qualify\n\n" +
      "🎯 *2. E-Commerce Brand (Perfumes & Fashion):*\n• Results: 8.4x Verified ROAS, $62k monthly revenue\n• Channel: Google Shopping + Meta Retargeting\n\n" +
      "🔍 *3. Healthcare & Medical Clinic:*\n• Results: +340% Google Organic Traffic, #1 for 42 keywords\n• Channel: Technical SEO + Local Map Optimization\n\n" +
      "Would you like us to replicate this success for your business?\n👉 Reply with your *Name* to request a proposal, or type *'expert'* to speak live with our strategist."
    )
    await setState(ctx.conversationId, { ...state, step: "OPT5_NAME" })
    return true
  }

  // 4. Pricing & Packages
  if (action === "opt_4_pricing") {
    await sendInteractiveMessage({
      to: ctx.phone,
      body: "🏷️ *FizMoh Pricing & Growth Packages*\n\nChoose the package that fits your business stage:",
      list: {
        title: "Select Package",
        sections: [
          {
            title: "Packages",
            rows: [
              { id: PREFIX + "pkg_starter", title: "🌱 Starter Pack (OMR 250/mo)", description: "Essential SEO & Social Presence" },
              { id: PREFIX + "pkg_growth", title: "⚡ Growth Pack (OMR 550/mo)", description: "Multi-channel PPC + SEO + Content" },
              { id: PREFIX + "pkg_advanced", title: "🔥 Advanced Pack (OMR 950/mo)", description: "Full-Funnel CRO, Paid Media & AI" },
              { id: PREFIX + "pkg_custom", title: "👑 Custom Enterprise", description: "Bespoke dedicated team & execution" },
            ],
          },
        ],
      },
    })
    return true
  }

  if (action.startsWith("pkg_")) {
    const pkgName =
      action === "pkg_starter" ? "Starter Pack" :
      action === "pkg_growth" ? "Growth Pack" :
      action === "pkg_advanced" ? "Advanced Pack" : "Custom Enterprise"

    await setState(ctx.conversationId, { ...state, package: pkgName, step: "OPT5_NAME" })
    await sendTextMessage(
      ctx.phone,
      "📦 *" + pkgName + " Selected*\n\nAll packages include weekly live dashboard access, dedicated manager, and zero lock-in contracts.\n\nPlease reply with your *Full Name* to activate your onboarding proposal:"
    )
    return true
  }

  // 5. Request Proposal
  if (action === "opt_5_proposal") {
    await setState(ctx.conversationId, { ...state, step: "OPT5_NAME" })
    await sendTextMessage(
      ctx.phone,
      "📋 *Request a Custom Marketing Proposal*\n\nLet’s understand your business to tailor the best strategy.\n\nPlease reply with your *Full Name*:"
    )
    return true
  }

  // 6. About FizMoh
  if (action === "opt_6_about") {
    await sendTextMessage(
      ctx.phone,
      "🛡️ *About FizMoh (fizmoh.cloud)*\n\n" +
      "FizMoh is a premier performance-driven digital marketing agency helping brands in Oman and the GCC scale with data-backed strategies.\n\n" +
      "💎 *Why Businesses Choose FizMoh:*\n" +
      "📈 *Proven Results* — High ROAS campaigns that generate revenue.\n" +
      "🔍 *100% Transparent* — Real-time analytics dashboards.\n" +
      "💰 *Affordable & Agile* — Top-tier marketing without bloated agency fees.\n" +
      "👨‍💼 *Dedicated Support* — 24/7 client communication & rapid execution.\n\n" +
      "🌐 *Website:* https://fizmoh.cloud\n\n" +
      "Type *'proposal'* to get a customized quote, or *'menu'* to return to main options."
    )
    return true
  }

  // 7. Talk to Expert
  if (action === "opt_7_expert") {
    await setState(ctx.conversationId, { ...state, step: "OPT7_EXPERT_NAME" })
    await sendTextMessage(
      ctx.phone,
      "🎧 *Connect with Our Senior Marketing Expert*\n\nWe’re excited to discuss your growth goals! Please reply with your *Full Name* to connect:"
    )
    return true
  }

  return false
}

export async function handleMarketingText(ctx: FlowContext, text: string): Promise<boolean> {
  const t = text.trim()
  const lower = t.toLowerCase()

  // Universal Navigation Commands
  if (lower === "menu" || lower === "main menu" || lower === "home" || lower === "قائمة") {
    await sendMainMenu(ctx)
    return true
  }
  if (lower === "expert" || lower === "talk to expert" || lower === "human" || lower === "خبير") {
    await setState(ctx.conversationId, { step: "OPT7_EXPERT_NAME", updatedAt: new Date().toISOString() })
    await sendTextMessage(ctx.phone, "🎧 *Connect with Our Senior Marketing Expert*\n\nPlease reply with your *Full Name*:")
    return true
  }
  if (lower === "proposal" || lower === "quote" || lower === "عرض") {
    await setState(ctx.conversationId, { step: "OPT5_NAME", updatedAt: new Date().toISOString() })
    await sendTextMessage(ctx.phone, "📋 *Request a Custom Marketing Proposal*\n\nPlease reply with your *Full Name*:")
    return true
  }
  if (lower === "pricing" || lower === "packages" || lower === "أسعار") {
    await setState(ctx.conversationId, { step: "OPT4_PACKAGE_SELECT", updatedAt: new Date().toISOString() })
    return handleMarketingReply(ctx, "opt_4_pricing")
  }

  const state = await getState(ctx.conversationId)
  if (!state) return false

  // Step-by-step questionnaire
  switch (state.step) {
    case "OPT1_CONTACT_NAME":
    case "OPT5_NAME": {
      if (t.length < 2) {
        await sendTextMessage(ctx.phone, "Please enter your name:")
        return true
      }
      await setState(ctx.conversationId, { ...state, name: t, step: "OPT5_COMPANY" })
      await sendTextMessage(ctx.phone, "Thanks " + t.split(" ")[0] + "! What is your *Company or Business Name*? (Or type *skip*):")
      return true
    }

    case "OPT5_COMPANY": {
      const company = lower === "skip" ? "Personal Business" : t
      await setState(ctx.conversationId, { ...state, companyName: company, step: "OPT5_EMAIL" })
      await sendTextMessage(ctx.phone, "Great. What is your *Email Address* so we can send the proposal and calendar invite? (Or type *skip*):")
      return true
    }

    case "OPT5_EMAIL": {
      const email = lower === "skip" ? null : t
      await setState(ctx.conversationId, { ...state, email: email || undefined, step: "OPT5_WEBSITE" })
      await sendTextMessage(ctx.phone, "What is your *Website or Instagram URL* (if available)? (Or type *skip*):")
      return true
    }

    case "OPT5_WEBSITE": {
      const website = lower === "skip" ? null : t
      await setState(ctx.conversationId, { ...state, website: website || undefined, step: "OPT5_BUDGET" })
      await sendTextMessage(
        ctx.phone,
        "What is your estimated *Monthly Marketing Budget* range?\n\n1️⃣ 250 - 500 OMR\n2️⃣ 500 - 1,000 OMR\n3️⃣ 1,000 - 2,500 OMR\n4️⃣ 2,500+ OMR / Custom\n\n(Type the number or your budget amount):"
      )
      return true
    }

    case "OPT5_BUDGET": {
      const budgetMap: Record<string, string> = {
        "1": "250 - 500 OMR",
        "2": "500 - 1,000 OMR",
        "3": "1,000 - 2,500 OMR",
        "4": "2,500+ OMR / Enterprise",
      }
      const budget = budgetMap[t] || t
      const finalState = { ...state, budget }

      // ── PERSIST TO CRM & APPOINTMENTS ──
      const { meetLink, ref, tomorrow } = await saveLeadToCRM(ctx, finalState)

      await setState(ctx.conversationId, null) // reset flow state

      const formattedDate = new Intl.DateTimeFormat("en-GB", {
        timeZone: APP_TIMEZONE,
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "numeric",
        minute: "2-digit",
      }).format(tomorrow)

      const confirmMsg =
        "🎉 *Proposal Request & Consultation Confirmed!*\n\n" +
        "Dear " + (finalState.name || "Client") + ",\n" +
        "Your marketing request has been saved in our CRM and assigned to a senior growth strategist.\n\n" +
        "📋 *Summary:*\n" +
        "• *Reference:* #" + ref + "\n" +
        "• *Company:* " + (finalState.companyName || "N/A") + "\n" +
        "• *Service:* " + (finalState.service || "Digital Marketing Consultation") + "\n" +
        "• *Budget Range:* " + finalState.budget + "\n" +
        "• *Video Strategy Session:* " + formattedDate + "\n\n" +
        "🎥 *Join Google Meet Call:*\n" + meetLink + "\n\n" +
        "Our team will review your website and prepare a custom growth audit. We look forward to scaling your business! 🚀\n\n" +
        "Type *'menu'* anytime to return to options."

      await sendCtaUrlMessage({
        to: ctx.phone,
        body: confirmMsg,
        buttonText: "Join Google Meet Call",
        url: meetLink,
        footerText: "FizMoh Digital Marketing (fizmoh.cloud)",
      }).catch(async () => {
        await sendTextMessage(ctx.phone, confirmMsg)
      })

      return true
    }

    case "OPT7_EXPERT_NAME": {
      if (t.length < 2) {
        await sendTextMessage(ctx.phone, "Please enter your name:")
        return true
      }
      await setState(ctx.conversationId, { ...state, name: t, step: "OPT7_EXPERT_TOPIC" })
      await sendTextMessage(
        ctx.phone,
        "Thanks " + t + "! What specific topic or challenge would you like to discuss with our expert? (e.g. SEO audit, Google Ads ROAS, Website redesign, WhatsApp Bot):"
      )
      return true
    }

    case "OPT7_EXPERT_TOPIC": {
      const finalState = { ...state, topic: t, service: t }
      const { meetLink, ref } = await saveLeadToCRM(ctx, finalState)
      await setState(ctx.conversationId, null)

      await db.conversation.update({
        where: { id: ctx.conversationId },
        data: { botActive: false },
      })

      await sendTextMessage(
        ctx.phone,
        "⏳ *Connecting you to our Senior Marketing Expert...*\n\n" +
        "👤 *Name:* " + finalState.name + "\n" +
        "🎯 *Topic:* " + finalState.topic + "\n" +
        "🔖 *Lead ID:* #" + ref + "\n" +
        "🎥 *Google Meet Link (if needed):* " + meetLink + "\n\n" +
        "💬 *You are now connected live with our marketing team!* A strategist will reply in this chat right away."
      )
      return true
    }

    default:
      return false
  }
}
