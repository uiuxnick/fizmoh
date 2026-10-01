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
      y: 50,
    },
    {
      id: "greeting",
      type: "BUTTONS",
      data: {
        text: "Welcome to Tanfidh Management Consultants 👋\nExecutive Strategy & Corporate Transformation Advisors.\n\nExplore our executive masterclasses or reserve your seats below:",
        buttons: [
          { id: "btn_courses", title: "Browse Courses" },
          { id: "btn_fees", title: "Fees & Offers" },
          { id: "btn_support", title: "Executive Support" },
        ],
      },
      x: 400,
      y: 180,
    },
    {
      id: "courses_list",
      type: "LIST",
      data: {
        text: "🎓 *Tanfidh Management Consultants*\n*Official Executive Masterclasses (2026 Schedule)*\n\n1️⃣ *AI-Powered Certified Balanced Scorecard Professional*\n2️⃣ *AI-Powered Certified Strategy Professional*\n3️⃣ *AI-Powered Certified Performance Management Professional*\n4️⃣ *AI-Powered Strategy Execution Professional*\n5️⃣ *AI-Powered Certified KPI Professional*\n6️⃣ *AI-Powered Strategy Execution Using Balanced Scorecard*\n\nPlease tap *Select Course* below to explore full details and reserve seats under the Buy 1 Get 1 Free (BOGO) offer:",
        listButton: "Select Course",
        header: "Available Programs",
        rows: [
          { id: "course_bsc", title: "1. Balanced Scorecard", description: "AI-Powered Certified Balanced Scorecard Professional" },
          { id: "course_strategy", title: "2. Certified Strategy", description: "AI-Powered Certified Strategy Professional" },
          { id: "course_perf", title: "3. Performance Mgmt", description: "AI-Powered Certified Performance Management Professional" },
          { id: "course_exec", title: "4. Strategy Execution", description: "AI-Powered Strategy Execution Professional" },
          { id: "course_kpi", title: "5. Certified KPI Pro", description: "AI-Powered Certified KPI Professional" },
          { id: "course_se_bsc", title: "6. Exec with BSC", description: "AI-Powered Strategy Execution Using Balanced Scorecard" },
        ],
      },
      x: 400,
      y: 360,
    },

    // ─── 1. BSC Course: Full Details (MESSAGE) + Action (BUTTONS) ───
    {
      id: "card_bsc_details",
      type: "MESSAGE",
      data: {
        text: "🎓 *1  AI-Powered Certified Balanced Scorecard Professional*\n\n2 day in person programme | 08:30–16:30 | Muscat, Sultanate of Oman\n📅 *Scheduled Dates:* 13–14 Oct 2026 and 14–15 Dec 2026\n💰 *Fee and offer:* OMR 500 per participant. Pay for 1 seat and get 1 seat totally free (BOGO Applied).\n\nTranslate strategy into a measurable Balanced Scorecard and use AI responsibly to improve design, analysis and review.\n\n🎯 *Who should attend:*\nStrategy and planning leaders; BSC and KPI practitioners; department heads; PMO, transformation, HR, finance, quality, risk, audit and digital teams.\n\n✨ *Why attend:*\nLeave with a connected strategy map, KPI specifications, aligned scorecard and review plan. Use AI to challenge assumptions while validating every result against business evidence.\n\n💡 *Learning outcomes:*\nDesign a four perspective strategy map and scorecard; distinguish outcomes from drivers; specify KPIs and targets; cascade measures; interpret a dashboard; facilitate an accountable strategy review.\n\n📋 *Day by day agenda:*\n\n*Day 1  Strategy map and KPI selection*\n• 08:30–10:15: Welcome, course diagnostic and Balanced Scorecard foundations: perspectives, themes, objectives and cause and effect.\n• 10:15–10:30: Morning break\n• 10:30–13:00: Clarify strategic priorities and draft a strategy map; critique weak objective statements and missing links.\n• 13:00–14:00: Lunch (5-Star Hotel Buffet)\n• 14:00–15:00: Select outcome and driver KPIs; test relevance, controllability and available data.\n• 15:00–15:15: Afternoon break\n• 15:15–16:15: Use AI to suggest objectives and KPIs; check calculations, bias, confidentiality and business fit.\n• 16:15–16:30: Present a first strategy map and KPI shortlist; record revisions for Day 2.\n\n*Day 2  Scorecard implementation and review*\n• 08:30–10:15: Refine the strategy map and introduce KPI definition sheets.\n• 10:15–10:30: Morning break\n• 10:30–13:00: Specify formulas, units, owners, sources, baselines, targets and thresholds; practice cascading to departments.\n• 13:00–14:00: Lunch (5-Star Hotel Buffet)\n• 14:00–15:00: Design a scorecard dashboard with commentary, initiatives and decision signals.\n• 15:00–15:15: Afternoon break\n• 15:15–16:15: Use AI to draft performance narratives; verify source data and simulate a strategy review.\n• 16:15–16:30: Present scorecards, complete the practical application assessment and write a 30 day action plan.\n\n📦 *Participant outputs:* Draft strategy map, KPI definition sheets, scorecard, review agenda and personal action plan.\n\n🎯 *Learning approach:* Interactive case work, discussion, reusable templates and a final practical application. Participants may use anonymized organizational examples where appropriate.\n\n🏢 *Ask for In-Company special tailored programs for your organization.*\n🤝 *Contact us for free strategy consulting advises.*",
      },
      x: 0,
      y: 550,
    },
    {
      id: "card_bsc_action",
      type: "BUTTONS",
      data: {
        text: "Would you like to review trainer details or reserve your seats for *AI-Powered Certified Balanced Scorecard Professional* (Cohorts: 13–14 Oct 2026 & 14–15 Dec 2026)?",
        buttons: [
          { id: "btn_tr_bsc", title: "Trainer Details" },
          { id: "btn_reg_bsc", title: "Register Now" },
        ],
      },
      x: 0,
      y: 700,
    },

    // ─── 2. Strategy Course: Details + Action ───
    {
      id: "card_strategy_details",
      type: "MESSAGE",
      data: {
        text: "🎓 *2  AI-Powered Certified Strategy Professional*\n\n2 day in person programme | 08:30–16:30 | Muscat, Sultanate of Oman\n📅 *Scheduled Dates:* 26–27 Oct 2026 and 21–22 Dec 2026\n💰 *Fee and offer:* OMR 500 per participant. Pay for 1 seat and get 1 seat totally free (BOGO Applied).\n\nFormulate clear, resilient corporate strategies, test strategic choices, and leverage AI for competitive intelligence and scenario analysis.\n\n🎯 *Who should attend:*\nC-suite executives, directors, strategy heads, business planners, division leaders, and corporate development advisors.\n\n✨ *Why attend:*\nLeave with an actionable strategic roadmap, validated assumptions, and a competitive advantage backed by modern AI analytical tools.\n\n💡 *Learning outcomes:*\nFormulate clear, differentiated strategic choices; conduct external & internal strategic diagnosis; use AI to test assumptions & synthesize market trends; build an actionable strategic roadmap.\n\n✨ *Inclusions:* 5-star executive lunches, strategy workbook, and 2 individual verifiable credentials.\n\n🏢 *Ask for In-Company special tailored programs for your organization.*\n🤝 *Contact us for free strategy consulting advises.*",
      },
      x: 220,
      y: 550,
    },
    {
      id: "card_strategy_action",
      type: "BUTTONS",
      data: {
        text: "Would you like to review trainer details or reserve your seats for *AI-Powered Certified Strategy Professional* (Cohorts: 26–27 Oct 2026 & 21–22 Dec 2026)?",
        buttons: [
          { id: "btn_tr_strat", title: "Trainer Details" },
          { id: "btn_reg_strat", title: "Register Now" },
        ],
      },
      x: 220,
      y: 700,
    },

    // ─── 3. Performance Course: Details + Action ───
    {
      id: "card_perf_details",
      type: "MESSAGE",
      data: {
        text: "🎓 *3  AI-Powered Certified Performance Management Professional*\n\n2 day in person programme | 08:30–16:30 | Muscat, Sultanate of Oman\n📅 *Scheduled Dates:* 19–20 Oct 2026 and 25–26 Nov 2026\n💰 *Fee and offer:* OMR 500 per participant. Pay for 1 seat and get 1 seat totally free (BOGO Applied).\n\nArchitect end-to-end performance management systems that drive organizational alignment and measurable results with AI.\n\n🎯 *Who should attend:*\nPerformance managers, HR leaders, departmental heads, operational managers, and transformation directors.\n\n✨ *Why attend:*\nEstablish an accountability culture, cascade objectives to business units, and use AI to evaluate performance gaps objectively.\n\n💡 *Learning outcomes:*\nDesign corporate & departmental performance frameworks; align individual goals with strategic priorities; structure actionable performance reviews & coaching; use AI to analyze performance variances & recommend fixes.\n\n✨ *Inclusions:* 5-star executive lunches, performance templates, and 2 individual verifiable credentials.\n\n🏢 *Ask for In-Company special tailored programs for your organization.*\n🤝 *Contact us for free strategy consulting advises.*",
      },
      x: 440,
      y: 550,
    },
    {
      id: "card_perf_action",
      type: "BUTTONS",
      data: {
        text: "Would you like to review trainer details or reserve your seats for *AI-Powered Certified Performance Management Professional* (Cohorts: 19–20 Oct 2026 & 25–26 Nov 2026)?",
        buttons: [
          { id: "btn_tr_perf", title: "Trainer Details" },
          { id: "btn_reg_perf", title: "Register Now" },
        ],
      },
      x: 440,
      y: 700,
    },

    // ─── 4. Execution Pro: Details + Action ───
    {
      id: "card_exec_details",
      type: "MESSAGE",
      data: {
        text: "🎓 *4  AI-Powered Strategy Execution Professional*\n\n2 day in person programme | 08:30–16:30 | Muscat, Sultanate of Oman\n📅 *Scheduled Dates:* 9–10 Nov 2026\n💰 *Fee and offer:* OMR 500 per participant. Pay for 1 seat and get 1 seat totally free (BOGO Applied).\n\nBridge the gap between strategic vision and operational execution using structured governance and AI-assisted oversight.\n\n🎯 *Who should attend:*\nTransformation leaders, PMO managers, operational heads, project sponsors, and execution specialists.\n\n✨ *Why attend:*\nEliminate strategy execution bottlenecks and operationalize initiatives with disciplined tracking and early-warning signals.\n\n💡 *Learning outcomes:*\nOvercome common strategy execution bottlenecks; design an effective Strategy Management Office (SMO); prioritize and govern strategic initiatives; use AI to monitor delivery risks & course-correct early.\n\n✨ *Inclusions:* 5-star executive lunches, execution playbook, and 2 individual verifiable credentials.\n\n🏢 *Ask for In-Company special tailored programs for your organization.*\n🤝 *Contact us for free strategy consulting advises.*",
      },
      x: 660,
      y: 550,
    },
    {
      id: "card_exec_action",
      type: "BUTTONS",
      data: {
        text: "Would you like to review trainer details or reserve your seats for *AI-Powered Strategy Execution Professional* (Cohort: 9–10 Nov 2026)?",
        buttons: [
          { id: "btn_tr_exec", title: "Trainer Details" },
          { id: "btn_reg_exec", title: "Register Now" },
        ],
      },
      x: 660,
      y: 700,
    },

    // ─── 5. KPI Pro: Details + Action ───
    {
      id: "card_kpi_details",
      type: "MESSAGE",
      data: {
        text: "🎓 *5  AI-Powered Certified KPI Professional*\n\n3 day in person programme | 08:30–16:30 | Muscat, Sultanate of Oman\n📅 *Scheduled Dates:* 15–17 Nov 2026 and 1–3 Dec 2026\n💰 *Fee and offer:* OMR 750 per participant. Pay for 1 seat and get 1 seat totally free (BOGO Applied).\n\nMaster KPI selection, documentation, cascading, and target-setting backed by AI data validation and analytics.\n\n🎯 *Who should attend:*\nKPI analysts, business intelligence specialists, PMO, quality, data and performance managers across all sectors.\n\n✨ *Why attend:*\nEstablish an ironclad KPI architecture, avoid vanity metrics, and automate performance reporting with AI prompts.\n\n💡 *Learning outcomes:*\nSelect high-impact leading & lagging indicators; document complete KPI definition & specification sheets; cascade corporate KPIs to business units and teams; design executive visual KPI dashboards with AI.\n\n✨ *Inclusions:* 3 Days Masterclass, 5-star lunches, KPI dictionary, and 2 individual verifiable credentials.\n\n🏢 *Ask for In-Company special tailored programs for your organization.*\n🤝 *Contact us for free strategy consulting advises.*",
      },
      x: 880,
      y: 550,
    },
    {
      id: "card_kpi_action",
      type: "BUTTONS",
      data: {
        text: "Would you like to review trainer details or reserve your seats for *AI-Powered Certified KPI Professional* (Cohorts: 15–17 Nov 2026 & 1–3 Dec 2026)?",
        buttons: [
          { id: "btn_tr_kpi", title: "Trainer Details" },
          { id: "btn_reg_kpi", title: "Register Now" },
        ],
      },
      x: 880,
      y: 700,
    },

    // ─── 6. SE Using BSC: Details + Action ───
    {
      id: "card_se_bsc_details",
      type: "MESSAGE",
      data: {
        text: "🎓 *6  AI-Powered Strategy Execution Using Balanced Scorecard*\n\n3 day in person programme | 08:30–16:30 | Muscat, Sultanate of Oman\n📅 *Scheduled Dates:* 2–4 Nov 2026\n💰 *Fee and offer:* OMR 750 per participant. Pay for 1 seat and get 1 seat totally free (BOGO Applied).\n\nThe definitive executive masterclass on operationalizing strategy maps and scorecards into disciplined institutional execution.\n\n🎯 *Who should attend:*\nSenior executives, strategy directors, transformation teams, and BSC leaders driving enterprise change.\n\n✨ *Why attend:*\nIntegrate strategic maps with budgets, resource allocation, and quarterly governance rhythms to guarantee strategic achievement.\n\n💡 *Learning outcomes:*\nConvert complex strategic plans into visual strategy maps; align organizational units, budget, and human capital; establish quarterly executive strategy review rhythms; apply AI prompts to uncover hidden execution risks.\n\n✨ *Inclusions:* 3 Days Masterclass, 5-star lunches, execution blueprints, and 2 individual verifiable credentials.\n\n🏢 *Ask for In-Company special tailored programs for your organization.*\n🤝 *Contact us for free strategy consulting advises.*",
      },
      x: 1100,
      y: 550,
    },
    {
      id: "card_se_bsc_action",
      type: "BUTTONS",
      data: {
        text: "Would you like to review trainer details or reserve your seats for *AI-Powered Strategy Execution Using Balanced Scorecard* (Cohort: 2–4 Nov 2026)?",
        buttons: [
          { id: "btn_tr_sebsc", title: "Trainer Details" },
          { id: "btn_reg_sebsc", title: "Register Now" },
        ],
      },
      x: 1100,
      y: 700,
    },

    // ─── Slot / Date Selection Nodes (All Interactive LIST Pickers) ───
    {
      id: "slot_bsc",
      type: "LIST",
      data: {
        name: "chosen_slot",
        inputType: "select",
        text: "📅 *AI-Powered Certified Balanced Scorecard Professional*\nPlease select your preferred cohort date in *Muscat, Sultanate of Oman* (08:30–16:30):",
        listButton: "Select Date",
        header: "Available Cohorts",
        rows: [
          { id: "slot_bsc_oct", title: "13–14 Oct 2026", description: "Muscat · 08:30–16:30 · OMR 500 (BOGO)" },
          { id: "slot_bsc_dec", title: "14–15 Dec 2026", description: "Muscat · 08:30–16:30 · OMR 500 (BOGO)" },
        ],
      },
      x: 0,
      y: 860,
    },
    {
      id: "slot_strategy",
      type: "LIST",
      data: {
        name: "chosen_slot",
        inputType: "select",
        text: "📅 *AI-Powered Certified Strategy Professional*\nPlease select your preferred cohort date in *Muscat, Sultanate of Oman* (08:30–16:30):",
        listButton: "Select Date",
        header: "Available Cohorts",
        rows: [
          { id: "slot_str_oct", title: "26–27 Oct 2026", description: "Muscat · 08:30–16:30 · OMR 500 (BOGO)" },
          { id: "slot_str_dec", title: "21–22 Dec 2026", description: "Muscat · 08:30–16:30 · OMR 500 (BOGO)" },
        ],
      },
      x: 220,
      y: 860,
    },
    {
      id: "slot_perf",
      type: "LIST",
      data: {
        name: "chosen_slot",
        inputType: "select",
        text: "📅 *AI-Powered Certified Performance Management Professional*\nPlease select your preferred cohort date in *Muscat, Sultanate of Oman* (08:30–16:30):",
        listButton: "Select Date",
        header: "Available Cohorts",
        rows: [
          { id: "slot_perf_oct", title: "19–20 Oct 2026", description: "Muscat · 08:30–16:30 · OMR 500 (BOGO)" },
          { id: "slot_perf_nov", title: "25–26 Nov 2026", description: "Muscat · 08:30–16:30 · OMR 500 (BOGO)" },
        ],
      },
      x: 440,
      y: 860,
    },
    {
      id: "slot_exec",
      type: "LIST",
      data: {
        name: "chosen_slot",
        inputType: "select",
        text: "📅 *AI-Powered Strategy Execution Professional*\nPlease select your cohort date in *Muscat, Sultanate of Oman* (08:30–16:30):",
        listButton: "Select Date",
        header: "Available Cohorts",
        rows: [
          { id: "slot_sep_nov", title: "9–10 Nov 2026", description: "Muscat · 08:30–16:30 · OMR 500 (BOGO)" },
        ],
      },
      x: 660,
      y: 860,
    },
    {
      id: "slot_kpi",
      type: "LIST",
      data: {
        name: "chosen_slot",
        inputType: "select",
        text: "📅 *AI-Powered Certified KPI Professional*\nPlease select your preferred cohort date in *Muscat, Sultanate of Oman* (08:30–16:30, 3 Days):",
        listButton: "Select Date",
        header: "Available Cohorts",
        rows: [
          { id: "slot_kpi_nov", title: "15–17 Nov 2026", description: "Muscat · 08:30–16:30 · OMR 750 (BOGO)" },
          { id: "slot_kpi_dec", title: "1–3 Dec 2026", description: "Muscat · 08:30–16:30 · OMR 750 (BOGO)" },
        ],
      },
      x: 880,
      y: 860,
    },
    {
      id: "slot_se_bsc",
      type: "LIST",
      data: {
        name: "chosen_slot",
        inputType: "select",
        text: "📅 *AI-Powered Strategy Execution Using Balanced Scorecard*\nPlease select your cohort date in *Muscat, Sultanate of Oman* (08:30–16:30, 3 Days):",
        listButton: "Select Date",
        header: "Available Cohorts",
        rows: [
          { id: "slot_sebsc_nov", title: "2–4 Nov 2026", description: "Muscat · 08:30–16:30 · OMR 750 (BOGO)" },
        ],
      },
      x: 1100,
      y: 860,
    },

    // ─── Trainer Details (High Resolution Photo + Full Profile + Direct Buttons) ───
    {
      id: "trainer_media",
      type: "MEDIA",
      data: {
        mediaType: "image",
        mediaUrl: "https://app.fizmoh.cloud/downloads/said-al-harthi.jpg",
        caption: "👨‍💼 *Said bin Saif Al Harthi*\nExecutive Director & Senior Consultant and Trainer\nTanfidh Management Consultants",
      },
      x: 500,
      y: 1020,
    },
    {
      id: "trainer_action",
      type: "BUTTONS",
      data: {
        text: "👨‍💼 *Your Trainer: Said bin Saif Al Harthi*\n*Executive Director & Senior Consultant and Trainer*\n*Tanfidh Management Consultants*\n\nSaid advises and trains organizations on strategy development, translation and execution, Balanced Scorecards, KPI design, cascading, dashboards and performance reviews.\n\nHis work spans public and private sector assignments in Oman and Tanzania, helping leadership and departmental teams turn strategic plans into measurable actions. His training combines practical frameworks, facilitated exercises and examples drawn from consulting practice.\n\n📞 *WhatsApp / Mobile:* +968 99 355 438\n✉️ *Email:* saidalharthy@tanfidh.com\n🌐 *Website:* www.tanfidh.com\n📍 *Muscat, Sultanate of Oman*\n\nAsk about registration, certification requirements and In-Company special tailored programs for your organization.",
        buttons: [
          { id: "btn_reg_from_tr", title: "Register Now" },
          { id: "btn_courses_tr", title: "Browse Courses" },
        ],
      },
      x: 500,
      y: 1180,
    },

    // ─── Shared Information Views ───
    {
      id: "fees_view",
      type: "BUTTONS",
      data: {
        text: "💳 *Masterclass Investment & Executive Offers*\n\n• *2-Day Masterclasses:* OMR 500 per participant\n• *3-Day Masterclasses (KPI & SE-BSC):* OMR 750 per participant\n• *Special Offer:* Pay for 1 seat, get 1 seat 100% FREE (Buy 1 Get 1 Free)\n• *In-Company Programs:* Custom tailored on-site packages available\n\n🎁 *Offer Inclusions:*\nRegister 1 paid delegate and bring a colleague or team member at ZERO additional cost. Both attendees receive full masterclass access, executive toolkit, 5-star executive buffet lunches, and individual verifiable credentials.\n\n🏦 *Payment Terms:* Direct Corporate Bank Transfer to Bank Muscat (Sarooj Branch).",
        buttons: [
          { id: "btn_courses", title: "Browse Courses" },
          { id: "btn_support", title: "Executive Support" },
        ],
      },
      x: -150,
      y: 450,
    },
    {
      id: "contact_view",
      type: "BUTTONS",
      data: {
        text: "🤝 *Tanfidh Executive Strategy Advisory*\n\nTanfidh Management Consultants\nLead Trainer: Said bin Saif Al Harthi (Executive Director)\n\n📞 *Direct Line / WhatsApp:* +968 99 355 438\n✉️ *Email:* saidalharthy@tanfidh.com\n🌐 *Website:* www.tanfidh.com\n📍 *Muscat, Sultanate of Oman*\n\nAsk about registration, certification requirements, or In-Company tailored programs for your organization.",
        buttons: [
          { id: "btn_courses", title: "Browse Courses" },
        ],
      },
      x: -150,
      y: 650,
    },

    // ─── Delegate Registration & Data Collection ───
    {
      id: "ask_name",
      type: "QUESTION",
      data: {
        text: "To reserve your seats, please reply with the *Full Name* and *Organization / Company* of the Primary Delegate:",
        name: "full_name",
        inputType: "text",
        required: true,
      },
      x: 500,
      y: 1350,
    },
    {
      id: "ask_email",
      type: "QUESTION",
      data: {
        text: "Thank you! What is your official *Corporate Email Address* for booking confirmation & materials?",
        name: "email",
        inputType: "email",
        required: true,
      },
      x: 500,
      y: 1500,
    },
    {
      id: "ask_phone",
      type: "QUESTION",
      data: {
        text: "What is your direct *Mobile / WhatsApp Number* (or reply *same* to use this WhatsApp number)?",
        name: "mobile_number",
        inputType: "phone",
        required: true,
      },
      x: 500,
      y: 1650,
    },
    {
      id: "ask_second_name",
      type: "QUESTION",
      data: {
        text: "🎁 *Buy 1 Get 1 Free (BOGO) Offer Applied!*\n\nPlease provide the *Full Name* of the 2nd Attendee joining you at zero extra charge (or reply *skip* to nominate later):",
        name: "second_full_name",
        inputType: "text",
        required: false,
      },
      x: 500,
      y: 1800,
    },
    {
      id: "ask_second_email",
      type: "QUESTION",
      data: {
        text: "Please provide the *Corporate Email Address* of the 2nd Attendee (or reply *skip*):",
        name: "second_email",
        inputType: "email",
        required: false,
      },
      x: 500,
      y: 1950,
    },

    // ─── Payment Instructions & Confirmation ───
    {
      id: "payment_instructions",
      type: "BUTTONS",
      data: {
        text: "📋 *Registration Summary:*\n• Program: {{course.name}}\n• Cohort Date: {{chosen_slot}}\n• Primary Delegate: {{full_name}}\n• Email: {{email}}\n• Contact: {{mobile_number}}\n• Seats Reserved: 2 Participants (1 Paid + 1 Free BOGO Applied)\n💳 *Total Investment:* {{course.price}}\n\n⚠️ *If you want to book your seat in advance, please complete the bank transfer:*\n🏦 *Bank Name:* Bank Muscat\n🏢 *Beneficiary:* Tanfidh Management Consultants\n📍 *Branch:* Sarooj\n🔢 *Account Number:* 0322 027 665 4400 18\n🌐 *SWIFT Code:* BMUSOMRXXXX\n\n📌 *Reference:* Please quote delegate name and course title in transfer reference.\n\nTap *Pay Now* or reply with your payment screenshot / transfer slip.",
        buttons: [
          { id: "btn_pay_now", title: "Pay Now" },
          { id: "btn_support", title: "Executive Support" },
        ],
      },
      x: 500,
      y: 2100,
    },
    {
      id: "payment_receipt",
      type: "QUESTION",
      data: {
        text: "Please attach or upload your bank transfer confirmation screenshot or payment slip below:",
        name: "payment_receipt",
        inputType: "image",
        required: true,
      },
      x: 500,
      y: 2260,
    },
    {
      id: "thank_you_receipt",
      type: "MESSAGE",
      data: {
        text: "✅ *Payment Confirmation Received!*\n\nThank you, *{{full_name}}*!\nWe have received your bank transfer confirmation for *{{course.name}}*.\n\n⏳ Our admissions and finance team at Tanfidh is currently verifying the payment with Bank Muscat.\n\nOnce marked as Paid, your official stamped *Receipt PDF* and *Digital Check-In Pass* will be sent directly to you here on WhatsApp. 🎓\n\nIf you need any immediate assistance, Said Al Harthi and our team are right here to help (+968 99 355 438)!",
      },
      x: 500,
      y: 2420,
    },
    {
      id: "end_flow",
      type: "END",
      data: {},
      x: 500,
      y: 2580,
    },
  ]

  const edges = [
    // Greeting
    { id: "e1", source: "trigger", target: "greeting" },
    { id: "e2", source: "greeting", target: "courses_list", label: "btn_courses" },
    { id: "e2b", source: "greeting", target: "courses_list", label: "Browse Courses" },
    { id: "e3", source: "greeting", target: "fees_view", label: "btn_fees" },
    { id: "e3b", source: "greeting", target: "fees_view", label: "Fees & Offers" },
    { id: "e4", source: "greeting", target: "contact_view", label: "btn_support" },
    { id: "e4b", source: "greeting", target: "contact_view", label: "Executive Support" },

    // Courses List -> Direct Course Details
    { id: "e_c_bsc", source: "courses_list", target: "card_bsc_details", label: "course_bsc" },
    { id: "e_c_bsc_1", source: "courses_list", target: "card_bsc_details", label: "1" },
    { id: "e_c_bsc_num", source: "courses_list", target: "card_bsc_details", label: "1. Balanced Scorecard" },
    { id: "e_c_bsc_full", source: "courses_list", target: "card_bsc_details", label: "AI-Powered Certified Balanced Scorecard Professional" },
    { id: "e_c_bsc_txt", source: "courses_list", target: "card_bsc_details", label: "AI Balanced Scorecard" },

    { id: "e_c_strat", source: "courses_list", target: "card_strategy_details", label: "course_strategy" },
    { id: "e_c_strat_2", source: "courses_list", target: "card_strategy_details", label: "2" },
    { id: "e_c_strat_num", source: "courses_list", target: "card_strategy_details", label: "2. Certified Strategy" },
    { id: "e_c_strat_full", source: "courses_list", target: "card_strategy_details", label: "AI-Powered Certified Strategy Professional" },
    { id: "e_c_strat_txt", source: "courses_list", target: "card_strategy_details", label: "AI Strategy Pro" },

    { id: "e_c_perf", source: "courses_list", target: "card_perf_details", label: "course_perf" },
    { id: "e_c_perf_3", source: "courses_list", target: "card_perf_details", label: "3" },
    { id: "e_c_perf_num", source: "courses_list", target: "card_perf_details", label: "3. Performance Mgmt" },
    { id: "e_c_perf_full", source: "courses_list", target: "card_perf_details", label: "AI-Powered Certified Performance Management Professional" },
    { id: "e_c_perf_txt", source: "courses_list", target: "card_perf_details", label: "Performance Mgmt Pro" },

    { id: "e_c_exec", source: "courses_list", target: "card_exec_details", label: "course_exec" },
    { id: "e_c_exec_4", source: "courses_list", target: "card_exec_details", label: "4" },
    { id: "e_c_exec_num", source: "courses_list", target: "card_exec_details", label: "4. Strategy Execution" },
    { id: "e_c_exec_full", source: "courses_list", target: "card_exec_details", label: "AI-Powered Strategy Execution Professional" },
    { id: "e_c_exec_txt", source: "courses_list", target: "card_exec_details", label: "Strategy Execution Pro" },

    { id: "e_c_kpi", source: "courses_list", target: "card_kpi_details", label: "course_kpi" },
    { id: "e_c_kpi_5", source: "courses_list", target: "card_kpi_details", label: "5" },
    { id: "e_c_kpi_num", source: "courses_list", target: "card_kpi_details", label: "5. Certified KPI Pro" },
    { id: "e_c_kpi_full", source: "courses_list", target: "card_kpi_details", label: "AI-Powered Certified KPI Professional" },
    { id: "e_c_kpi_txt", source: "courses_list", target: "card_kpi_details", label: "Certified KPI Pro" },

    { id: "e_c_sebsc", source: "courses_list", target: "card_se_bsc_details", label: "course_se_bsc" },
    { id: "e_c_sebsc_6", source: "courses_list", target: "card_se_bsc_details", label: "6" },
    { id: "e_c_sebsc_num", source: "courses_list", target: "card_se_bsc_details", label: "6. Exec with BSC" },
    { id: "e_c_sebsc_full", source: "courses_list", target: "card_se_bsc_details", label: "AI-Powered Strategy Execution Using Balanced Scorecard" },
    { id: "e_c_sebsc_txt", source: "courses_list", target: "card_se_bsc_details", label: "Strategy Execution BSC" },

    // Details (MESSAGE) -> Action (BUTTONS)
    { id: "e_det_bsc", source: "card_bsc_details", target: "card_bsc_action" },
    { id: "e_det_str", source: "card_strategy_details", target: "card_strategy_action" },
    { id: "e_det_perf", source: "card_perf_details", target: "card_perf_action" },
    { id: "e_det_exec", source: "card_exec_details", target: "card_exec_action" },
    { id: "e_det_kpi", source: "card_kpi_details", target: "card_kpi_action" },
    { id: "e_det_sebsc", source: "card_se_bsc_details", target: "card_se_bsc_action" },

    // Course Action BUTTONS -> Trainer Details OR Register Now (Select Date)
    { id: "e_cbsc_tr", source: "card_bsc_action", target: "trainer_media", label: "btn_tr_bsc" },
    { id: "e_cbsc_tr_txt", source: "card_bsc_action", target: "trainer_media", label: "Trainer Details" },
    { id: "e_cbsc_reg", source: "card_bsc_action", target: "slot_bsc", label: "btn_reg_bsc" },
    { id: "e_cbsc_reg_txt", source: "card_bsc_action", target: "slot_bsc", label: "Register Now" },

    { id: "e_cstr_tr", source: "card_strategy_action", target: "trainer_media", label: "btn_tr_strat" },
    { id: "e_cstr_tr_txt", source: "card_strategy_action", target: "trainer_media", label: "Trainer Details" },
    { id: "e_cstr_reg", source: "card_strategy_action", target: "slot_strategy", label: "btn_reg_strat" },
    { id: "e_cstr_reg_txt", source: "card_strategy_action", target: "slot_strategy", label: "Register Now" },

    { id: "e_cperf_tr", source: "card_perf_action", target: "trainer_media", label: "btn_tr_perf" },
    { id: "e_cperf_tr_txt", source: "card_perf_action", target: "trainer_media", label: "Trainer Details" },
    { id: "e_cperf_reg", source: "card_perf_action", target: "slot_perf", label: "btn_reg_perf" },
    { id: "e_cperf_reg_txt", source: "card_perf_action", target: "slot_perf", label: "Register Now" },

    { id: "e_cexec_tr", source: "card_exec_action", target: "trainer_media", label: "btn_tr_exec" },
    { id: "e_cexec_tr_txt", source: "card_exec_action", target: "trainer_media", label: "Trainer Details" },
    { id: "e_cexec_reg", source: "card_exec_action", target: "slot_exec", label: "btn_reg_exec" },
    { id: "e_cexec_reg_txt", source: "card_exec_action", target: "slot_exec", label: "Register Now" },

    { id: "e_ckpi_tr", source: "card_kpi_action", target: "trainer_media", label: "btn_tr_kpi" },
    { id: "e_ckpi_tr_txt", source: "card_kpi_action", target: "trainer_media", label: "Trainer Details" },
    { id: "e_ckpi_reg", source: "card_kpi_action", target: "slot_kpi", label: "btn_reg_kpi" },
    { id: "e_ckpi_reg_txt", source: "card_kpi_action", target: "slot_kpi", label: "Register Now" },

    { id: "e_csebsc_tr", source: "card_se_bsc_action", target: "trainer_media", label: "btn_tr_sebsc" },
    { id: "e_csebsc_tr_txt", source: "card_se_bsc_action", target: "trainer_media", label: "Trainer Details" },
    { id: "e_csebsc_reg", source: "card_se_bsc_action", target: "slot_se_bsc", label: "btn_reg_sebsc" },
    { id: "e_csebsc_reg_txt", source: "card_se_bsc_action", target: "slot_se_bsc", label: "Register Now" },

    // Slot Selection (Date Picked) -> ask_name (Primary Delegate)
    { id: "e_sbsc_1", source: "slot_bsc", target: "ask_name", label: "slot_bsc_oct" },
    { id: "e_sbsc_1_txt", source: "slot_bsc", target: "ask_name", label: "13–14 Oct 2026" },
    { id: "e_sbsc_2", source: "slot_bsc", target: "ask_name", label: "slot_bsc_dec" },
    { id: "e_sbsc_2_txt", source: "slot_bsc", target: "ask_name", label: "14–15 Dec 2026" },

    { id: "e_sstr_1", source: "slot_strategy", target: "ask_name", label: "slot_str_oct" },
    { id: "e_sstr_1_txt", source: "slot_strategy", target: "ask_name", label: "26–27 Oct 2026" },
    { id: "e_sstr_2", source: "slot_strategy", target: "ask_name", label: "slot_str_dec" },
    { id: "e_sstr_2_txt", source: "slot_strategy", target: "ask_name", label: "21–22 Dec 2026" },

    { id: "e_sperf_1", source: "slot_perf", target: "ask_name", label: "slot_perf_oct" },
    { id: "e_sperf_1_txt", source: "slot_perf", target: "ask_name", label: "19–20 Oct 2026" },
    { id: "e_sperf_2", source: "slot_perf", target: "ask_name", label: "slot_perf_nov" },
    { id: "e_sperf_2_txt", source: "slot_perf", target: "ask_name", label: "25–26 Nov 2026" },

    { id: "e_sexec_1", source: "slot_exec", target: "ask_name", label: "slot_sep_nov" },
    { id: "e_sexec_1_txt", source: "slot_exec", target: "ask_name", label: "9–10 Nov 2026" },

    { id: "e_skpi_1", source: "slot_kpi", target: "ask_name", label: "slot_kpi_nov" },
    { id: "e_skpi_1_txt", source: "slot_kpi", target: "ask_name", label: "15–17 Nov 2026" },
    { id: "e_skpi_2", source: "slot_kpi", target: "ask_name", label: "slot_kpi_dec" },
    { id: "e_skpi_2_txt", source: "slot_kpi", target: "ask_name", label: "1–3 Dec 2026" },

    { id: "e_sse_1", source: "slot_se_bsc", target: "ask_name", label: "slot_sebsc_nov" },
    { id: "e_sse_1_txt", source: "slot_se_bsc", target: "ask_name", label: "2–4 Nov 2026" },

    // Trainer Details (Photo -> Profile & Buttons)
    { id: "e_tr_media_act", source: "trainer_media", target: "trainer_action" },
    { id: "e_tr_reg", source: "trainer_action", target: "courses_list", label: "btn_reg_from_tr" },
    { id: "e_tr_reg_txt", source: "trainer_action", target: "courses_list", label: "Register Now" },
    { id: "e_tr_back", source: "trainer_action", target: "courses_list", label: "btn_courses_tr" },
    { id: "e_tr_back_txt", source: "trainer_action", target: "courses_list", label: "Browse Courses" },

    // Shared Views Navigation
    { id: "e_f_c", source: "fees_view", target: "courses_list", label: "btn_courses" },
    { id: "e_f_c_txt", source: "fees_view", target: "courses_list", label: "Browse Courses" },
    { id: "e_f_s", source: "fees_view", target: "contact_view", label: "btn_support" },
    { id: "e_f_s_txt", source: "fees_view", target: "contact_view", label: "Executive Support" },
    { id: "e_ct_c", source: "contact_view", target: "courses_list", label: "btn_courses" },
    { id: "e_ct_c_txt", source: "contact_view", target: "courses_list", label: "Browse Courses" },

    // Linear Registration Sequence
    { id: "e_reg_1", source: "ask_name", target: "ask_email" },
    { id: "e_reg_2", source: "ask_email", target: "ask_phone" },
    { id: "e_reg_3", source: "ask_phone", target: "ask_second_name" },
    { id: "e_reg_4", source: "ask_second_name", target: "ask_second_email" },
    { id: "e_reg_5", source: "ask_second_email", target: "payment_instructions" },

    // Payment Instructions -> Upload Receipt OR Support
    { id: "e_pay_upload", source: "payment_instructions", target: "payment_receipt", label: "btn_pay_now" },
    { id: "e_pay_upload_txt", source: "payment_instructions", target: "payment_receipt", label: "Pay Now" },
    { id: "e_pay_support", source: "payment_instructions", target: "contact_view", label: "btn_support" },
    { id: "e_pay_support_txt", source: "payment_instructions", target: "contact_view", label: "Executive Support" },

    // Receipt Upload -> Thank you -> End
    { id: "e_rec_1", source: "payment_receipt", target: "thank_you_receipt" },
    { id: "e_rec_2", source: "thank_you_receipt", target: "end_flow" },
  ]

  console.log("Updating BotFlow cmuli51p500aqi3rj8kepufa1 with complete day-by-day syllabus, full trainer bio, and direct registration...")
  const updated = await db.botFlow.update({
    where: { id: flowId },
    data: {
      nodes: JSON.stringify(nodes),
      edges: JSON.stringify(edges),
      publishedNodes: JSON.stringify(nodes),
      publishedEdges: JSON.stringify(edges),
      isActive: true,
      version: { increment: 1 },
    },
  })

  console.log(`✓ BotFlow successfully updated to version ${updated.version} with ${nodes.length} nodes and ${edges.length} edges.`)
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Error updating flow:", err)
    process.exit(1)
  })
