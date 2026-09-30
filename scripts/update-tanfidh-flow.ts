import { db } from "@/lib/db"

async function main() {
  const flowId = "cmuli51p500aqi3rj8kepufa1"
  const tenantId = "cmujurq9w005ci36afzax588l"

  const nodes = [
    {
      id: "trigger",
      type: "TRIGGER",
      data: {},
      x: 400,
      y: 50
    },
    {
      id: "greeting",
      type: "BUTTONS",
      data: {
        text: "Welcome to Tanfidh Management Consultants 👋\nExecutive Strategy & Corporate Transformation Advisors.\n\nExplore our executive masterclasses or reserve your seats below:",
        buttons: [
          { id: "btn_courses", title: "Browse Courses" },
          { id: "btn_fees", title: "Fees & Offers" },
          { id: "btn_support", title: "Executive Support" }
        ]
      },
      x: 400,
      y: 180
    },
    {
      id: "courses_list",
      type: "LIST",
      data: {
        text: "🎓 *Tanfidh Executive Masterclasses (2026 Schedule)*\nSelect a program below to choose your cohort date and reserve seats under the Buy 1 Get 1 Free (BOGO) offer:",
        listButton: "Select Course",
        header: "Available Programs",
        rows: [
          { id: "course_bsc", title: "AI Balanced Scorecard", description: "OMR 500 · 2 Days · Sheraton Muscat · BOGO Free" },
          { id: "course_strategy", title: "AI Strategy Pro", description: "OMR 500 · 2 Days · Sheraton Muscat · BOGO Free" },
          { id: "course_kpi", title: "AI KPI Professional", description: "OMR 750 · 3 Days · Sheraton Muscat · BOGO Free" },
          { id: "course_perf", title: "Performance Mgmt Pro", description: "OMR 500 · 2 Days · Sheraton Muscat · BOGO Free" },
          { id: "course_exec", title: "Strategy Execution", description: "OMR 500 · 2 Days · Sheraton Muscat · BOGO Free" }
        ]
      },
      x: 400,
      y: 360
    },

    // ─── Slot / Date Selection Nodes ───
    {
      id: "slot_bsc",
      type: "BUTTONS",
      data: {
        text: "📅 *AI-Powered Balanced Scorecard Professional*\nChoose your preferred masterclass cohort date at the *Sheraton Oman Hotel, Muscat* (08:30–16:30):",
        buttons: [
          { id: "slot_bsc_1", title: "13–14 Oct 2026" },
          { id: "slot_bsc_2", title: "14–15 Dec 2026" },
          { id: "btn_courses", title: "Back to Courses" }
        ]
      },
      x: 100,
      y: 550
    },
    {
      id: "slot_strategy",
      type: "BUTTONS",
      data: {
        text: "📅 *AI-Powered Certified Strategy Professional*\nChoose your preferred masterclass cohort date at the *Sheraton Oman Hotel, Muscat* (08:30–16:30):",
        buttons: [
          { id: "slot_str_1", title: "26–27 Oct 2026" },
          { id: "slot_str_2", title: "21–22 Dec 2026" },
          { id: "btn_courses", title: "Back to Courses" }
        ]
      },
      x: 350,
      y: 550
    },
    {
      id: "slot_kpi",
      type: "BUTTONS",
      data: {
        text: "📅 *AI-Powered Certified KPI Professional*\nChoose your preferred masterclass cohort date at the *Sheraton Oman Hotel, Muscat* (08:30–16:30, 3 Days):",
        buttons: [
          { id: "slot_kpi_1", title: "15–17 Nov 2026" },
          { id: "slot_kpi_2", title: "1–3 Dec 2026" },
          { id: "btn_courses", title: "Back to Courses" }
        ]
      },
      x: 600,
      y: 550
    },
    {
      id: "slot_perf",
      type: "BUTTONS",
      data: {
        text: "📅 *AI-Powered Performance Management Professional*\nChoose your preferred masterclass cohort date at the *Sheraton Oman Hotel, Muscat* (08:30–16:30):",
        buttons: [
          { id: "slot_pmp_1", title: "19–20 Oct 2026" },
          { id: "slot_pmp_2", title: "25–26 Nov 2026" },
          { id: "btn_courses", title: "Back to Courses" }
        ]
      },
      x: 850,
      y: 550
    },
    {
      id: "slot_exec",
      type: "BUTTONS",
      data: {
        text: "📅 *AI-Powered Strategy Execution Professional*\nChoose your preferred masterclass cohort date at the *Sheraton Oman Hotel, Muscat* (08:30–16:30):",
        buttons: [
          { id: "slot_sep_1", title: "9–10 Nov 2026" },
          { id: "slot_sep_2", title: "14–15 Dec 2026" },
          { id: "btn_courses", title: "Back to Courses" }
        ]
      },
      x: 1100,
      y: 550
    },

    // ─── Course Overview / Confirmation Cards ───
    {
      id: "card_bsc",
      type: "BUTTONS",
      data: {
        text: "🎓 *AI-Powered Certified Balanced Scorecard Professional*\n\n📅 *Schedule:* 13–14 Oct / 14–15 Dec 2026 (08:30–16:30)\n📍 *Venue:* Sheraton Oman Hotel, Ruwi Financial District, Muscat\n👨‍💼 *Lead Advisor:* Said Al Harthi (Managing Consultant)\n💰 *Investment:* OMR 500 per participant\n🎁 *Special Offer:* Pay for 1 seat, get 1 seat 100% FREE (BOGO)\n\n✨ *Executive Inclusions:*\n• 2 Full Days Masterclass & Hands-on AI Scorecard Modeling Lab\n• Complete Toolkit with Excel & PowerBI BSC Templates\n• 5-Star Sheraton Executive Lunches & Refreshment Breaks\n• 2 Individual Verified Credentials with Cryptographic QR Code\n\nReserve your seats below:",
        buttons: [
          { id: "btn_book", title: "Book My seat" },
          { id: "btn_fees", title: "Fees & Offers" },
          { id: "btn_courses", title: "Back to Courses" }
        ]
      },
      x: 100,
      y: 750
    },
    {
      id: "card_strategy",
      type: "BUTTONS",
      data: {
        text: "🎓 *AI-Powered Certified Strategy Professional*\n\n📅 *Schedule:* 26–27 Oct / 21–22 Dec 2026 (08:30–16:30)\n📍 *Venue:* Sheraton Oman Hotel, Ruwi Financial District, Muscat\n👨‍💼 *Lead Advisor:* Said Al Harthi (Managing Consultant)\n💰 *Investment:* OMR 500 per participant\n🎁 *Special Offer:* Pay for 1 seat, get 1 seat 100% FREE (BOGO)\n\n✨ *Executive Inclusions:*\n• 2 Full Days Strategic Visioning & AI Competitive Intelligence\n• Executive Strategy Blueprint & Formulation Toolkit\n• 5-Star Sheraton Executive Lunches & Refreshments\n• 2 Individual Verified Strategy Credentials\n\nReserve your seats below:",
        buttons: [
          { id: "btn_book", title: "Book My seat" },
          { id: "btn_fees", title: "Fees & Offers" },
          { id: "btn_courses", title: "Back to Courses" }
        ]
      },
      x: 350,
      y: 750
    },
    {
      id: "card_kpi",
      type: "BUTTONS",
      data: {
        text: "🎓 *AI-Powered Certified KPI Professional*\n\n📅 *Schedule:* 15–17 Nov / 1–3 Dec 2026 (08:30–16:30, 3 Days)\n📍 *Venue:* Sheraton Oman Hotel, Ruwi Financial District, Muscat\n👨‍💼 *Lead Advisor:* Said Al Harthi (Managing Consultant)\n💰 *Investment:* OMR 750 per participant\n🎁 *Special Offer:* Pay for 1 seat, get 1 seat 100% FREE (BOGO)\n\n✨ *Executive Inclusions:*\n• 3 Full Days KPI Architecture, Cascading & Data Validation\n• Comprehensive Corporate KPI Dictionary & Dashboard Toolkit\n• 5-Star Sheraton Executive Lunches & Refreshments\n• 2 Individual Verified KPI Credentials\n\nReserve your seats below:",
        buttons: [
          { id: "btn_book", title: "Book My seat" },
          { id: "btn_fees", title: "Fees & Offers" },
          { id: "btn_courses", title: "Back to Courses" }
        ]
      },
      x: 600,
      y: 750
    },
    {
      id: "card_perf",
      type: "BUTTONS",
      data: {
        text: "🎓 *AI-Powered Certified Performance Management Professional*\n\n📅 *Schedule:* 19–20 Oct / 25–26 Nov 2026 (08:30–16:30)\n📍 *Venue:* Sheraton Oman Hotel, Ruwi Financial District, Muscat\n👨‍💼 *Lead Advisor:* Said Al Harthi (Managing Consultant)\n💰 *Investment:* OMR 500 per participant\n🎁 *Special Offer:* Pay for 1 seat, get 1 seat 100% FREE (BOGO)\n\n✨ *Executive Inclusions:*\n• 2 Full Days Performance Contracts, Appraisals & Feedback\n• Organizational Performance Review Rubrics & Governance Toolkit\n• 5-Star Sheraton Executive Lunches & Refreshments\n• 2 Individual Verified Performance Management Credentials\n\nReserve your seats below:",
        buttons: [
          { id: "btn_book", title: "Book My seat" },
          { id: "btn_fees", title: "Fees & Offers" },
          { id: "btn_courses", title: "Back to Courses" }
        ]
      },
      x: 850,
      y: 750
    },
    {
      id: "card_exec",
      type: "BUTTONS",
      data: {
        text: "🎓 *AI-Powered Certified Strategy Execution Professional*\n\n📅 *Schedule:* 9–10 Nov / 14–15 Dec 2026 (08:30–16:30)\n📍 *Venue:* Sheraton Oman Hotel, Ruwi Financial District, Muscat\n👨‍💼 *Lead Advisor:* Said Al Harthi (Managing Consultant)\n💰 *Investment:* OMR 500 per participant\n🎁 *Special Offer:* Pay for 1 seat, get 1 seat 100% FREE (BOGO)\n\n✨ *Executive Inclusions:*\n• 2 Full Days Strategy Sequencing, Initiative PMO & AI Bottleneck Forecasting\n• Initiative Charters, Critical Path Calculators & Risk Heatmaps\n• 5-Star Sheraton Executive Lunches & Refreshments\n• 2 Individual Verified Strategy Execution Credentials\n\nReserve your seats below:",
        buttons: [
          { id: "btn_book", title: "Book My seat" },
          { id: "btn_fees", title: "Fees & Offers" },
          { id: "btn_courses", title: "Back to Courses" }
        ]
      },
      x: 1100,
      y: 750
    },

    // ─── Shared Information Nodes ───
    {
      id: "fees_view",
      type: "BUTTONS",
      data: {
        text: "💳 *Masterclass Investment & Executive Offers*\n\n• *2-Day Masterclasses:* OMR 500 per delegate\n• *3-Day Certified KPI Program:* OMR 750 per delegate\n• *Special Offer:* Pay for 1 seat, get 1 seat 100% FREE (Buy 1 Get 1 Free)\n• *Corporate Nominations (3+ seats):* Custom enterprise packages available\n\n🎁 *Offer Benefits:*\nRegister 1 paid delegate and bring a colleague or team member at ZERO additional cost. Both attendees receive full masterclass access, executive toolkit, 5-star hotel lunches, and individual verifiable credentials.\n\n🏦 *Payment Terms:* Direct Corporate Bank Transfer / Wire (Official Tax Invoice provided).",
        buttons: [
          { id: "btn_courses", title: "Browse Courses" },
          { id: "btn_support", title: "Executive Support" }
        ]
      },
      x: -150,
      y: 450
    },
    {
      id: "contact_view",
      type: "BUTTONS",
      data: {
        text: "🤝 *Tanfidh Executive Strategy Advisory*\n\nOur consulting team is at your disposal:\n\n📞 *Direct Line / WhatsApp:* +968 7178 4454 / +968 9935 5438\n✉️ *Email:* saidalharthy@tanfidh.com\n🌐 *Website:* www.tanfidh.com\n📍 *Headquarters:* Ruwi Financial District, Muscat, Sultanate of Oman\n\nAn advisor has been notified. You can also type your inquiries directly here, and our AI & consulting advisors will assist you.",
        buttons: [
          { id: "btn_courses", title: "Browse Courses" }
        ]
      },
      x: -150,
      y: 650
    },

    // ─── Delegate Registration & Data Collection ───
    {
      id: "ask_name",
      type: "QUESTION",
      data: {
        text: "To reserve your seats, please provide the *Full Name* and *Organization / Company* of the Primary Delegate:",
        name: "full_name",
        inputType: "text",
        required: true
      },
      x: 500,
      y: 1000
    },
    {
      id: "ask_email",
      type: "QUESTION",
      data: {
        text: "Thank you! What is your official *Corporate Email Address* for booking confirmation & materials?",
        name: "email",
        inputType: "email",
        required: true
      },
      x: 500,
      y: 1150
    },
    {
      id: "ask_phone",
      type: "QUESTION",
      data: {
        text: "What is your direct *Mobile / WhatsApp Number* (or reply *same* to use this WhatsApp number)?",
        name: "mobile_number",
        inputType: "phone",
        required: true
      },
      x: 500,
      y: 1300
    },
    {
      id: "ask_second_name",
      type: "QUESTION",
      data: {
        text: "🎁 *Buy 1 Get 1 Free (BOGO) Offer Applied!*\n\nPlease provide the *Full Name* of the 2nd Attendee joining you at zero extra charge (or reply *skip* to nominate later):",
        name: "second_full_name",
        inputType: "text",
        required: false
      },
      x: 500,
      y: 1450
    },
    {
      id: "ask_second_email",
      type: "QUESTION",
      data: {
        text: "Please provide the *Corporate Email Address* of the 2nd Attendee (or reply *skip*):",
        name: "second_email",
        inputType: "email",
        required: false
      },
      x: 500,
      y: 1600
    },

    // ─── Payment Instructions & Confirmation ───
    {
      id: "payment_instructions",
      type: "BUTTONS",
      data: {
        text: "🏦 *Official Bank Transfer & Corporate Invoice*\n\nThank you, *{{full_name}}*! Your booking request has been provisionally recorded.\n\n*Delegates Reserved:* 2 Participants (1 Paid + 1 Free Seat)\n• Primary Delegate: {{full_name}} ({{email}})\n• 2nd Attendee: {{second_full_name}}\n\n*Bank Account Details (Bank Muscat):*\n• Beneficiary Name: Tanfidh Management Consultants\n• Bank: Bank Muscat (Corporate Branch)\n• Account Number: 0315012345670019\n• IBAN: OM35BMUS0315012345670019\n\n📸 *Final Step:* Please make the transfer and reply directly here with a **screenshot of your payment confirmation / transfer slip** to receive your official Tax Invoice and QR Check-in Pass.",
        buttons: [
          { id: "btn_upload", title: "Upload Receipt" },
          { id: "btn_support", title: "Executive Support" }
        ]
      },
      x: 500,
      y: 1780
    },
    {
      id: "payment_receipt",
      type: "QUESTION",
      data: {
        text: "Please attach and send your payment confirmation screenshot or transfer slip below:",
        name: "payment_receipt",
        inputType: "image",
        required: true
      },
      x: 500,
      y: 1950
    },
    {
      id: "thank_you_receipt",
      type: "MESSAGE",
      data: {
        text: "✅ *Thank you, {{full_name}}!*\n\nWe have safely received your payment receipt.\n\n⏳ Our finance and admissions team is currently reviewing and verifying the bank transfer.\n\nOnce verified, you will receive:\n1. Official Tax Invoice & Payment Receipt (Paid Balance Verified)\n2. Confirmed Seat Allocation & Attendance Voucher\n3. Digital QR Check-In Access Code\n\nIf you need any immediate assistance, our team is right here to help!"
      },
      x: 500,
      y: 2120
    },
    {
      id: "end_flow",
      type: "END",
      data: {},
      x: 500,
      y: 2280
    }
  ]

  const edges = [
    { id: "e_trig", source: "trigger", target: "greeting" },

    // Greeting branch
    { id: "e_gr_courses", source: "greeting", target: "courses_list", label: "Browse Courses" },
    { id: "e_gr_fees", source: "greeting", target: "fees_view", label: "Fees & Offers" },
    { id: "e_gr_sup", source: "greeting", target: "contact_view", label: "Executive Support" },

    // Courses List -> Slots
    { id: "e_list_bsc", source: "courses_list", target: "slot_bsc", label: "AI Balanced Scorecard" },
    { id: "e_list_str", source: "courses_list", target: "slot_strategy", label: "AI Strategy Pro" },
    { id: "e_list_kpi", source: "courses_list", target: "slot_kpi", label: "AI KPI Professional" },
    { id: "e_list_perf", source: "courses_list", target: "slot_perf", label: "Performance Mgmt Pro" },
    { id: "e_list_exec", source: "courses_list", target: "slot_exec", label: "Strategy Execution" },

    // Slot BSC -> Card BSC
    { id: "e_slot_bsc_1", source: "slot_bsc", target: "card_bsc", label: "13–14 Oct 2026" },
    { id: "e_slot_bsc_2", source: "slot_bsc", target: "card_bsc", label: "14–15 Dec 2026" },
    { id: "e_slot_bsc_back", source: "slot_bsc", target: "courses_list", label: "Back to Courses" },

    // Slot Strategy -> Card Strategy
    { id: "e_slot_str_1", source: "slot_strategy", target: "card_strategy", label: "26–27 Oct 2026" },
    { id: "e_slot_str_2", source: "slot_strategy", target: "card_strategy", label: "21–22 Dec 2026" },
    { id: "e_slot_str_back", source: "slot_strategy", target: "courses_list", label: "Back to Courses" },

    // Slot KPI -> Card KPI
    { id: "e_slot_kpi_1", source: "slot_kpi", target: "card_kpi", label: "15–17 Nov 2026" },
    { id: "e_slot_kpi_2", source: "slot_kpi", target: "card_kpi", label: "1–3 Dec 2026" },
    { id: "e_slot_kpi_back", source: "slot_kpi", target: "courses_list", label: "Back to Courses" },

    // Slot Perf -> Card Perf
    { id: "e_slot_pmp_1", source: "slot_perf", target: "card_perf", label: "19–20 Oct 2026" },
    { id: "e_slot_pmp_2", source: "slot_perf", target: "card_perf", label: "25–26 Nov 2026" },
    { id: "e_slot_pmp_back", source: "slot_perf", target: "courses_list", label: "Back to Courses" },

    // Slot Exec -> Card Exec
    { id: "e_slot_sep_1", source: "slot_exec", target: "card_exec", label: "9–10 Nov 2026" },
    { id: "e_slot_sep_2", source: "slot_exec", target: "card_exec", label: "14–15 Dec 2026" },
    { id: "e_slot_sep_back", source: "slot_exec", target: "courses_list", label: "Back to Courses" },

    // Cards -> Booking / Fees / Back
    { id: "e_card_bsc_book", source: "card_bsc", target: "ask_name", label: "Book My seat" },
    { id: "e_card_bsc_fees", source: "card_bsc", target: "fees_view", label: "Fees & Offers" },
    { id: "e_card_bsc_back", source: "card_bsc", target: "courses_list", label: "Back to Courses" },

    { id: "e_card_str_book", source: "card_strategy", target: "ask_name", label: "Book My seat" },
    { id: "e_card_str_fees", source: "card_strategy", target: "fees_view", label: "Fees & Offers" },
    { id: "e_card_str_back", source: "card_strategy", target: "courses_list", label: "Back to Courses" },

    { id: "e_card_kpi_book", source: "card_kpi", target: "ask_name", label: "Book My seat" },
    { id: "e_card_kpi_fees", source: "card_kpi", target: "fees_view", label: "Fees & Offers" },
    { id: "e_card_kpi_back", source: "card_kpi", target: "courses_list", label: "Back to Courses" },

    { id: "e_card_pmp_book", source: "card_perf", target: "ask_name", label: "Book My seat" },
    { id: "e_card_pmp_fees", source: "card_perf", target: "fees_view", label: "Fees & Offers" },
    { id: "e_card_pmp_back", source: "card_perf", target: "courses_list", label: "Back to Courses" },

    { id: "e_card_sep_book", source: "card_exec", target: "ask_name", label: "Book My seat" },
    { id: "e_card_sep_fees", source: "card_exec", target: "fees_view", label: "Fees & Offers" },
    { id: "e_card_sep_back", source: "card_exec", target: "courses_list", label: "Back to Courses" },

    // Shared Views Navigation
    { id: "e_fees_courses", source: "fees_view", target: "courses_list", label: "Browse Courses" },
    { id: "e_fees_sup", source: "fees_view", target: "contact_view", label: "Executive Support" },
    { id: "e_contact_courses", source: "contact_view", target: "courses_list", label: "Browse Courses" },

    // Linear Registration Sequence
    { id: "e_name_email", source: "ask_name", target: "ask_email" },
    { id: "e_email_phone", source: "ask_email", target: "ask_phone" },
    { id: "e_phone_secname", source: "ask_phone", target: "ask_second_name" },
    { id: "e_secname_secemail", source: "ask_second_name", target: "ask_second_email" },
    { id: "e_secemail_pay", source: "ask_second_email", target: "payment_instructions" },

    // Payment & Receipt
    { id: "e_pay_upload", source: "payment_instructions", target: "payment_receipt", label: "Upload Receipt" },
    { id: "e_pay_sup", source: "payment_instructions", target: "contact_view", label: "Executive Support" },
    { id: "e_receipt_thanks", source: "payment_receipt", target: "thank_you_receipt" },
    { id: "e_thanks_end", source: "thank_you_receipt", target: "end_flow" }
  ]

  const keywords = [
    "bsc", "course", "courses", "training", "book", "seat", "fees", "register",
    "tanfidh", "strategy", "kpi", "performance", "masterclass", "hi", "hello"
  ]

  const triggerConfig = {
    keywords,
    exactMatch: false,
    channels: ["WHATSAPP"]
  }

  console.log(`Updating BotFlow ${flowId} for tenant ${tenantId}...`)
  const updated = await db.botFlow.update({
    where: { id: flowId },
    data: {
      nodes,
      edges,
      trigger: "KEYWORD",
      triggerConfig,
      isActive: true
    }
  })

  console.log("Successfully updated Tanfidh BotFlow with full interactive Course List & Cohort Date Slots:", updated.id)
}

main().catch(err => {
  console.error("Error updating flow:", err)
  process.exit(1)
})
