import { db } from "@/lib/db"
import { Course } from "@/lib/training-types"

const TENANT_ID = "cmujurq9w005ci36afzax588l"
const FLOW_ID = "cmuli51p500aqi3rj8kepufa1"

async function main() {
  console.log("1. Setting official Bank Muscat (Sarooj Branch) details for Tanfidh...")
  // Upsert bank account
  const existingBank = await db.bankAccount.findFirst({
    where: { tenantId: TENANT_ID }
  })
  if (existingBank) {
    await db.bankAccount.update({
      where: { id: existingBank.id },
      data: {
        bankName: "Bank Muscat",
        accountName: "Tanfidh Management Consultants",
        accountNumber: "0322 027 665 4400 18",
        branch: "Sarooj",
        swiftCode: "BMUSOMRXXXX",
        currency: "OMR",
        isActive: true,
        isDefault: true,
      }
    })
  } else {
    await db.bankAccount.create({
      data: {
        tenantId: TENANT_ID,
        bankName: "Bank Muscat",
        accountName: "Tanfidh Management Consultants",
        accountNumber: "0322 027 665 4400 18",
        branch: "Sarooj",
        swiftCode: "BMUSOMRXXXX",
        currency: "OMR",
        isActive: true,
        isDefault: true,
      }
    })
  }
  console.log("✓ Bank account updated to 0322 027 665 4400 18 (Sarooj Branch)")

  console.log("2. Clearing existing bookings for Tanfidh...")
  await db.systemSetting.upsert({
    where: { tenantId_key: { tenantId: TENANT_ID, key: "training_registrations" } },
    update: { value: JSON.stringify([]), type: "JSON", category: "TRAINING" },
    create: { tenantId: TENANT_ID, key: "training_registrations", value: JSON.stringify([]), type: "JSON", category: "TRAINING" },
  })
  await db.conversation.updateMany({
    where: { tenantId: TENANT_ID },
    data: { flowState: null, bookingState: null, botActive: true, automationPaused: false }
  })
  console.log("✓ Cleared training_registrations and conversation states")

  console.log("3. Seeding all 7 official courses with full day-by-day agendas...")
  const now = new Date().toISOString()

  const trainer = {
    trainerName: "Said bin Saif Al Harthi",
    trainerDesignation: "Executive Director and Senior Consultant and Trainer",
    trainerBio: "Said advises and trains organizations on strategy development, translation and execution, Balanced Scorecards, KPI design, cascading, dashboards and performance reviews. His work spans public and private sector assignments in Oman and Tanzania, helping leadership and departmental teams turn strategic plans into measurable actions. His training combines practical frameworks, facilitated exercises and examples drawn from consulting practice.",
    trainerImage: "/said-al-harthi.jpg",
    trainerCompany: "Tanfidh Management Consultants",
    trainerEmail: "saidalharthy@tanfidh.com",
    trainerPhone: "+968 99 355 438",
  }

  const common = {
    tenantId: TENANT_ID,
    timezone: "Asia/Muscat (GST, UTC+4)",
    mode: "In-person" as const,
    venueName: "Sheraton Oman Hotel",
    address: "Ruwi High Street, Financial District",
    city: "Muscat",
    country: "Sultanate of Oman",
    mapUrl: "https://maps.google.com/?q=Sheraton+Oman+Hotel+Muscat",
    maxSeats: 30,
    availableSeats: 26,
    reservedSeats: 0,
    confirmedSeats: 0,
    waitingList: 0,
    currency: "OMR",
    taxPercent: 0,
    vatPercent: 5,
    paymentTerms: "Direct Bank Transfer / Wire (Bank Muscat Sarooj)",
    offerType: "BOGO" as const,
    offerTitle: "Pay for 1 seat, get 1 seat FREE (Buy 1 Get 1 Free)",
    offerDescription: "Register for 1 paid participant and bring a colleague or team member at ZERO additional cost. Includes all training materials, executive 5-star lunches, and two individual credentials.",
    whatsappNumber: "+96899355438",
    botFlowId: FLOW_ID,
    autoConfirmation: true,
    autoCertificate: true,
    landingPageEnabled: true,
    ...trainer,
    createdAt: now,
    updatedAt: now,
  }

  const courses: Course[] = [
    // 1. BSC
    {
      ...common,
      id: "course_bsc_certified_pro_2026",
      courseId: "BSC-2026-OM",
      slug: "ai-powered-balanced-scorecard-professional",
      name: "AI Powered Certified Balanced Scorecard Professional",
      shortTitle: "Certified BSC Professional with AI",
      category: "Strategy & Balanced Scorecard",
      type: "Certification",
      description: "Translate strategy into a measurable Balanced Scorecard and use AI responsibly to improve design, analysis and review. Includes strategy map, KPI specifications, aligned scorecard and review plan.",
      highlights: [
        "2 Full Days Executive In-Person Programme | 08:30–16:30 | Muscat",
        "Official Certified Balanced Scorecard Professional Credential",
        "Strategy map, KPI definition sheets, scorecard dashboard & review agenda",
        "Sheraton 5-Star Gourmet Lunch & Networking Breaks",
        "Special Offer: Pay for 1 seat, get 1 seat totally free (BOGO)"
      ],
      learningObjectives: [
        "Design a four-perspective strategy map and scorecard (Financial, Customer, Internal, Learning & Growth)",
        "Distinguish strategic outcomes from operational drivers",
        "Specify formulas, units, owners, baselines, targets and thresholds for KPIs",
        "Cascade corporate measures to departments and business units",
        "Interpret scorecard dashboards and use AI to draft performance review narratives"
      ],
      targetAudience: [
        "Strategy and planning leaders",
        "BSC and KPI practitioners",
        "Department heads & PMO leaders",
        "Transformation, HR, finance, quality, risk, audit and digital teams"
      ],
      prerequisites: ["Fundamental understanding of business or organizational management."],
      certificationDetails: "Certified Balanced Scorecard Professional Credential issued by Tanfidh Management Consultants.",
      bannerUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1600&auto=format&fit=crop",
      status: "PUBLISHED",
      startDate: "2026-10-13",
      endDate: "2026-10-14",
      startTime: "08:30 AM",
      endTime: "04:30 PM",
      numDays: 2,
      duration: "2 Days (08:30–16:30)",
      standardPrice: 500,
      discountAmount: 500,
      keyword: "BSC",
    },

    // 2. KPI
    {
      ...common,
      id: "course_kpi_pro_2026",
      courseId: "KPI-2026-OM",
      slug: "ai-powered-certified-kpi-professional",
      name: "AI Powered Certified KPI Professional",
      shortTitle: "Certified KPI Professional with AI",
      category: "KPIs & Performance Analytics",
      type: "Certification",
      description: "Apply the Certified KPI Professional method with responsible AI support for discovery, documentation, analysis and reporting. Accelerate KPI work while preserving sound definitions and human accountability.",
      highlights: [
        "3 Full Days Executive In-Person Programme | 08:30–16:30 | Muscat",
        "Certified KPI Professional Credential with QR Verification",
        "Complete KPI Portfolio, definition sheets, AI validation log & dashboard roadmap",
        "Sheraton 5-Star Gourmet Lunch & Executive Networking",
        "Special Offer: Pay for 1 seat, get 1 seat totally free (BOGO)"
      ],
      learningObjectives: [
        "Build and document KPIs with clear formulas, units, polarity, owners and frequency",
        "Set evidence-based targets and calculate baselines",
        "Use AI to critique candidate KPIs, spot ambiguity, and draft exception narratives",
        "Validate AI outputs manually and detect misleading correlations or gaming",
        "Design executive dashboards and automated KPI governance review routines"
      ],
      targetAudience: [
        "KPI owners & performance specialists",
        "Strategy and performance teams",
        "M&E specialists & data analysts",
        "Department managers and digital leaders"
      ],
      prerequisites: ["Experience in business measurement, planning or reporting."],
      certificationDetails: "Certified KPI Professional Credential issued by Tanfidh Management Consultants.",
      bannerUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1600&auto=format&fit=crop",
      status: "PUBLISHED",
      startDate: "2026-11-15",
      endDate: "2026-11-17",
      startTime: "08:30 AM",
      endTime: "04:30 PM",
      numDays: 3,
      duration: "3 Days (08:30–16:30)",
      standardPrice: 750,
      discountAmount: 750,
      keyword: "KPI",
    },

    // 3. Strategy Execution using BSC
    {
      ...common,
      id: "course_strat_exec_bsc_2026",
      courseId: "SEBSC-2026-OM",
      slug: "ai-powered-strategy-execution-using-balanced-scorecard",
      name: "AI Powered Strategy Execution Using Balanced Scorecard",
      shortTitle: "Strategy Execution with BSC & AI",
      category: "Strategy & Balanced Scorecard",
      type: "Certification",
      description: "Combine Balanced Scorecard strategy execution with AI-assisted analysis, alignment and performance reporting. Speed up structured work while keeping strategic choices with people.",
      highlights: [
        "3 Full Days Executive In-Person Programme | 08:30–16:30 | Muscat",
        "Certified Strategy Execution using BSC Credential",
        "Validated strategy map, aligned scorecard, initiative portfolio & 90-day roadmap",
        "Sheraton 5-Star Gourmet Lunch & Networking Breaks",
        "Special Offer: Pay for 1 seat, get 1 seat totally free (BOGO)"
      ],
      learningObjectives: [
        "Build a connected strategy map and scorecard linking outcomes and drivers",
        "Cascade objectives to departments and identify cross-functional dependencies",
        "Link initiatives, milestones, resources and risks to strategic objectives",
        "Use AI to challenge execution logic and draft performance review narratives",
        "Simulate an executive strategy review with decisions, owners and follow-up"
      ],
      targetAudience: [
        "Executives and strategy offices",
        "BSC and KPI practitioners",
        "PMO, transformation and departmental leaders"
      ],
      prerequisites: ["Prior exposure to strategic planning or BSC concepts recommended."],
      certificationDetails: "Executive Credential issued by Tanfidh Management Consultants.",
      bannerUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1600&auto=format&fit=crop",
      status: "PUBLISHED",
      startDate: "2026-11-02",
      endDate: "2026-11-04",
      startTime: "08:30 AM",
      endTime: "04:30 PM",
      numDays: 3,
      duration: "3 Days (08:30–16:30)",
      standardPrice: 750,
      discountAmount: 750,
      keyword: "SEBSC",
    },

    // 4. Strategy Execution Professional
    {
      ...common,
      id: "course_strategy_exec_pro_2026",
      courseId: "SEP-2026-OM",
      slug: "ai-powered-strategy-execution-professional",
      name: "AI Powered Strategy Execution Professional",
      shortTitle: "Strategy Execution Professional with AI",
      category: "Execution & Governance",
      type: "Certification",
      description: "Develop the leadership, governance and operating rhythm for strategy execution, using AI to test assumptions, identify stalls, and improve the speed of analysis.",
      highlights: [
        "2 Full Days Executive In-Person Programme | 08:30–16:30 | Muscat",
        "Certified Strategy Execution Professional Credential",
        "Execution diagnosis, governance map, review agenda and 90-day action plan",
        "Sheraton 5-Star Gourmet Lunch & Executive Networking",
        "Special Offer: Pay for 1 seat, get 1 seat totally free (BOGO)"
      ],
      learningObjectives: [
        "Assess strategy execution maturity and diagnose capability gaps",
        "Set governance, decision rights, and escalation pathways",
        "Translate strategy into initiatives, milestones and accountable owners",
        "Use AI to test alignment, resource constraints and dependencies",
        "Simulate strategy reviews using dashboards and AI summaries of verified evidence"
      ],
      targetAudience: [
        "Senior and middle managers",
        "Strategy and planning offices",
        "PMO, performance teams and transformation leaders"
      ],
      prerequisites: ["Experience in management or organizational initiatives."],
      certificationDetails: "Certified Strategy Execution Professional Credential issued by Tanfidh.",
      bannerUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1600&auto=format&fit=crop",
      status: "PUBLISHED",
      startDate: "2026-11-09",
      endDate: "2026-11-10",
      startTime: "08:30 AM",
      endTime: "04:30 PM",
      numDays: 2,
      duration: "2 Days (08:30–16:30)",
      standardPrice: 500,
      discountAmount: 500,
      keyword: "EXECUTION",
    },

    // 5. Performance Management Professional
    {
      ...common,
      id: "course_perf_mgmt_pro_2026",
      courseId: "PMP-2026-OM",
      slug: "ai-powered-certified-performance-management-professional",
      name: "AI Powered Certified Performance Management Professional",
      shortTitle: "Performance Management Professional with AI",
      category: "Performance & HR Leadership",
      type: "Certification",
      description: "Build a fair performance management cycle and use AI carefully to support goal quality, evidence synthesis, coaching preparation, and reviews while protecting employee privacy.",
      highlights: [
        "2 Full Days Executive In-Person Programme | 08:30–16:30 | Muscat",
        "Certified Performance Management Professional Credential",
        "Performance framework, goal & KPI templates, review guide and implementation roadmap",
        "Sheraton 5-Star Gourmet Lunch & Executive Networking",
        "Special Offer: Pay for 1 seat, get 1 seat totally free (BOGO)"
      ],
      learningObjectives: [
        "Align organizational, departmental and individual objectives and KPIs",
        "Write measurable expectations, standards, evidence requirements and role ownership",
        "Analyze performance results and separate context, capability and effort",
        "Practice evidence-based feedback, coaching and difficult review conversations",
        "Use AI to critique anonymized goals and prepare coaching notes without bias"
      ],
      targetAudience: [
        "HR and performance leaders",
        "Strategy teams and line managers",
        "Supervisors, finance and quality professionals"
      ],
      prerequisites: ["Supervisory or performance oversight experience."],
      certificationDetails: "Certified Performance Management Professional Credential issued by Tanfidh.",
      bannerUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1600&auto=format&fit=crop",
      status: "PUBLISHED",
      startDate: "2026-10-19",
      endDate: "2026-10-20",
      startTime: "08:30 AM",
      endTime: "04:30 PM",
      numDays: 2,
      duration: "2 Days (08:30–16:30)",
      standardPrice: 500,
      discountAmount: 500,
      keyword: "PERFORMANCE",
    },

    // 6. Strategy Professional
    {
      ...common,
      id: "course_strategy_pro_2026",
      courseId: "STR-2026-OM",
      slug: "ai-powered-certified-strategy-professional",
      name: "AI Powered Certified Strategy Professional",
      shortTitle: "Certified Strategy Professional with AI",
      category: "Strategy Formulation",
      type: "Certification",
      description: "Develop an evidence-based strategy and use AI to structure analysis, challenge assumptions and compare strategic options. Move from broad ambitions to explicit strategic choices.",
      highlights: [
        "2 Full Days Executive In-Person Programme | 08:30–16:30 | Muscat",
        "Certified Strategy Professional Credential with QR Verification",
        "Strategic diagnosis, choice statement, strategy map and implementation roadmap",
        "Sheraton 5-Star Gourmet Lunch & Executive Networking",
        "Special Offer: Pay for 1 seat, get 1 seat totally free (BOGO)"
      ],
      learningObjectives: [
        "Define strategic question, mandate, stakeholders and planning horizon",
        "Use PESTLE, industry and internal capability analysis to build evidence-based insights",
        "Use AI to compare external and internal evidence, spot gaps and challenge SWOT assumptions",
        "Turn strategic choices into themes, long-term goals and specific objectives",
        "Stress-test strategic options, risks and dependencies before executive sign-off"
      ],
      targetAudience: [
        "Executives and strategy professionals",
        "Planning heads & department leaders",
        "Analysts, transformation teams and consultants"
      ],
      prerequisites: ["Experience in organizational planning or business analysis."],
      certificationDetails: "Certified Strategy Professional Credential issued by Tanfidh.",
      bannerUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1600&auto=format&fit=crop",
      status: "PUBLISHED",
      startDate: "2026-10-26",
      endDate: "2026-10-27",
      startTime: "08:30 AM",
      endTime: "04:30 PM",
      numDays: 2,
      duration: "2 Days (08:30–16:30)",
      standardPrice: 500,
      discountAmount: 500,
      keyword: "STRATEGY",
    },

    // 7. OKR Professional (To be announced)
    {
      ...common,
      id: "course_okr_pro_2026",
      courseId: "OKR-2026-OM",
      slug: "ai-powered-certified-okr-professional",
      name: "AI Powered Certified OKR Professional",
      shortTitle: "Certified OKR Professional with AI",
      category: "OKRs & Agility",
      type: "Certification",
      description: "Design Objectives and Key Results and use AI to critique wording, spot alignment gaps and support evidence-based check-ins. Create clearer priorities and a practical check-in rhythm.",
      highlights: [
        "2 Full Days Executive In-Person Programme | 08:30–16:30 | Muscat",
        "Certified OKR Professional Credential",
        "Organizational and team OKR drafts, check-in template and rollout plan",
        "Sheraton 5-Star Gourmet Lunch & Refreshment Breaks",
        "Special Offer: Pay for 1 seat, get 1 seat totally free (BOGO)"
      ],
      learningObjectives: [
        "Write outcome-focused OKRs and align teams around shared outcomes",
        "Distinguish OKRs from KPIs, tasks, and business-as-usual activities",
        "Use AI to critique draft key results for measurability and unintended incentives",
        "Set cycle length, owners, baselines, confidence levels and scoring rules",
        "Design retrospective, communication and governance check-in routines"
      ],
      targetAudience: [
        "Leaders and strategy teams",
        "HR, product and operations managers",
        "PMO and agile team leads"
      ],
      prerequisites: ["Understanding of goal setting or team leadership."],
      certificationDetails: "Certified OKR Professional Credential issued by Tanfidh.",
      bannerUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1600&auto=format&fit=crop",
      status: "PUBLISHED",
      startDate: "2026-12-01",
      endDate: "2026-12-02",
      startTime: "08:30 AM",
      endTime: "04:30 PM",
      numDays: 2,
      duration: "2 Days (To be announced)",
      standardPrice: 500,
      discountAmount: 500,
      keyword: "OKR",
    }
  ]

  await db.systemSetting.upsert({
    where: { tenantId_key: { tenantId: TENANT_ID, key: "training_course_catalog" } },
    update: { value: JSON.stringify(courses), type: "JSON", category: "TRAINING" },
    create: { tenantId: TENANT_ID, key: "training_course_catalog", value: JSON.stringify(courses), type: "JSON", category: "TRAINING" },
  })
  console.log(`✓ Successfully seeded all ${courses.length} courses into training_course_catalog for Tanfidh!`)
}

main().catch(err => {
  console.error("Error:", err)
  process.exit(1)
})
