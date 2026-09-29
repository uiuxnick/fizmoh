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
        text: "Welcome to Tanfidh Management Consultants 👋\nExecutive Strategy & Corporate Transformation Advisors.\n\nHow may we assist you today?",
        buttons: [
          { id: "btn_courses", title: "View Our Courses" },
          { id: "btn_fees", title: "Course Fees" },
          { id: "btn_contact", title: "Contact Us" }
        ]
      },
      x: 400,
      y: 180
    },
    {
      id: "courses_list",
      type: "BUTTONS",
      data: {
        text: "📚 *Tanfidh Executive Masterclasses (2026)*\n\nSelect a program below to review the curriculum, lead trainer profile, and schedule:",
        buttons: [
          { id: "btn_select_bsc", title: "Certified BSC Pro" },
          { id: "btn_back_main", title: "Back to Menu" }
        ]
      },
      x: 200,
      y: 380
    },
    {
      id: "bsc_media",
      type: "MEDIA",
      data: {
        mediaType: "image",
        mediaUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1600&auto=format&fit=crop",
        caption: "🎓 *AI-Powered Certified Balanced Scorecard Professional*\n🏛️ *Institution:* Tanfidh Management Consultants\n👨‍💼 *Lead Trainer:* Said Al Harthi (Managing Consultant & Senior Strategy Advisor)\n\n📅 *Dates:* 13–14 October 2026 (2 Days | 14 Hours)\n📍 *Venue:* Sheraton Oman Hotel, Ruwi Financial District, Muscat\n🏆 *Credential:* Certified Balanced Scorecard Professional (Cryptographic QR Verifiable)\n\n*Key Masterclass Topics:*\n✓ Design 4-Perspective Balanced Scorecards (Financial, Customer, Process, Learning)\n✓ Real-time Strategy Mapping with Generative AI\n✓ Cascading Corporate KPIs to Business Units & Departments\n✓ Designing Executive Dashboards & Automated Exception Alerts\n\n✨ *Executive Package:* 5-Star Sheraton lunches, full course toolkit (Excel/PowerBI), and 2 verifiable credentials."
      },
      x: 200,
      y: 560
    },
    {
      id: "bsc_actions",
      type: "BUTTONS",
      data: {
        text: "Would you like to reserve your seat or speak with a senior advisor?",
        buttons: [
          { id: "btn_book", title: "Book Now" },
          { id: "btn_support", title: "Talk with Support" },
          { id: "btn_back_main", title: "Back to Menu" }
        ]
      },
      x: 200,
      y: 740
    },
    {
      id: "fees_view",
      type: "BUTTONS",
      data: {
        text: "💳 *Course Investment & Special BOGO Offer — 2026*\n\n• *Standard Investment:* OMR 500 per delegate\n• *Special Offer:* Pay for 1 seat, get 1 seat FREE (Buy 1 Get 1 Free)\n• *Corporate Nominations (3+ seats):* Custom enterprise pricing available\n\n🎁 *BOGO Offer Benefits:*\nRegister 1 paid delegate and bring a colleague or team member at ZERO additional cost. Both attendees receive full masterclass access, executive materials, 5-star hotel lunches, and individual credentials.\n\n🏦 *Payment Terms:* Direct Bank Transfer / Wire (Official Corporate Tax Invoice provided).",
        buttons: [
          { id: "btn_book", title: "Book Now" },
          { id: "btn_support", title: "Talk with Support" },
          { id: "btn_back_main", title: "Back to Menu" }
        ]
      },
      x: 500,
      y: 380
    },
    {
      id: "contact_view",
      type: "BUTTONS",
      data: {
        text: "🤝 *Tanfidh Executive Client Support*\n\nOur senior strategy consultants are ready to assist you:\n\n📞 *Direct Line / WhatsApp:* +968 7178 4454 / +968 9935 5438\n✉️ *Email:* saidalharthy@tanfidh.com\n🌐 *Website:* www.tanfidh.com\n📍 *Headquarters:* Ruwi Financial District, Muscat, Sultanate of Oman\n\nAn advisor has been notified. You can also type your questions directly here, and our team will reply shortly.",
        buttons: [
          { id: "btn_book", title: "Book Now" },
          { id: "btn_courses", title: "View Our Courses" }
        ]
      },
      x: 800,
      y: 380
    },
    {
      id: "ask_name",
      type: "QUESTION",
      data: {
        text: "To register your seat, please provide your *Full Name* and *Organization / Company*:",
        name: "full_name",
        inputType: "text",
        required: true
      },
      x: 350,
      y: 920
    },
    {
      id: "ask_email",
      type: "QUESTION",
      data: {
        text: "Thank you! What is your official *Email Address* for booking confirmation & course materials?",
        name: "email",
        inputType: "email",
        required: true
      },
      x: 350,
      y: 1100
    },
    {
      id: "ask_phone",
      type: "QUESTION",
      data: {
        text: "Please provide your contact *Mobile Number* (or reply 'same' to use this WhatsApp number):",
        name: "mobile_number",
        inputType: "text",
        required: true
      },
      x: 350,
      y: 1280
    },
    {
      id: "payment_instructions",
      type: "QUESTION",
      data: {
        text: "📋 *Registration Summary:*\n• *Primary Delegate:* {{full_name}}\n• *Email:* {{email}}\n• *Program:* AI-Powered Certified Balanced Scorecard Professional\n• *Total Investment:* OMR 500 (Pay 1 Get 1 Free Applied — 2 Attendees)\n\n🏦 *Official Bank Transfer Details:*\n• *Bank:* {{bank_name}}\n• *Beneficiary:* {{account_name}}\n• *Account Number:* {{account_number}}\n• *IBAN:* {{iban}}\n\n📸 *Final Step:* Please transfer the fee and reply here with a *screenshot or photo of your payment transfer receipt*.",
        name: "payment_receipt",
        inputType: "text",
        required: true
      },
      x: 350,
      y: 1460
    },
    {
      id: "thank_you_receipt",
      type: "MESSAGE",
      data: {
        text: "✅ *Thank you, {{full_name}}!*\n\nWe have safely received your payment receipt for the *AI-Powered Certified Balanced Scorecard Professional* masterclass.\n\n⏳ Our finance and admissions team is currently reviewing and verifying the bank transfer.\n\nOnce verified, you will receive:\n1. Official Tax Invoice & Payment Receipt (Paid Balance: OMR 500, Balance Due: OMR 0)\n2. Confirmed Seat Allocation & Attendance Voucher\n3. Digital QR Check-In Access Code\n\nIf you need any immediate assistance, our team is right here to help!"
      },
      x: 350,
      "y": 1640
    },
    {
      id: "end_flow",
      type: "END",
      data: {},
      x: 350,
      y: 1820
    }
  ]

  const edges = [
    { id: "e_trig", source: "trigger", target: "greeting" },
    { id: "e_g_courses", source: "greeting", target: "courses_list", label: "View Our Courses" },
    { id: "e_g_fees", source: "greeting", target: "fees_view", label: "Course Fees" },
    { id: "e_g_contact", source: "greeting", target: "contact_view", label: "Contact Us" },
    
    { id: "e_c_bsc", source: "courses_list", target: "bsc_media", label: "Certified BSC Pro" },
    { id: "e_c_back", source: "courses_list", target: "greeting", label: "Back to Menu" },
    
    { id: "e_media_act", source: "bsc_media", target: "bsc_actions" },
    { id: "e_bsc_book", source: "bsc_actions", target: "ask_name", label: "Book Now" },
    { id: "e_bsc_sup", source: "bsc_actions", target: "contact_view", label: "Talk with Support" },
    { id: "e_bsc_back", source: "bsc_actions", target: "greeting", label: "Back to Menu" },
    
    { id: "e_fees_book", source: "fees_view", target: "ask_name", label: "Book Now" },
    { id: "e_fees_sup", source: "fees_view", target: "contact_view", label: "Talk with Support" },
    { id: "e_fees_back", source: "fees_view", target: "greeting", label: "Back to Menu" },
    
    { id: "e_con_book", source: "contact_view", target: "ask_name", label: "Book Now" },
    { id: "e_con_courses", source: "contact_view", target: "courses_list", label: "View Our Courses" },
    
    { id: "e_name_email", source: "ask_name", target: "ask_email" },
    { id: "e_email_phone", source: "ask_email", target: "ask_phone" },
    { id: "e_phone_pay", source: "ask_phone", target: "payment_instructions" },
    { id: "e_pay_thanks", source: "payment_instructions", target: "thank_you_receipt" },
    { id: "e_thanks_end", source: "thank_you_receipt", target: "end_flow" }
  ]

  const triggerConfig = {
    channels: ["WHATSAPP"],
    keywords: [
      "bsc",
      "book",
      "training",
      "course",
      "courses",
      "balanced scorecard",
      "scorecard",
      "register",
      "تسجيل",
      "احجز",
      "دورة",
      "تدريب",
      "دورات"
    ],
    matchType: "contains"
  }

  const updated = await db.botFlow.update({
    where: { id: flowId },
    data: {
      name: "Tanfidh Executive Training Booking Assistant",
      trigger: "KEYWORD",
      triggerConfig,
      nodes,
      edges,
      publishedNodes: nodes,
      publishedEdges: edges,
      isActive: true,
      publishedAt: new Date(),
    }
  })

  console.log("Successfully updated Tanfidh BotFlow:", updated.id, updated.name)
}

main().catch(console.error)
