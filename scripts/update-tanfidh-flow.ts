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
          { id: "btn_book", title: "Book My seat" },
          { id: "btn_details", title: "Course details" },
          { id: "btn_fees", title: "View Fees" }
        ]
      },
      x: 400,
      y: 180
    },
    {
      id: "bsc_media",
      type: "MEDIA",
      data: {
        mediaType: "image",
        mediaUrl: "{{course.banner_url}}",
        caption: "🎓 *{{course.name}}*\n🏛️ *Institution:* Tanfidh Management Consultants\n👨‍💼 *Lead Trainer:* {{course.trainer}} ({{course.trainer_designation}})\n\n📅 *Dates:* {{course.dates}} ({{course.duration}})\n📍 *Venue:* {{course.venue}}\n🏆 *Credential:* Certified Balanced Scorecard Professional (Cryptographic QR Verifiable)\n\n*Key Highlights:*\n{{course.highlights}}\n\n✨ *Executive Package:* 5-Star Sheraton lunches, full course toolkit (Excel/PowerBI), and 2 verifiable credentials."
      },
      x: 200,
      y: 400
    },
    {
      id: "bsc_actions",
      type: "BUTTONS",
      data: {
        text: "🎓 *{{course.name}}*\n📁 *Category:* {{course.category}} ({{course.type}})\n\n📅 *Dates:* {{course.dates}} ({{course.duration}})\n📍 *Venue:* {{course.venue}}\n👥 *Availability:* {{course.seats}}\n🎟️ *Special Offer:* {{course.offer}}\n💰 *Investment:* {{course.price}}\n👨‍💼 *Lead Trainer:* {{course.trainer}}\n\nReserve your seat or speak with our team:",
        buttons: [
          { id: "btn_book", title: "Book My seat" },
          { id: "btn_fees", title: "View Fees" },
          { id: "btn_support", title: "Talk with Support" }
        ]
      },
      x: 200,
      y: 580
    },
    {
      id: "fees_view",
      type: "BUTTONS",
      data: {
        text: "💳 *Masterclass Investment & Executive Offers*\n\n• *Program:* {{course.name}}\n• *Standard Investment:* {{course.price}} per delegate\n• *Special Offer:* {{course.offer}}\n• *Corporate Nominations (3+ seats):* Custom enterprise pricing available\n\n🎁 *Offer Benefits:*\nRegister 1 paid delegate and bring a colleague or team member at ZERO additional cost. Both attendees receive full masterclass access, executive materials, 5-star hotel lunches, and individual credentials.\n\n🏦 *Payment Terms:* Direct Bank Transfer / Wire (Official Corporate Tax Invoice provided).",
        buttons: [
          { id: "btn_book", title: "Book My seat" },
          { id: "btn_details", title: "Course details" },
          { id: "btn_support", title: "Talk with Support" }
        ]
      },
      x: 550,
      y: 400
    },
    {
      id: "contact_view",
      type: "BUTTONS",
      data: {
        text: "🤝 *Tanfidh Executive Client Support*\n\nOur senior strategy consultants are ready to assist you:\n\n📞 *Direct Line / WhatsApp:* +968 7178 4454 / +968 9935 5438\n✉️ *Email:* saidalharthy@tanfidh.com\n🌐 *Website:* www.tanfidh.com\n📍 *Headquarters:* Ruwi Financial District, Muscat, Sultanate of Oman\n\nAn advisor has been notified. You can also type your questions directly here, and our team will reply shortly.",
        buttons: [
          { id: "btn_book", title: "Book My seat" },
          { id: "btn_details", title: "Course details" }
        ]
      },
      x: 850,
      y: 400
    },
    {
      id: "ask_name",
      type: "QUESTION",
      data: {
        text: "To register your seat for *{{course.name}}*, please provide your *Full Name* and *Organization / Company*:",
        name: "full_name",
        inputType: "text",
        required: true
      },
      x: 350,
      y: 800
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
      y: 980
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
      y: 1160
    },
    {
      id: "ask_second_name",
      type: "QUESTION",
      data: {
        text: "🎁 *Special Offer Included (Buy 1 Get 1 Free)*\nYour registration includes a complimentary 2nd seat!\n\nPlease provide the *Full Name* of the second attendee (or reply *'skip'* to nominate later):",
        name: "second_full_name",
        inputType: "text",
        required: false
      },
      x: 350,
      y: 1340
    },
    {
      id: "ask_second_email",
      type: "QUESTION",
      data: {
        text: "Please provide the *Email Address* of the second attendee (or reply *'skip'* to provide later):",
        name: "second_email",
        inputType: "text",
        required: false
      },
      x: 350,
      y: 1520
    },
    {
      id: "payment_instructions",
      type: "QUESTION",
      data: {
        text: "📋 *Registration Summary:*\n• *Primary Delegate:* {{full_name}}\n• *Email:* {{email}}\n• *Program:* {{course.name}}\n• *Schedule:* {{course.dates}} ({{course.duration}})\n• *Venue:* {{course.venue}}\n• *Offer Applied:* {{course.offer}}\n• *Total Investment:* {{course.price}}\n\n🏦 *Official Bank Transfer Details:*\n• *Bank:* {{bank_name}}\n• *Beneficiary:* {{account_name}}\n• *Account Number:* {{account_number}}\n• *IBAN:* {{iban}}\n\n📸 *Final Step:* Please transfer the fee and reply here with a *screenshot or photo of your payment transfer receipt*.",
        name: "payment_receipt",
        inputType: "text",
        required: true
      },
      x: 350,
      y: 1700
    },
    {
      id: "thank_you_receipt",
      type: "MESSAGE",
      data: {
        text: "✅ *Thank you, {{full_name}}!*\n\nWe have safely received your payment receipt for the *{{course.name}}* masterclass.\n\n⏳ Our finance and admissions team is currently reviewing and verifying the bank transfer.\n\nOnce verified, you will receive:\n1. 📄 Official Tax Invoice & Payment Receipt PDF\n2. 🎟️ Confirmed Seat Allocation & Attendance Voucher\n3. 📲 Digital QR Check-In Access Code\n\nIf you need any immediate assistance, our team is right here to help!"
      },
      x: 350,
      y: 1880
    },
    {
      id: "end_flow",
      type: "END",
      data: {},
      x: 350,
      y: 2060
    }
  ]

  const edges = [
    { id: "e_trig", source: "trigger", target: "greeting" },
    { id: "e_g_book", source: "greeting", target: "ask_name", label: "Book My seat" },
    { id: "e_g_details", source: "greeting", target: "bsc_media", label: "Course details" },
    { id: "e_g_fees", source: "greeting", target: "fees_view", label: "View Fees" },
    
    { id: "e_media_act", source: "bsc_media", target: "bsc_actions" },
    { id: "e_bsc_book", source: "bsc_actions", target: "ask_name", label: "Book My seat" },
    { id: "e_bsc_fees", source: "bsc_actions", target: "fees_view", label: "View Fees" },
    { id: "e_bsc_sup", source: "bsc_actions", target: "contact_view", label: "Talk with Support" },
    
    { id: "e_fees_book", source: "fees_view", target: "ask_name", label: "Book My seat" },
    { id: "e_fees_details", source: "fees_view", target: "bsc_media", label: "Course details" },
    { id: "e_fees_sup", source: "fees_view", target: "contact_view", label: "Talk with Support" },
    
    { id: "e_con_book", source: "contact_view", target: "ask_name", label: "Book My seat" },
    { id: "e_con_details", source: "contact_view", target: "bsc_media", label: "Course details" },
    
    { id: "e_name_email", source: "ask_name", target: "ask_email" },
    { id: "e_email_phone", source: "ask_email", target: "ask_phone" },
    { id: "e_phone_sname", source: "ask_phone", target: "ask_second_name" },
    { id: "e_sname_semail", source: "ask_second_name", target: "ask_second_email" },
    { id: "e_semail_pay", source: "ask_second_email", target: "payment_instructions" },
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
      "seat",
      "fees",
      "fee",
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
