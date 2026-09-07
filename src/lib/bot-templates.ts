/**
 * Pre-built bot flow templates.
 * 25+ Production-ready templates across Healthcare, Tours, Appointments, E-Commerce, Dining, and CRM.
 */

export interface FlowTemplate {
  id: string
  name: string
  description: string
  emoji: string
  category: "Healthcare" | "Tours & Travel" | "Appointments" | "E-Commerce" | "Dining & Hospitality" | "CRM & AI"
  trigger: string
  triggerConfig: Record<string, unknown>
  nodes: unknown[]
  edges: unknown[]
}

const n = (id: string, type: string, data: Record<string, unknown>, x: number, y: number) => ({
  id, type, data, x, y,
})
const e = (id: string, source: string, target: string, label?: string) => ({
  id, source, target, ...(label ? { label } : {}),
})

export const BOT_TEMPLATES: FlowTemplate[] = [
  {
    id: "social_knowledge_concierge", name: "Facebook & Instagram — Knowledge bot", emoji: "💬", category: "CRM & AI",
    description: "Answer from your saved business information and Knowledge Base. Questions that need a person are handed to your team.",
    trigger: "KEYWORD", triggerConfig: { channels: ["FACEBOOK", "INSTAGRAM"], keywords: ["help"], matchType: "any" },
    nodes: [n("trigger", "TRIGGER", {}, 400, 40), n("answer", "AI", { instruction: "Answer the customer's question using only the saved business facts." }, 400, 180), n("done", "END", {}, 300, 340), n("human", "HANDOFF", {}, 550, 340)],
    edges: [e("start", "trigger", "answer"), e("ok", "answer", "done", "ok"), e("failed", "answer", "human", "failed")],
  },
  // ════════════════════════════════════════════════════════════════════════════
  // FIZMOH DIGITAL MARKETING WHATSAPP CHATBOT FLOW (7-BRANCH COMPLETE ARCHITECTURE)
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "fizmoh_digital_marketing_diagram",
    name: "FizMoh — Digital Marketing Agency Chatbot Flow",
    description: "Full 7-Branch Flow: Greeting → 7-Option Main Menu → Services, Industries, Case Studies, Pricing Packages, Proposal Request, About FizMoh, Live Human Expert Handoff",
    emoji: "🚀",
    category: "CRM & AI",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["marketing", "fizmoh", "agency", "seo", "ads", "growth", "proposal", "تسويق", "فزموه"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 500, 40),
      n("n_start", "SEND_TEXT", {
        text: "👋 *Hello! Welcome to FizMoh.*\n\nYour Digital Marketing Growth Partner. How can I help you today?",
      }, 500, 160),
      n("n_menu", "LIST", {
        text: "📱 *Main Menu*\nPlease choose an option from below 👇",
        listButton: "Select Option",
        rows: [
          { id: "opt_services", title: "1. Digital Marketing Services", description: "SEO, Ads, Web Dev & Automation" },
          { id: "opt_industries", title: "2. Industries We Serve", description: "Real Estate, Healthcare, E-Com & more" },
          { id: "opt_cases", title: "3. Case Studies / Portfolio", description: "Recent Projects & Verified Results" },
          { id: "opt_pricing", title: "4. Pricing & Packages", description: "Starter, Growth & Custom Plans" },
          { id: "opt_proposal", title: "5. Request a Proposal", description: "Get a Custom Strategy & Quote" },
          { id: "opt_about", title: "6. About FizMoh", description: "Why Choose FizMoh & Methodology" },
          { id: "opt_expert", title: "7. Talk to Expert", description: "Live Chat with Senior Marketing Strategist" },
        ],
      }, 500, 280),

      // Branch 1: Services (1.1 - 1.7)
      n("n_b1_services", "QUICK_REPLY", {
        text: "📢 *1.1 Choose a Service*\nPick a digital marketing service you're interested in:",
        buttons: ["SEO Strategy", "Paid Ads (PPC)", "Web & E-Com", "AI Automation"],
      }, 60, 440),
      n("n_b1_details", "SEND_TEXT", {
        text: "✨ *1.2 Service Details & Benefits*\nWe design high-converting multi-channel campaigns with guaranteed transparent reporting and ROI tracking.",
      }, 60, 560),
      n("n_b1_goals", "QUESTION", {
        name: "client_goals",
        text: "🎯 *1.3 Goals & Requirements*\nTell us your business goals (e.g. 5x qualified leads, online store sales, Oman/GCC market launch):",
        inputType: "text",
        required: true,
      }, 60, 680),
      n("n_b1_strategy", "SEND_TEXT", {
        text: "📊 *1.4 Strategy Recommendation*\nWe'll suggest the optimal performance mix: SEO foundation + High-ROAS Google & Meta Ads + Conversion Optimized Landing Pages.",
      }, 60, 800),
      n("n_b1_next", "QUICK_REPLY", {
        text: "👉 *1.5 Next Steps*\nWould you like a tailored proposal or talk to our marketing expert?",
        buttons: ["Get Proposal", "Talk to Expert"],
      }, 60, 920),
      n("n_b1_contact", "QUESTION", {
        name: "client_contact",
        text: "👤 *1.6 Share Contact Details*\nPlease share your Name, Business Name, and Email Address:",
        inputType: "text",
        required: true,
      }, 60, 1040),
      n("n_b1_done", "SEND_TEXT", {
        text: "✅ *1.7 Request Submitted!*\nOur senior growth team will reach out to you shortly with your custom roadmap. Let's scale together! 🚀",
      }, 60, 1160),

      // Branch 2: Industries
      n("n_b2_list", "SEND_TEXT", {
        text: "🏢 *2. Industries We Serve*\nWe drive growth across specialized verticals:\n• 🏠 Real Estate & Luxury Property\n• 🏥 Healthcare, Clinics & Hospitals\n• 🎓 Higher Education & Academies\n• 🛍️ E-Commerce & Retail Brands\n• 🍽️ Hospitality, Resorts & Dining\n• 🏭 B2B & Industrial Manufacturing\n\nInterested to see industry-specific case studies?",
      }, 240, 440),
      n("n_b2_cta", "SEND_TEXT", {
        text: "🤝 *Connect with Industry Expert*\nOur dedicated sector strategist will share in-depth insights and tailored benchmarks for your niche.",
      }, 240, 600),

      // Branch 3: Case Studies
      n("n_b3_list", "LIST", {
        text: "💼 *3. Case Studies & Proven Results*\nCheck out our recent high-impact campaigns:",
        listButton: "View Results",
        rows: [
          { id: "cs_seo", title: "📈 SEO: +320% Organic Traffic", description: "Top 3 rankings for 85+ high-intent keywords" },
          { id: "cs_ads", title: "🎯 Ads: 8.4x ROAS on Meta & Google", description: "Lowered CPA by 42% for e-commerce brand" },
          { id: "cs_web", title: "💻 Web: 4.8% Conversion Rate", description: "Modern ultra-fast Next.js platform launch" },
          { id: "cs_ai", title: "🤖 AI WhatsApp: 1,200+ Leads/mo", description: "Automated booking & lead qualification bot" },
        ],
      }, 420, 440),
      n("n_b3_cta", "SEND_TEXT", {
        text: "🚀 *Let's Grow Your Business!*\nWe can replicate these proven frameworks for your brand. Type 'proposal' or tap below to get started.",
      }, 420, 600),

      // Branch 4: Pricing & Packages
      n("n_b4_packages", "LIST", {
        text: "🏷️ *4. Pricing & Growth Packages*\nSelect a package that fits your business stage:",
        listButton: "View Packages",
        rows: [
          { id: "pkg_starter", title: "🌱 Starter Pack", description: "Essential SEO & Social Media presence" },
          { id: "pkg_growth", title: "⚡ Growth Pack", description: "Multi-channel PPC + SEO + Content Engine" },
          { id: "pkg_advanced", title: "🔥 Advanced Pack", description: "Full-Funnel CRO, Paid Media & Automation" },
          { id: "pkg_custom", title: "👑 Custom Enterprise", description: "Dedicated growth team & bespoke strategy" },
        ],
      }, 600, 440),
      n("n_b4_details", "SEND_TEXT", {
        text: "📦 *Package Details & Deliverables*\nAll packages include weekly live dashboard access, dedicated account manager, and transparent reporting with zero hidden fees.",
      }, 600, 600),
      n("n_b4_custom", "SEND_TEXT", {
        text: "✨ *Need a Custom Plan?*\nWe can engineer a bespoke plan specifically tailored to your business model and target markets.",
      }, 600, 740),

      // Branch 5: Request a Proposal
      n("n_b5_q1", "QUESTION", {
        name: "biz_details",
        text: "📋 *5. Tell Us About Your Business*\nPlease share your Business Name, Website (if any), and Main Target Customers:",
        inputType: "text",
        required: true,
      }, 780, 440),
      n("n_b5_q2", "QUESTION", {
        name: "biz_budget",
        text: "💰 *Monthly Marketing Budget*\nPlease select or type your estimated monthly budget range (e.g. 500 - 1,500 OMR / $1,500 - $4,000+):",
        inputType: "text",
        required: true,
      }, 780, 600),
      n("n_b5_done", "SEND_TEXT", {
        text: "🎉 *Proposal Request Submitted!*\nOur strategy directors are preparing a custom audit & proposal. We will share it with you within 24 hours via WhatsApp & Email.",
      }, 780, 740),

      // Branch 6: About FizMoh
      n("n_b6_about", "SEND_TEXT", {
        text: "🛡️ *6. About FizMoh*\nFizMoh is a performance-driven digital marketing agency helping businesses grow online with data-backed strategies, creative campaigns, and measurable results.\n\n💎 *Why Choose FizMoh:*\n📈 *Proven Results* — Data-backed execution with proven ROAS.\n🔍 *Transparent Process* — Live real-time dashboard & clear metrics.\n🏷️ *Affordable & Agile* — High-tier talent without agency overhead.\n🎧 *Dedicated Support* — 24/7 client communication & rapid iteration.\n\n🌐 Website: https://fizmoh.cloud",
      }, 960, 440),
      n("n_b6_cta", "SEND_TEXT", {
        text: "🤝 *Let's Work Together and Grow Your Business Online!*",
      }, 960, 620),

      // Branch 7: Talk to Expert
      n("n_b7_contact", "QUESTION", {
        name: "expert_topic",
        text: "🎧 *7. Connect with Our Marketing Expert*\nWe're here to help you scale! Please share your Name and what you'd like to discuss (e.g. SEO, Paid Ads, Website redesign):",
        inputType: "text",
        required: true,
      }, 1140, 440),
      n("n_b7_handoff", "HUMAN_HANDOFF", {
        text: "Connecting you to our senior marketing expert... Please wait a moment.\n\n💬 *You are now connected live with our marketing expert!* How can we help you today?",
        team: "Growth Specialists",
      }, 1140, 600),

      // Universal Bottom Nodes
      n("n_more_questions", "SEND_TEXT", {
        text: "💬 *Any More Questions?*\nIf you need anything else, feel free to ask our 24/7 AI concierge right here!",
      }, 500, 1300),
      n("n_back_menu", "SEND_TEXT", {
        text: "🏠 *Back to Main Menu*\nType *'menu'* anytime to return to the main options.",
      }, 500, 1420),
    ],
    edges: [
      e("e0", "trigger", "n_start"),
      e("e1", "n_start", "n_menu"),

      // Branch 1
      e("e_b1_0", "n_menu", "n_b1_services", "1. Services"),
      e("e_b1_1", "n_b1_services", "n_b1_details"),
      e("e_b1_2", "n_b1_details", "n_b1_goals"),
      e("e_b1_3", "n_b1_goals", "n_b1_strategy"),
      e("e_b1_4", "n_b1_strategy", "n_b1_next"),
      e("e_b1_5", "n_b1_next", "n_b1_contact"),
      e("e_b1_6", "n_b1_contact", "n_b1_done"),
      e("e_b1_7", "n_b1_done", "n_more_questions"),

      // Branch 2
      e("e_b2_0", "n_menu", "n_b2_list", "2. Industries"),
      e("e_b2_1", "n_b2_list", "n_b2_cta"),
      e("e_b2_2", "n_b2_cta", "n_more_questions"),

      // Branch 3
      e("e_b3_0", "n_menu", "n_b3_list", "3. Case Studies"),
      e("e_b3_1", "n_b3_list", "n_b3_cta"),
      e("e_b3_2", "n_b3_cta", "n_more_questions"),

      // Branch 4
      e("e_b4_0", "n_menu", "n_b4_packages", "4. Pricing"),
      e("e_b4_1", "n_b4_packages", "n_b4_details"),
      e("e_b4_2", "n_b4_details", "n_b4_custom"),
      e("e_b4_3", "n_b4_custom", "n_more_questions"),

      // Branch 5
      e("e_b5_0", "n_menu", "n_b5_q1", "5. Proposal"),
      e("e_b5_1", "n_b5_q1", "n_b5_q2"),
      e("e_b5_2", "n_b5_q2", "n_b5_done"),
      e("e_b5_3", "n_b5_done", "n_more_questions"),

      // Branch 6
      e("e_b6_0", "n_menu", "n_b6_about", "6. About Us"),
      e("e_b6_1", "n_b6_about", "n_b6_cta"),
      e("e_b6_2", "n_b6_cta", "n_more_questions"),

      // Branch 7
      e("e_b7_0", "n_menu", "n_b7_contact", "7. Expert"),
      e("e_b7_1", "n_b7_contact", "n_b7_handoff"),

      // Global
      e("e_end", "n_more_questions", "n_back_menu"),
    ],
  },
  // ════════════════════════════════════════════════════════════════════════════
  // 1. HEALTHCARE & HOSPITAL (Kauvery Hospital)
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "kauvery_hospital_diagram_flow",
    name: "Kauvery Hospital — Oncology & Bed Architecture",
    description: "4-Option Home Menu → Patient ID → Doctor → Date → Ward & Bed Grid (30 beds) → 5-Min Hold → Instant Booking Confirmation",
    emoji: "🏥",
    category: "Healthcare",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["hospital", "kauvery", "chemo", "doctor", "appointment", "day care", "طبيب", "مستشفى"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 400, 40),
      n("n_menu", "LIST", {
        text: "🏥 *Welcome to Kauvery Hospital*\n\nPlease select an option from our hospital main menu below 👇",
        listButton: "Hospital Menu",
        rows: [
          { id: "opt_doc", title: "1. Book Doctor Appointment", description: "Specialist Oncologist Consultation" },
          { id: "opt_chemo", title: "2. Book Chemotherapy Day Care", description: "30-Bed Day Care Reservation" },
          { id: "opt_bookings", title: "3. My Bookings", description: "View & Manage Existing Bookings" },
          { id: "opt_contact", title: "4. Contact Hospital", description: "Emergency Desk & Reception" },
        ],
      }, 400, 180),
      n("n_doc_flow", "HOSP_DOCTOR", { hospitalText: "🩺 *Doctor Appointment Consultation*\nPlease choose your specialist oncologist and consultation time slot." }, 100, 360),
      n("n_patient_id", "QUESTION", { name: "patient_mrn", text: "👤 *Patient Identification*\n\nPlease enter your Hospital MRN (Medical Record Number) or registered Phone Number:", inputType: "text", required: true }, 360, 360),
      n("n_sel_doctor", "QUESTION", { name: "oncologist", text: "👨‍⚕️ *Select Supervising Oncologist*\n\nChoose your oncologist:", inputType: "select", options: ["Dr. Ahmed Khan (Medical Oncology)", "Dr. Sara Joseph (Clinical Oncology)", "Dr. Mohammed Ali (Hematology)"], required: true }, 360, 520),
      n("n_treatment_date", "QUESTION", { name: "treatment_date", text: "📅 *Choose Treatment Date*\n\nSelect your scheduled chemotherapy day-care date:", inputType: "date", required: true }, 360, 680),
      n("n_ward_bed", "HOSP_CHEMO", { hospitalText: "🛏️ *Choose Ward & Bed (30 Beds Available)*\n\nSelect from Normal Ward (`N01`-`N15`) or Special Ward (`S01`-`S15`).\nYour selected bed will be reserved with a *5-Minute Atomic Hold* during checkout." }, 360, 840),
      n("n_confirmed", "MESSAGE", { text: "✅ *Chemotherapy Day Care Booking Confirmed!*\n\n📌 *Booking ID:* `CHEMO-260817-001`\n🏥 *Hospital:* Kauvery Hospital Day Care Center\n🛏️ *Bed Status:* Reserved & Verified\n\nPlease arrive 15 minutes before your session. Show this confirmation at the Day Care Oncology Reception." }, 360, 1020),
      n("n_my_bookings", "MESSAGE", { text: "📋 *My Hospital Bookings*\n\nPlease reply with your registered phone number or MRN to view your upcoming appointments and day-care reservations." }, 640, 360),
      n("n_contact", "CTA_URL", { text: "📞 *Kauvery Hospital Emergency & Reception*\n\nMuscat, Sultanate of Oman\nEmergency Desk: 24/7 Available", buttonText: "Call Hospital", phone: "+968 9882 1965", url: "https://app.fizmoh.cloud/hospital/book" }, 900, 360),
    ],
    edges: [
      e("e1", "trigger", "n_menu"),
      e("e2", "n_menu", "n_doc_flow"),
      e("e3", "n_menu", "n_patient_id"),
      e("e4", "n_patient_id", "n_sel_doctor"),
      e("e5", "n_sel_doctor", "n_treatment_date"),
      e("e6", "n_treatment_date", "n_ward_bed"),
      e("e7", "n_ward_bed", "n_confirmed"),
      e("e8", "n_menu", "n_my_bookings"),
      e("e9", "n_menu", "n_contact"),
    ],
  },
  {
    id: "kauvery_doctor_consultation",
    name: "Doctor & Specialist Outpatient Appointment",
    description: "Specialty selection → Doctor schedule → In-Person or Telehealth → Google Meet Video Link",
    emoji: "🩺",
    category: "Healthcare",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["doctor", "consultation", "oncologist", "physician", "clinic"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "MESSAGE", { text: "🩺 *Kauvery Hospital — Specialist Doctor Appointments*\n\nPlease select the specialty department you wish to consult:" }, 300, 180),
      n("n2", "HOSP_DOCTOR", { hospitalText: "👨‍⚕️ Available Oncologists & Specialists this week:" }, 300, 340),
      n("n3", "QUESTION", { name: "consult_mode", text: "Choose consultation mode:", inputType: "select", options: ["🏥 In-Hospital Clinic (Kauvery Hospital)", "💻 Online Video Consultation (Google Meet)"] }, 300, 500),
      n("n4", "PAYMENT", { amount: 15, currency: "OMR", paymentDescription: "Doctor Consultation Fee", text: "💳 Complete consultation token payment:" }, 300, 660),
      n("n5", "MESSAGE", { text: "✅ *Appointment Confirmed!*\n\nYour specialist has been booked. A calendar invite and Google Meet link have been sent to your email." }, 300, 820),
    ],
    edges: [e("e1", "trigger", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3"), e("e4", "n3", "n4"), e("e5", "n4", "n5")],
  },
  {
    id: "kauvery_chemo_express",
    name: "Chemotherapy Day Care Express Bed Re-booking",
    description: "Fast repeat cycle booking: MRN verification → Treatment cycle # → Bed preference (Normal/Special) → Confirmation",
    emoji: "💊",
    category: "Healthcare",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["repeat chemo", "cycle", "rebook chemo", "daycare"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "QUESTION", { name: "patient_mrn", text: "💊 *Kauvery Chemotherapy Day Care Express*\n\nPlease enter your Patient MRN to fetch your oncology protocol:", inputType: "text", required: true }, 300, 180),
      n("n2", "QUESTION", { name: "cycle_number", text: "Which chemotherapy cycle is this session?", inputType: "select", options: ["Cycle 1", "Cycle 2", "Cycle 3", "Cycle 4", "Cycle 5", "Cycle 6+"] }, 300, 340),
      n("n3", "HOSP_CHEMO", { hospitalText: "🛏️ Select your preferred bed for this cycle (Normal N01-N15 or Special S01-S15):" }, 300, 500),
      n("n4", "MESSAGE", { text: "✅ *Express Day Care Cycle Reserved!*\n\nOur oncology nursing coordinator has been notified. Pre-medication protocol will be prepared." }, 300, 660),
    ],
    edges: [e("e1", "trigger", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3"), e("e4", "n3", "n4")],
  },
  {
    id: "kauvery_lab_reports",
    name: "Medical Lab Reports & Prescription Dispatch",
    description: "Request pathology reports, blood counts (CBC), and oncology medication refills via WhatsApp",
    emoji: "🧪",
    category: "Healthcare",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["report", "lab", "blood test", "prescription", "cbc", "results"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "QUESTION", { name: "mrn_report", text: "🧪 *Kauvery Hospital Diagnostics & Lab Services*\n\nPlease provide your Patient MRN or National Civil ID:", inputType: "text", required: true }, 300, 180),
      n("n2", "BUTTONS", { text: "What diagnostic documents do you require today?", buttons: [{ id: "b_blood", title: "🩸 Blood Work / CBC" }, { id: "b_scan", title: "🩻 PET/CT Scan Report" }, { id: "b_rx", title: "💊 Medication Refill" }] }, 300, 340),
      n("n3", "MESSAGE", { text: "📄 *Report Retrieved Successfully*\n\nYour encrypted PDF lab report has been generated. Tap below to download securely." }, 300, 500),
      n("n4", "CTA_URL", { text: "🔗 Download your verified medical report:", buttonText: "View Medical Portal", url: "https://app.fizmoh.cloud/hospital/book" }, 300, 660),
    ],
    edges: [e("e1", "trigger", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3"), e("e4", "n3", "n4")],
  },
  {
    id: "kauvery_emergency_triage",
    name: "24/7 Emergency Desk & Ambulance Dispatch",
    description: "Critical triage assessment → GPS live location capture → Immediate emergency hotline & ER dispatch",
    emoji: "🚨",
    category: "Healthcare",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["emergency", "ambulance", "urgent", "pain", "fever", "طوارئ", "اسعاف"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "MESSAGE", { text: "🚨 *KAUVERY HOSPITAL 24/7 EMERGENCY & TRIAGE*\n\nIf you are experiencing severe chest pain, shortness of breath, or high oncology fever (>= 38°C / 100.4°F), immediate attention is required!" }, 300, 180),
      n("n2", "LOCATION", { name: "Kauvery Hospital ER & Trauma Center", address: "Main ER Entrance, 24/7 Emergency Bay, Muscat", latitude: 23.5880, longitude: 58.3829 }, 150, 360),
      n("n3", "CTA_URL", { text: "🚨 *Call Emergency Hotline Immediately:*", buttonText: "Call ER Hotline", phone: "+968 9882 1965", url: "tel:+96898821965" }, 450, 360),
      n("n4", "HANDOFF", {}, 300, 520),
    ],
    edges: [e("e1", "trigger", "n1"), e("e2", "n1", "n2"), e("e3", "n1", "n3"), e("e4", "n1", "n4")],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 2. TOURS, SAFARIS & TRAVEL (Oman Tours)
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "oman_desert_safari_payment",
    name: "Wahiba Sands Desert Safari + AmwalPay",
    description: "4x4 Dune bashing adventure: Group size → Pickup Hotel → Date slot → Online card payment → PDF Voucher",
    emoji: "🚙",
    category: "Tours & Travel",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["desert", "safari", "wahiba", "dune bashing", "camping", "رحلة صحراوية"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "TOUR_DETAILS", { tourText: "🏜️ *Wahiba Sands Sunset Desert Safari & Bedouin Camp*\nExperience thrilling red dune bashing, camel riding, and traditional Omani BBQ dinner under the stars!" }, 300, 180),
      n("n2", "QUESTION", { name: "pax_count", text: "How many guests will be joining the safari?", inputType: "select", options: ["1 Person", "2 People", "3-4 Family", "5+ Group"] }, 300, 340),
      n("n3", "QUESTION", { name: "pickup_hotel", text: "Please share your hotel name or pickup address in Muscat:", inputType: "text", required: true }, 300, 500),
      n("n4", "TOUR_AVAIL", { text: "📅 Please choose your preferred safari date:" }, 300, 660),
      n("n5", "PAYMENT", { amount: 45, currency: "OMR", paymentDescription: "Wahiba Sands Safari Booking", text: "💳 Complete your safari booking securely:" }, 300, 820),
      n("n6", "MESSAGE", { text: "🎉 *Safari Confirmed!*\n\nYour voucher and 4x4 driver contact details have been dispatched. See you in the desert!" }, 300, 980),
    ],
    edges: [e("e1", "trigger", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3"), e("e4", "n3", "n4"), e("e5", "n4", "n5"), e("e6", "n5", "n6")],
  },
  {
    id: "oman_snorkeling_adventure",
    name: "Daymaniyat Islands Snorkeling Safari",
    description: "UNESCO Marine Reserve tour: Snorkeling gear → Boat departure slot → Sea turtle spotting guarantee",
    emoji: "🐢",
    category: "Tours & Travel",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["snorkeling", "daymaniyat", "islands", "turtle", "diving", "marine"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "MESSAGE", { text: "🐠 *Daymaniyat Islands Snorkeling & Marine Sanctuary*\nSwim with wild sea turtles, colorful coral reefs, and pristine turquoise bays." }, 300, 180),
      n("n2", "TOUR_AVAIL", { text: "📅 Check available boat slots for this week:" }, 300, 340),
      n("n3", "QUESTION", { name: "swimmer_level", text: "What is your swimming / snorkeling experience level?", inputType: "select", options: ["Beginner (Life jacket provided)", "Intermediate", "Advanced Snorkeler"] }, 300, 500),
      n("n4", "PAYMENT", { amount: 35, currency: "OMR", paymentDescription: "Daymaniyat Island Tour Ticket", text: "💳 Pay ticket fee (includes Marine Permit & Gear):" }, 300, 660),
      n("n5", "LOCATION", { name: "Al Mouj Marina (Gate C)", address: "The Wave Muscat Marina, Oman", latitude: 23.6264, longitude: 58.2612 }, 300, 820),
    ],
    edges: [e("e1", "trigger", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3"), e("e4", "n3", "n4"), e("e5", "n4", "n5")],
  },
  {
    id: "oman_private_yacht",
    name: "Private Yacht & Dolphin Cruise Charter",
    description: "Exclusive luxury yacht charter: Vessel size (36ft/50ft/80ft) → Hours → Live BBQ add-ons → Captain confirmation",
    emoji: "⛵",
    category: "Tours & Travel",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["yacht", "boat", "dolphin", "cruise", "private charter", "يخت"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "BUTTONS", { text: "⛵ *Private Yacht & Dolphin Charter in Muscat*\nChoose your preferred vessel tier:", buttons: [{ id: "y_36", title: "🚤 36ft Speedboat (8 Pax)" }, { id: "y_50", title: "🛥️ 50ft Luxury Yacht" }, { id: "y_80", title: "🛳️ 80ft VIP Superyacht" }] }, 300, 180),
      n("n2", "QUESTION", { name: "charter_hours", text: "How many cruising hours would you like to reserve?", inputType: "select", options: ["2 Hours (Dolphin & Coastal)", "4 Hours (Snorkeling & Island Bay)", "Full Day 8 Hours"] }, 300, 340),
      n("n3", "TOUR_AVAIL", { text: "📅 Select charter departure date & time:" }, 300, 500),
      n("n4", "PAYMENT", { amount: 120, currency: "OMR", paymentDescription: "Private Yacht Deposit (50%)", text: "💳 Pay booking deposit via AmwalPay:" }, 300, 660),
      n("n5", "MESSAGE", { text: "⚓ *Charter Reserved!*\n\nCaptain and crew are prepped. Marina gate pass is attached." }, 300, 820),
    ],
    edges: [e("e1", "trigger", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3"), e("e4", "n3", "n4"), e("e5", "n4", "n5")],
  },
  {
    id: "oman_visa_express",
    name: "Oman Tourist & Express Visa Assistance",
    description: "Visa type selection (10-Day / 30-Day / 1-Year Multi) → Passport photo OCR upload → Processing status",
    emoji: "🛂",
    category: "Tours & Travel",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["visa", "evisa", "tourist visa", "entry permit", "فيزا", "تأشيرة"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "VISA", { text: "🛂 *Royal Oman Police (ROP) Approved eVisa Assistance*\nFast-track visa processing for tourists and business travelers." }, 300, 180),
      n("n2", "QUESTION", { name: "nationality", text: "Please state your nationality as written on your passport:", inputType: "text", required: true }, 300, 340),
      n("n3", "QUESTION", { name: "passport_photo", text: "📸 Please upload a clear photo or scan of your passport information page:", inputType: "image", required: true }, 300, 500),
      n("n4", "PAYMENT", { amount: 20, currency: "OMR", paymentDescription: "Oman Tourist eVisa Fee", text: "💳 Pay official government visa fee:" }, 300, 660),
      n("n5", "MESSAGE", { text: "✅ *Application Submitted to Immigration!*\n\nYour eVisa reference number is `OM-VISA-99412`. Expected turnaround: 24 to 48 hours." }, 300, 820),
    ],
    edges: [e("e1", "trigger", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3"), e("e4", "n3", "n4"), e("e5", "n4", "n5")],
  },
  {
    id: "oman_airport_transfer",
    name: "Airport VIP Chauffeur & Hotel Transfer",
    description: "Muscat International Airport (MCT) pickup: Flight number → Terminal → Vehicle class (Sedan / VIP Lexus / Van)",
    emoji: "✈️",
    category: "Tours & Travel",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["airport", "transfer", "taxi", "chauffeur", "flight", "مطار"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "QUESTION", { name: "flight_no", text: "✈️ *Muscat Airport (MCT) VIP Transfer*\n\nPlease enter your arriving Flight Number (e.g. WY102 / EK864):", inputType: "text", required: true }, 300, 180),
      n("n2", "QUESTION", { name: "arrival_date", text: "What is your scheduled arrival date?", inputType: "date", required: true }, 300, 340),
      n("n3", "BUTTONS", { text: "Select your preferred vehicle class:", buttons: [{ id: "v_sedan", title: "🚗 Premium Sedan (1-3)" }, { id: "v_lexus", title: "🚘 VIP Lexus ES (1-3)" }, { id: "v_van", title: "🚐 Luxury Van (4-7)" }] }, 300, 500),
      n("n4", "PAYMENT", { amount: 15, currency: "OMR", paymentDescription: "MCT Airport Chauffeur Transfer", text: "💳 Complete transfer payment:" }, 300, 660),
      n("n5", "MESSAGE", { text: "🚖 *Driver Assigned!*\n\nYour driver will await you at Arrival Hall Gate 2 with your name board." }, 300, 820),
    ],
    edges: [e("e1", "trigger", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3"), e("e4", "n3", "n4"), e("e5", "n4", "n5")],
  },
  {
    id: "tour_reschedule_service",
    name: "Tour Self-Service Reschedule & Date Change",
    description: "Instant self-service tour date changes: Order # verification → Live date availability check → Confirmation",
    emoji: "🔄",
    category: "Tours & Travel",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["reschedule", "change date", "modify booking", "cancel tour"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "QUESTION", { name: "order_ref", text: "🔄 *Tour Booking Management*\n\nPlease enter your Order Number (e.g. `ORD-12345`):", inputType: "text", required: true }, 300, 180),
      n("n2", "TOUR_AVAIL", { text: "📅 Select your new preferred date for this tour:" }, 300, 340),
      n("n3", "MESSAGE", { text: "✅ *Tour Date Updated!*\n\nYour booking has been shifted at zero fee. An updated voucher has been sent." }, 300, 500),
    ],
    edges: [e("e1", "trigger", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3")],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 3. APPOINTMENTS & PROFESSIONAL SERVICES
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "salon_spa_booking",
    name: "Luxury Salon, Hair & Spa Appointment",
    description: "Service menu (Hair / Moroccan Bath / Facial) → Stylist selector → Time slot → WhatsApp booking confirmation",
    emoji: "💇‍♀️",
    category: "Appointments",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["salon", "spa", "haircut", "facial", "massage", "صالون", "مساج"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "LIST", {
        text: "✨ *Welcome to Glow Luxury Spa & Beauty Lounge*\nSelect your treatment:",
        listButton: "View Spa Menu",
        rows: [
          { id: "s_hair", title: "💇‍♀️ Hair Styling & Treatment", description: "Cut, blowdry, keratin & coloring" },
          { id: "s_moroccan", title: "🛁 Royal Moroccan Bath", description: "60-min herbal steam & scrub" },
          { id: "s_massage", title: "💆‍♀️ Swedish Relaxing Massage", description: "Full body aromatherapy massage" },
          { id: "s_nails", title: "💅 Mani-Pedi Gel Lounge", description: "Spa manicure & pedicure" },
        ],
      }, 300, 180),
      n("n2", "APPOINTMENT", { appointmentText: "📅 Select your therapist and preferred time slot:" }, 300, 340),
      n("n3", "PAYMENT", { amount: 20, currency: "OMR", paymentDescription: "Spa Treatment Deposit", text: "💳 Pay booking deposit to secure slot:" }, 300, 500),
      n("n4", "MESSAGE", { text: "🌸 *Your Spa Session is Confirmed!*\n\nPlease arrive 10 minutes prior to relax and enjoy complimentary herbal tea." }, 300, 660),
    ],
    edges: [e("e1", "trigger", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3"), e("e4", "n3", "n4")],
  },
  {
    id: "car_service_maintenance",
    name: "Automotive Service, Oil Change & Test Drive",
    description: "Vehicle make/model → Service package (Major / Minor / Brake Inspection) → Garage bay scheduling",
    emoji: "🚗",
    category: "Appointments",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["service", "car", "oil change", "brakes", "garage", "صيانة", "سيارة"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "QUESTION", { name: "car_model", text: "🚗 *AutoCare Workshop & Service Center*\n\nPlease tell us your car make, model, and year (e.g. Toyota Land Cruiser 2022):", inputType: "text", required: true }, 300, 180),
      n("n2", "BUTTONS", { text: "Select service package required:", buttons: [{ id: "srv_oil", title: "🛢️ Minor Service + Oil" }, { id: "srv_major", title: "🔧 Major 40K/80K Service" }, { id: "srv_check", title: "🔍 50-Point Inspection" }] }, 300, 340),
      n("n3", "APPOINTMENT", { appointmentText: "📅 Pick your workshop drop-off date & time:" }, 300, 500),
      n("n4", "LOCATION", { name: "AutoCare Service Center", address: "Al Ghubrah Industrial Area, Muscat", latitude: 23.5821, longitude: 58.4012 }, 300, 660),
    ],
    edges: [e("e1", "trigger", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3"), e("e4", "n3", "n4")],
  },
  {
    id: "real_estate_viewing",
    name: "Real Estate Property Viewing & PDF Brochure",
    description: "Property type (Villa / Apartment / Penthouse) → Budget range → Instant PDF brochure dispatch → Site viewing",
    emoji: "🏡",
    category: "Appointments",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["property", "villa", "apartment", "real estate", "rent", "buy", "عقار"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "BUTTONS", { text: "🏡 *Prime Luxury Properties Oman*\nWhat type of property are you interested in?", buttons: [{ id: "p_villa", title: "🏰 Luxury Sea Villa" }, { id: "p_apt", title: "🏢 Modern 2-3BR Apt" }, { id: "p_pent", title: "🌆 Marina Penthouse" }] }, 300, 180),
      n("n2", "QUESTION", { name: "budget", text: "What is your target budget (OMR / USD)?", inputType: "select", options: ["Below 100,000 OMR", "100K – 250K OMR", "250K – 500K OMR", "500,000+ OMR (VIP Luxury)"] }, 300, 340),
      n("n3", "APPOINTMENT", { appointmentText: "📅 Schedule an on-site property tour with our Senior Broker:" }, 300, 500),
      n("n4", "SAVE", {}, 300, 660),
      n("n5", "MESSAGE", { text: "✅ *Appointment Confirmed!*\n\nOur luxury property specialist will meet you at the site with full floorplans and deed documents." }, 300, 820),
    ],
    edges: [e("e1", "trigger", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3"), e("e4", "n3", "n4"), e("e5", "n4", "n5")],
  },
  {
    id: "legal_consultation",
    name: "Legal & Corporate Advisory Consultation",
    description: "Practice area (Commercial / Labor / Real Estate / Dispute) → Conflict check → Retainer payment → Zoom/Meet Link",
    emoji: "⚖️",
    category: "Appointments",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["lawyer", "legal", "attorney", "consultation", "contract", "محامي", "استشارة"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "LIST", {
        text: "⚖️ *Al Tamimi & Partners Legal Consultants*\nSelect legal practice area:",
        listButton: "Practice Areas",
        rows: [
          { id: "l_corp", title: "🏢 Corporate & Commercial Law", description: "Company registration & contracts" },
          { id: "l_lit", title: "🏛️ Dispute Resolution & Courts", description: "Commercial litigation & arbitration" },
          { id: "l_real", title: "🏗️ Real Estate & Property", description: "Titles, leases & construction disputes" },
        ],
      }, 300, 180),
      n("n2", "QUESTION", { name: "case_summary", text: "Please provide a brief 1-2 sentence overview of your inquiry:", inputType: "text", required: true }, 300, 340),
      n("n3", "PAYMENT", { amount: 50, currency: "OMR", paymentDescription: "Initial Legal Advisory Session (45 Min)", text: "💳 Pay legal consultation retainer:" }, 300, 500),
      n("n4", "MESSAGE", { text: "⚖️ *Advisory Session Booked!*\n\nOur senior partner will connect via private encrypted video link at your scheduled time." }, 300, 660),
    ],
    edges: [e("e1", "trigger", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3"), e("e4", "n3", "n4")],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 4. E-COMMERCE & RETAIL STORE
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "woocommerce_store_catalog",
    name: "WooCommerce Smart Store & Cart Checkout",
    description: "Browse online catalog → Featured product card → Discount coupon validate → Instant AmwalPay checkout",
    emoji: "🛍️",
    category: "E-Commerce",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["shop", "store", "buy", "products", "order", "متجر", "تسوق"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "CATALOG", { categoryId: "all", productCount: 6, text: "🛍️ *Welcome to Our Online Store!*\nBrowse our best-selling products below:" }, 300, 180),
      n("n2", "PRODUCT", { productId: "latest", text: "🌟 *Today's Featured Deal:* Special 20% discount applied at checkout!" }, 300, 340),
      n("n3", "QUESTION", { name: "delivery_address", text: "📍 Please share your full delivery address and city in Oman:", inputType: "text", required: true }, 300, 500),
      n("n4", "PAYMENT", { amount: 25, currency: "OMR", paymentDescription: "WooCommerce Order Checkout", text: "💳 Tap below to pay securely and confirm order dispatch:" }, 300, 660),
      n("n5", "MESSAGE", { text: "📦 *Order Received!*\n\nYour items are being packed. Tracking number will be messaged within 2 hours." }, 300, 820),
    ],
    edges: [e("e1", "trigger", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3"), e("e4", "n3", "n4"), e("e5", "n4", "n5")],
  },
  {
    id: "perfume_fragrance_bot",
    name: "Luxury Arabic Perfume & Oud Quiz",
    description: "Fragrance taste quiz (Oud / Musk / Floral / Amber) → Personalized recommendation card → One-click purchase",
    emoji: "🏺",
    category: "E-Commerce",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["perfume", "oud", "fragrance", "attar", "musk", "عطر", "عود"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "MESSAGE", { text: "🏺 *Royal Omani Perfumes & Pure Dehn Al Oud*\nLet our fragrance sommelier find your signature scent in 2 quick questions!" }, 300, 180),
      n("n2", "BUTTONS", { text: "Which fragrance profile do you prefer?", buttons: [{ id: "p_oud", title: "🪵 Royal Smoky Oud" }, { id: "p_musk", title: "🌸 White Musk & Rose" }, { id: "p_amber", title: "👑 Golden Amber & Spice" }] }, 300, 340),
      n("n3", "PRODUCT", { productId: "latest", text: "✨ *Your Curated Match:* Royal Amouage Pure Oud Oil (12ml). Hand-distilled in Nizwa." }, 300, 500),
      n("n4", "PAYMENT", { amount: 48, currency: "OMR", paymentDescription: "Royal Fragrance Purchase", text: "💳 Order now with complimentary VIP gift box:" }, 300, 660),
      n("n5", "MESSAGE", { text: "🎁 *Thank you!* Your luxury fragrance order is on its way with free express delivery." }, 300, 820),
    ],
    edges: [e("e1", "trigger", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3"), e("e4", "n3", "n4"), e("e5", "n4", "n5")],
  },
  {
    id: "order_tracking_delivery",
    name: "Live Order Status & Courier Tracking",
    description: "Order # search → Real-time status (Preparing / Dispatched / Out for Delivery) → Courier direct contact",
    emoji: "🚚",
    category: "E-Commerce",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["track", "status", "where is my order", "delivery", "تتبع"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "QUESTION", { name: "order_id", text: "🚚 *Track Your Order*\n\nPlease enter your 6-digit Order Number (e.g. `#10492`):", inputType: "text", required: true }, 300, 180),
      n("n2", "MESSAGE", { text: "📦 *Order Status: OUT FOR DELIVERY*\n\n📍 *Courier:* Asyad Express Oman\n🛵 *Driver:* Tariq (+968 9123 4567)\n⏱️ *Estimated Delivery:* Today by 4:00 PM" }, 300, 340),
      n("n3", "BUTTONS", { text: "Need assistance with your delivery?", buttons: [{ id: "b_delay", title: "⏱️ Change Delivery Time" }, { id: "b_agent", title: "👤 Contact Support" }] }, 300, 500),
    ],
    edges: [e("e1", "trigger", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3")],
  },
  {
    id: "product_return_exchange",
    name: "Product Return & Exchange Proof Upload",
    description: "Automated RMA returns: Order # verification → Reason picker → Photo upload → Prepaid return label",
    emoji: "📦",
    category: "E-Commerce",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["return", "exchange", "refund", "damaged", "استرجاع", "تبديل"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "QUESTION", { name: "return_order", text: "📦 *Easy Returns & Exchanges*\n\nPlease enter your Order ID:", inputType: "text", required: true }, 300, 180),
      n("n2", "BUTTONS", { text: "What is the reason for return?", buttons: [{ id: "r_size", title: "📏 Size / Fit Issue" }, { id: "r_defect", title: "⚠️ Defective / Damaged" }, { id: "r_wrong", title: "📦 Wrong Item Received" }] }, 300, 340),
      n("n3", "QUESTION", { name: "product_photo", text: "📸 Please upload a photo of the item in its original packaging:", inputType: "image", required: true }, 300, 500),
      n("n4", "MESSAGE", { text: "✅ *Return Approved!*\n\nReturn RMA ID: `RET-8831`. Our courier will pick up the parcel tomorrow. Refund will process within 48h." }, 300, 660),
    ],
    edges: [e("e1", "trigger", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3"), e("e4", "n3", "n4")],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 5. DINING, RESTAURANT & HOSPITALITY
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "restaurant_table_menu",
    name: "Fine Dining Table Reservation & Menu",
    description: "Party size → Seating area (Indoor / Sea Terrace / Private Dining) → Date & Time → Instant reservation",
    emoji: "🍽️",
    category: "Dining & Hospitality",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["restaurant", "table", "dinner", "lunch", "menu", "reserve", "مطعم", "حجز طاولة"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "RESTAURANT", { text: "🍽️ *Welcome to Bait Al Luban Omani Dining Lounge*\nWould you like to reserve a table or view our seasonal menu?" }, 300, 180),
      n("n2", "QUESTION", { name: "party_size", text: "How many guests will be dining?", inputType: "select", options: ["2 Guests (Couple)", "3-4 Guests", "5-8 Family Table", "9+ Large Event"] }, 300, 340),
      n("n3", "BUTTONS", { text: "Preferred seating area:", buttons: [{ id: "t_indoor", title: "🏛️ Royal Indoor Hall" }, { id: "t_terrace", title: "🌊 Ocean Sea Terrace" }, { id: "t_vip", title: "👑 Private Majlis Room" }] }, 300, 500),
      n("n4", "APPOINTMENT", { appointmentText: "📅 Select reservation date & dining time:" }, 300, 660),
      n("n5", "MESSAGE", { text: "🥂 *Table Reserved!*\n\nWe look forward to hosting you. Table will be held for 15 minutes past reservation time." }, 300, 820),
    ],
    edges: [e("e1", "trigger", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3"), e("e4", "n3", "n4"), e("e5", "n4", "n5")],
  },
  {
    id: "hotel_room_chalet",
    name: "Resort Room & Mountain Chalet Booking",
    description: "Check-in/out dates → Room tier (Deluxe / Jacuzzi Villa / Chalet) → Guest count → Confirmation deposit",
    emoji: "🏨",
    category: "Dining & Hospitality",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["hotel", "room", "chalet", "resort", "stay", "jebel akhdar", "فندق", "شاليه"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "MESSAGE", { text: "🏔️ *Jebel Sifah Mountain & Beachfront Resort*\nEscape the city for a luxury weekend getaway in Oman." }, 300, 180),
      n("n2", "BUTTONS", { text: "Choose your accommodation style:", buttons: [{ id: "r_deluxe", title: "🏨 Deluxe Sea View (2 Pax)" }, { id: "r_pool", title: "🏊 Private Pool Villa (4 Pax)" }, { id: "r_chalet", title: "🏔️ Mountain Chalet (6 Pax)" }] }, 300, 340),
      n("n3", "QUESTION", { name: "checkin_date", text: "📅 Select your check-in date:", inputType: "date", required: true }, 300, 500),
      n("n4", "PAYMENT", { amount: 75, currency: "OMR", paymentDescription: "Resort Stay 1-Night Deposit", text: "💳 Pay 1st night deposit to guarantee room reservation:" }, 300, 660),
      n("n5", "MESSAGE", { text: "🔑 *Reservation Confirmed!*\n\nCheck-in time: 3:00 PM. Digital room key will be issued upon arrival." }, 300, 820),
    ],
    edges: [e("e1", "trigger", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3"), e("e4", "n3", "n4"), e("e5", "n4", "n5")],
  },
  {
    id: "vip_event_ticketing",
    name: "VIP Concert & Festival Ticketing",
    description: "Seat zone selection (VIP Lounge / Golden Circle / General) → Ticket quantity → Instant QR code dispatch",
    emoji: "🎟️",
    category: "Dining & Hospitality",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["event", "ticket", "concert", "festival", "show", "تذاكر", "فعالية"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "MESSAGE", { text: "🎭 *Muscat International Arts & Music Festival*\nLive at Royal Opera House grounds." }, 300, 180),
      n("n2", "BUTTONS", { text: "Select your ticket tier:", buttons: [{ id: "t_general", title: "🎟️ General (15 OMR)" }, { id: "t_gold", title: "🌟 Gold Circle (35 OMR)" }, { id: "t_vip", title: "👑 VIP Backstage (75 OMR)" }] }, 300, 340),
      n("n3", "QUESTION", { name: "ticket_qty", text: "How many tickets would you like to purchase?", inputType: "select", options: ["1 Ticket", "2 Tickets", "3 Tickets", "4 Tickets", "5+ Group"] }, 300, 500),
      n("n4", "PAYMENT", { amount: 35, currency: "OMR", paymentDescription: "Festival Entry Tickets", text: "💳 Pay securely via AmwalPay:" }, 300, 660),
      n("n5", "MESSAGE", { text: "🎟️ *Your E-Tickets are Ready!*\n\nPresent your QR code voucher at Gate B for express VIP admission." }, 300, 820),
    ],
    edges: [e("e1", "trigger", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3"), e("e4", "n3", "n4"), e("e5", "n4", "n5")],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 6. CRM, AI & CUSTOMER SUPPORT
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "ai_smart_concierge",
    name: "24/7 AI Smart Concierge & Knowledge QA",
    description: "GPT AI Assistant responding dynamically from your business knowledge base with smooth human agent handoff",
    emoji: "🤖",
    category: "CRM & AI",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["help", "info", "question", "assistant", "ai", "مساعدة"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "AI", { instruction: "You are a warm, professional concierge for our business in Oman. Answer customer queries accurately using our knowledge base.", useKnowledge: true }, 300, 180),
      n("n2", "BUTTONS", { text: "Did that answer your question?", buttons: [{ id: "b_yes", title: "✅ Yes, thank you!" }, { id: "b_human", title: "👤 Talk to Live Agent" }] }, 300, 340),
      n("n3", "HANDOFF", {}, 450, 500),
      n("n4", "MESSAGE", { text: "Thank you for contacting us! Have a wonderful day." }, 150, 500),
    ],
    edges: [e("e1", "trigger", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n4"), e("e4", "n2", "n3")],
  },
  {
    id: "nps_feedback_reviews",
    name: "Customer Satisfaction (CSAT) & Google Review Booster",
    description: "1-5 Star rating collector: 5-star ratings route to Google Review link; low ratings alert manager for recovery",
    emoji: "⭐",
    category: "CRM & AI",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["review", "feedback", "rating", "survey", "تقييم"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "BUTTONS", { text: "⭐ *How was your recent experience with us?*\nPlease rate our service:", buttons: [{ id: "star_5", title: "⭐⭐⭐⭐⭐ Outstanding" }, { id: "star_4", title: "⭐⭐⭐⭐ Good" }, { id: "star_low", title: "⭐ Needs Improvement" }] }, 300, 180),
      n("n2", "CONDITION", { field: "message", op: "contains", value: "star_5" }, 300, 340),
      n("n3", "CTA_URL", { text: "🌟 *Thank you so much!*\nCould you take 30 seconds to share your kind review on Google Maps?", buttonText: "Review us on Google", url: "https://g.page/review" }, 150, 500),
      n("n4", "QUESTION", { name: "feedback_detail", text: "We are truly sorry to hear that. What could we have done better?", inputType: "text", required: true }, 450, 500),
      n("n5", "HANDOFF", {}, 450, 660),
    ],
    edges: [e("e1", "trigger", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3", "true"), e("e4", "n2", "n4", "false"), e("e5", "n4", "n5")],
  },
  {
    id: "b2b_lead_qualification",
    name: "B2B High-Ticket Lead Qualification & CRM Sync",
    description: "Company name → Team size → Budget threshold → VIP CRM tagging → Executive sales rep notification",
    emoji: "💼",
    category: "CRM & AI",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["partner", "corporate", "b2b", "enterprise", "quote", "شركات"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "QUESTION", { name: "company_name", text: "💼 *Corporate & Enterprise Partnerships*\n\nPlease state your Company or Organization Name:", inputType: "text", required: true }, 300, 180),
      n("n2", "QUESTION", { name: "annual_budget", text: "What is your estimated project budget?", inputType: "select", options: ["1,000 – 5,000 OMR", "5,000 – 20,000 OMR", "20,000 – 50,000+ OMR (Enterprise)"] }, 300, 340),
      n("n3", "TAG", { value: "enterprise_lead" }, 300, 500),
      n("n4", "SAVE", {}, 300, 660),
      n("n5", "MESSAGE", { text: "💼 *Proposal Request Registered!*\n\nOur Head of Corporate Partnerships will contact you within 4 business hours." }, 300, 820),
    ],
    edges: [e("e1", "trigger", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3"), e("e4", "n3", "n4"), e("e5", "n4", "n5")],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // LIVE-DATA TEMPLATES
  //
  // Every template above is written entirely in static text. The runtime loads
  // ~35 live values before each node (see flow-runtime-data.ts) and, until
  // these, not one template referenced a single token — so a returning customer
  // was greeted exactly like a stranger and had to type an order number the
  // system already knew. These are the worked examples: each one answers from
  // the customer's own record before it asks them anything.
  //
  // Tokens are empty strings when there is nothing to show, so every flow
  // branches on a CONDITION first rather than sending "Hello , your order  is".
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "live_my_booking_status",
    name: "My Booking — Live Status & Payment",
    description: "Recognises the customer, reads their latest booking from the workspace, and answers status and payment without asking for a reference",
    emoji: "📦",
    category: "Tours & Travel",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["my booking", "booking status", "my order", "where is my", "حجزي"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "CONDITION", { field: "has_open_order", op: "gt", value: "0" }, 300, 180),
      n("n2", "MESSAGE", { text: "Hello {{customer.name}} 👋\n\n*Your latest booking*\nReference: {{order.latest.number}}\nStatus: {{order.latest.status}}\nPayment: {{order.latest.payment_status}}\nTotal: {{order.latest.total}} {{customer.currency}}" }, 140, 340),
      n("n3", "BUTTONS", { text: "Anything else I can help with?", buttons: [{ id: "b_change", title: "📅 Change the date" }, { id: "b_invoice", title: "🧾 Send invoice" }, { id: "b_agent", title: "👤 Talk to someone" }] }, 140, 500),
      n("n4", "MESSAGE", { text: "You have no active bookings with us right now, {{customer.name}}. Would you like to see what is available?" }, 480, 340),
      n("n5", "TOUR", { text: "Here is what we are running at the moment:" }, 480, 500),
      n("n6", "HANDOFF", {}, 140, 660),
    ],
    edges: [
      e("e1", "trigger", "n1"), e("e2", "n1", "n2", "yes"), e("e3", "n1", "n4", "no"),
      e("e4", "n2", "n3"), e("e5", "n4", "n5"), e("e6", "n3", "n6"),
    ],
  },
  {
    id: "live_patient_next_visit",
    name: "Patient — My Next Visit & Bed",
    description: "Reads the patient record by mobile number and replies with the next treatment or appointment, doctor, session and bed",
    emoji: "🏥",
    category: "Healthcare",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["my appointment", "next visit", "my treatment", "my bed", "موعدي"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "CONDITION", { field: "hospital.patient.mrn", op: "contains", value: "MRN" }, 300, 180),
      n("n2", "CONDITION", { field: "hospital.next_booking.reference", op: "contains", value: "-" }, 140, 340),
      n("n3", "MESSAGE", { text: "🏥 *{{hospital.patient.name}}* (MRN {{hospital.patient.mrn}})\n\nYour next {{hospital.next_booking.type}}\nReference: {{hospital.next_booking.reference}}\nDate: {{hospital.next_booking.date}}\nDoctor: {{hospital.next_booking.doctor}}\nSession: {{hospital.next_booking.session}}\nBed: {{hospital.next_booking.bed}}\nStatus: {{hospital.next_booking.status}}" }, 40, 500),
      n("n4", "BUTTONS", { text: "What would you like to do?", buttons: [{ id: "h_resched", title: "🔄 Reschedule" }, { id: "h_directions", title: "📍 Directions" }, { id: "h_desk", title: "👤 Call the desk" }] }, 40, 660),
      n("n5", "MESSAGE", { text: "Welcome back {{hospital.patient.name}}. You have no upcoming visit booked. Shall I check what is available?" }, 300, 500),
      n("n6", "HOSPITAL_AVAILABILITY", {}, 300, 660),
      n("n7", "HOSPITAL", { text: "I could not find a patient record for this number. Let us get you registered first." }, 520, 340),
    ],
    edges: [
      e("e1", "trigger", "n1"), e("e2", "n1", "n2", "yes"), e("e3", "n1", "n7", "no"),
      e("e4", "n2", "n3", "yes"), e("e5", "n2", "n5", "no"),
      e("e6", "n3", "n4"), e("e7", "n5", "n6"),
    ],
  },
  {
    id: "live_kitchen_order_track",
    name: "Kitchen Order — Live Tracking",
    description: "Finds the customer's open kitchen order by phone number and reports its status, with the menu as the fallback",
    emoji: "🍲",
    category: "Dining & Hospitality",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["my food", "order status", "where is my food", "طلبي"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "CONDITION", { field: "restaurant.latest.order_id", op: "contains", value: "c" }, 300, 180),
      n("n2", "RESTAURANT_ORDER_STATUS", {}, 140, 340),
      n("n3", "MESSAGE", { text: "Thanks {{customer.name}} — that is {{restaurant.latest.total}} {{restaurant.latest.currency}}, currently *{{restaurant.latest.status}}*. We will message you the moment it leaves the kitchen." }, 140, 500),
      n("n4", "MESSAGE", { text: "No open order on this number, {{customer.name}}. Here is tonight's menu 👇" }, 480, 340),
      n("n5", "RESTAURANT_MENU", {}, 480, 500),
    ],
    edges: [
      e("e1", "trigger", "n1"), e("e2", "n1", "n2", "yes"), e("e3", "n1", "n4", "no"),
      e("e4", "n2", "n3"), e("e5", "n4", "n5"),
    ],
  },
  {
    id: "live_returning_concierge",
    name: "Returning Customer — AI Concierge",
    description: "Greets by name, adapts to how much the customer has bought before, and answers freely with the workspace knowledge base",
    emoji: "🤖",
    category: "CRM & AI",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["hello", "hallo", "salam", "مرحبا", "help"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "CONDITION", { field: "order_count", op: "gt", value: "2" }, 300, 180),
      n("n2", "MESSAGE", { text: "Welcome back {{customer.name}} 🌟 Always good to hear from you." }, 140, 340),
      n("n3", "MESSAGE", { text: "Hello {{customer.name}} 👋 How can I help today?" }, 480, 340),
      n("n4", "AI", { instruction: "Answer the customer using the workspace knowledge base and the live context provided. Their name, language, currency and their most recent order, appointment, restaurant order and hospital record are all in context — use them instead of asking for details the workspace already holds. If the question needs a human, say so plainly.", useKnowledge: true }, 300, 500),
      n("n5", "BUTTONS", { text: "Did that answer it?", buttons: [{ id: "ai_yes", title: "✅ Yes, thanks" }, { id: "ai_human", title: "👤 Talk to a person" }] }, 300, 660),
      n("n6", "HANDOFF", {}, 300, 820),
    ],
    edges: [
      e("e1", "trigger", "n1"), e("e2", "n1", "n2", "yes"), e("e3", "n1", "n3", "no"),
      e("e4", "n2", "n4"), e("e5", "n3", "n4"), e("e6", "n4", "n5"), e("e7", "n5", "n6"),
    ],
  },
  {
    id: "live_tour_availability",
    name: "Tour Availability — Live Dates & Seats",
    description: "Lists the workspace's real tours, shows details, then checks live seat availability for the customer's chosen date",
    emoji: "🗓️",
    category: "Tours & Travel",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["availability", "available dates", "free seats", "book a tour", "المتاح"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 300, 40),
      n("n1", "MESSAGE", { text: "Let me check what we have for you, {{customer.name}} 🗺️" }, 300, 180),
      n("n2", "TOUR", { text: "Our current departures:" }, 300, 340),
      n("n3", "TOUR_DETAILS", {}, 300, 500),
      n("n4", "TOUR_AVAIL", {}, 300, 660),
      n("n5", "HANDOFF", {}, 300, 820),
    ],
    edges: [
      e("e1", "trigger", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3"),
      e("e4", "n3", "n4"), e("e5", "n4", "n5"),
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // GENERIC HOSPITAL — the flow drawn in the customer's diagram, unbranded so a
  // tenant can adopt it without editing every message. The heavy lifting is
  // delegated to hospital-booking-flow.ts, which already implements department →
  // doctor → date → live slots for appointments, and doctor → date → ward → bed
  // grid with a five-minute hold for chemotherapy. Rebuilding that as QUESTION
  // nodes would duplicate it and drift.
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "hospital_appointments_chemo_beds",
    name: "Hospital — Appointments, Chemo Day Care & Bed Booking",
    description: "Main menu → patient identification → doctor appointment with live slots, or chemotherapy day care with real bed availability and a held bed → my bookings → help",
    emoji: "🏥",
    category: "Healthcare",
    trigger: "KEYWORD",
    triggerConfig: { keywords: ["hospital", "appointment", "doctor", "chemo", "chemotherapy", "bed", "مستشفى", "موعد"], matchType: "contains" },
    nodes: [
      n("trigger", "TRIGGER", {}, 380, 40),
      n("menu", "LIST", {
        header: "How can we help?",
        text: "👋 Welcome. Please choose an option below.",
        listButton: "Choose",
        rows: [
          { id: "h_doctor", title: "Book Doctor Appointment", description: "Consult a specialist" },
          { id: "h_chemo", title: "Book Chemotherapy Day Care", description: "Reserve a day-care bed" },
          { id: "h_mine", title: "My Bookings", description: "View, reschedule or cancel" },
          { id: "h_contact", title: "Contact Hospital", description: "Speak to the desk" },
        ],
      }, 380, 180),

      // ── Patient identification ────────────────────────────────────────────
      // Skipped entirely when the number already matches a patient record: the
      // workspace knows who this is, and asking anyway is the thing that makes
      // a bot feel like a form.
      n("known", "CONDITION", { field: "hospital.patient.mrn", op: "contains", value: "MRN" }, 380, 340),
      n("welcome_back", "MESSAGE", { text: "Welcome back *{{hospital.patient.name}}* 🙏\nMRN: {{hospital.patient.mrn}}\nMobile: {{hospital.patient.mobile}}" }, 180, 500),
      n("register", "HOSPITAL", { text: "Let us find your record. Please reply with your *mobile number*, or your *MRN / Patient ID* if you have it." }, 620, 500),

      // ── A. Doctor appointment ─────────────────────────────────────────────
      n("doctor", "HOSP_DOCTOR", {}, 100, 680),
      n("doctor_done", "MESSAGE", { text: "✅ *Appointment confirmed*\n\n{{hospital.patient.name}} · MRN {{hospital.patient.mrn}}\nReference: {{hospital.next_booking.reference}}\nDoctor: {{hospital.next_booking.doctor}}\nDate: {{hospital.next_booking.date}}\n\nYou will receive a reminder before your appointment." }, 100, 840),

      // ── B. Chemotherapy day care ──────────────────────────────────────────
      n("chemo", "HOSP_CHEMO", {}, 340, 680),
      n("chemo_done", "MESSAGE", { text: "✅ *Chemotherapy day care confirmed*\n\n{{hospital.patient.name}} · MRN {{hospital.patient.mrn}}\nReference: {{hospital.next_booking.reference}}\nDoctor: {{hospital.next_booking.doctor}}\nSession: {{hospital.next_booking.session}}\nBed: {{hospital.next_booking.bed}}\nDate: {{hospital.next_booking.date}}\n\nPlease arrive 30 minutes before your treatment." }, 340, 840),

      // ── C. My bookings ────────────────────────────────────────────────────
      n("has_booking", "CONDITION", { field: "hospital.next_booking.reference", op: "contains", value: "-" }, 580, 680),
      n("mine", "MESSAGE", { text: "📋 *Your upcoming booking*\n\nType: {{hospital.next_booking.type}}\nReference: {{hospital.next_booking.reference}}\nDate: {{hospital.next_booking.date}}\nDoctor: {{hospital.next_booking.doctor}}\nBed: {{hospital.next_booking.bed}}\nStatus: {{hospital.next_booking.status}}" }, 520, 840),
      n("mine_actions", "BUTTONS", {
        text: "What would you like to do?",
        buttons: [
          { id: "m_resched", title: "🔄 Reschedule" },
          { id: "m_cancel", title: "❌ Cancel" },
          { id: "m_desk", title: "👤 Contact desk" },
        ],
      }, 520, 1000),
      n("none", "MESSAGE", { text: "You have no upcoming bookings. Would you like to see what is available?" }, 760, 840),
      n("avail", "HOSPITAL_AVAILABILITY", {}, 760, 1000),

      // ── D. Beds & help ────────────────────────────────────────────────────
      n("beds", "HOSP_BED_MAP", {}, 980, 680),
      n("desk", "HANDOFF", {}, 760, 1160),
    ],
    edges: [
      e("e1", "trigger", "menu"),
      e("e2", "menu", "known"),
      e("e3", "known", "welcome_back", "yes"),
      e("e4", "known", "register", "no"),
      e("e5", "welcome_back", "doctor", "Book Doctor Appointment"),
      e("e6", "welcome_back", "chemo", "Book Chemotherapy Day Care"),
      e("e7", "welcome_back", "has_booking", "My Bookings"),
      e("e8", "welcome_back", "beds", "Bed availability"),
      e("e9", "register", "doctor"),
      e("e10", "doctor", "doctor_done"),
      e("e11", "chemo", "chemo_done"),
      e("e12", "has_booking", "mine", "yes"),
      e("e13", "has_booking", "none", "no"),
      e("e14", "mine", "mine_actions"),
      e("e15", "none", "avail"),
      e("e16", "mine_actions", "desk"),
      e("e17", "avail", "desk"),
    ],
  },
]
