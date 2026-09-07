import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { getAIConfig, isAIConfigured } from "@/lib/ai-provider"

/**
 * Drafts a WhatsApp template or a bot flow from a plain-language brief or diagram image.
 */

const TEMPLATE_INSTRUCTIONS = `You write WhatsApp Business message templates for a tour operator in Oman.

Return ONLY valid JSON:
{
  "name": "lowercase_snake_case, max 60 chars",
  "category": "MARKETING" | "UTILITY",
  "headerType": "NONE" | "TEXT" | "IMAGE",
  "headerContent": "header text, or an empty string",
  "bodyContent": "the message, using {{1}} {{2}} for variables",
  "footerContent": "short footer, or an empty string",
  "buttons": [{ "type": "QUICK_REPLY" | "URL", "text": "max 20 chars", "url": "only for URL" }],
  "variables": ["what each {{n}} means, in order"]
}

Meta's rules, which reject a template if broken:
- A variable may not sit at the very start or the very end of the body.
- Two variables may not be adjacent.
- The body must be long enough to justify its variables — roughly 20 characters of fixed text per variable.
- UTILITY is for messages about an existing order. MARKETING is for anything promotional.
- At most 3 buttons, each at most 20 characters.
- No prices or claims that cannot be substantiated in the body.`

const CAROUSEL_INSTRUCTIONS = `You write WhatsApp carousel templates for a tour operator in Oman.

Return ONLY valid JSON:
{
  "name": "lowercase_snake_case, max 60 chars",
  "category": "MARKETING",
  "bodyContent": "one short line shown above the cards, no variables",
  "footerContent": "short footer, or an empty string",
  "cards": [
    { "body": "max 160 characters about this one tour", "buttons": [{ "type": "QUICK_REPLY", "text": "max 25 chars" }] }
  ]
}

Rules Meta enforces, which reject the whole template if broken:
- Between 2 and 10 cards.
- EVERY card must have the same buttons, of the same types, in the same order. This is the rule that fails most often.
- Card text is at most 160 characters.
- Button labels are at most 25 characters.
- Use QUICK_REPLY unless the brief asks for a link, in which case use URL and include a real url.

Write each card about one specific tour from the operator's list, naming it and
giving a reason to care — what you see, how long it takes, what it costs. Do not
invent tours. Do not put image URLs in the JSON; those are attached separately.`

const FLOW_INSTRUCTIONS = `You are an expert conversational AI architect. You design advanced visual WhatsApp automation bot flows for businesses in Oman & the GCC.

You can also analyze images of flowcharts, hand-drawn wireframes, or architecture diagrams and convert them directly into interactive bot flows.

Available Node Types:
- TRIGGER: Starting event (Keywords or Intent)
- MESSAGE: Plain text message
- BUTTONS: Interactive Quick Reply buttons (up to 3 buttons)
- LIST: Interactive List Menu (up to 10 rows with titles & descriptions)
- CTA_URL: CTA button with website URL or phone number
- LOCATION: Send location name, address, and Google Maps GPS pin
- QUESTION: Ask customer for input (text, email, phone, number, select, date, image, document)
- AI: Smart Assistant responding from knowledge base
- HOSPITAL: Kauvery Hospital Chemotherapy 30-bed Day Care & Doctor Appointment Booking
- HOSP_CHEMO: Direct Chemotherapy Day Care Bed Booking (Normal & Special Wards)
- HOSP_DOCTOR: Oncologist & Doctor Consultation Booking
- HOSP_BED_MAP: Live Bed & Ward Vacancy Map
- TOUR: Dynamic Desert Safaris & Tours in Oman
- TOUR_DETAILS: Featured Tour Card
- TOUR_AVAIL: Check Tour Dates
- PAYMENT: AmwalPay secure payment link with amount & description
- BANK_TRANSFER: Bank account details & receipt screenshot request
- APPOINTMENT: Medical / Salon Consultation Appointment
- APT_RESCHEDULE: Manage / Reschedule / Cancel Appointment
- PRODUCT & CATALOG: WooCommerce products and catalog
- VISA: Oman Visa enquiry and assistance
- RESTAURANT: Table reservation & digital menu
- CONDITION: Branching condition (true/false)
- HOURS: Business hours filter (open/closed)
- SPLIT: A/B traffic split (a/b)
- DELAY: Wait timer (seconds)
- SET: Store custom variable
- TAG: Tag customer profile
- SAVE: Save lead / enquiry
- HANDOFF: Live agent human handover
- END: Complete and end flow

Return ONLY valid JSON:
{
  "name": "short human title (e.g. Kauvery Hospital Triage & Bed Booking)",
  "description": "one line summary of the workflow",
  "trigger": "KEYWORD" | "INTENT",
  "triggerConfig": { "keywords": ["hospital", "chemo", "book doctor"], "matchType": "contains" },
  "nodes": [
    {
      "id": "trigger",
      "type": "TRIGGER",
      "data": {},
      "x": 400,
      "y": 50
    },
    {
      "id": "n1",
      "type": "BUTTONS" | "LIST" | "MESSAGE" | "QUESTION" | "AI" | "HOSPITAL" | "HOSP_CHEMO" | "HOSP_DOCTOR" | "HOSP_BED_MAP" | "TOUR" | "TOUR_DETAILS" | "TOUR_AVAIL" | "PAYMENT" | "BANK_TRANSFER" | "APPOINTMENT" | "CONDITION" | "HOURS" | "SPLIT" | "DELAY" | "HTTP" | "TAG" | "SET" | "SAVE" | "HANDOFF" | "END",
      "data": {
        "text": "Message text with emoji",
        "buttons": [{ "id": "btn1", "title": "Button text" }],
        "rows": [{ "id": "r1", "title": "Title", "description": "Desc" }]
      },
      "x": 400,
      "y": 180
    }
  ],
  "edges": [
    { "id": "e1", "source": "trigger", "target": "n1" }
  ]
}

Layout Guidelines for coordinates:
- Root trigger: x: 400, y: 50
- Home Menu: x: 400, y: 180
- For multi-branch menus, spread children horizontally (e.g. x: 120, x: 380, x: 640, x: 900) and step vertically down (+160px per sequential step).
- Connect all edge IDs and source/target references.`

export const POST = withErrors(withModule("AI", async (request: NextRequest) => {
  if (!(await isAIConfigured())) {
    return NextResponse.json({ error: "No AI provider is configured — add a key in Settings" }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const kind: "flow" | "carousel" | "template" =
    body?.kind === "flow" ? "flow" : body?.kind === "carousel" ? "carousel" : "template"
  const brief = String(body?.brief || "").trim()

  const imageBase64 = body?.imageBase64 || body?.image || ""
  const imageUrl = body?.imageUrl || ""

  if (!brief && !imageBase64 && !imageUrl) {
    return NextResponse.json({ error: "Describe what you want or attach a flowchart image" }, { status: 400 })
  }

  const tours = await db.tour.findMany({
    where: { status: "ACTIVE" },
    select: { name: true, city: true, basePrice: true },
    take: 12,
  })
  const catalogue = tours.map(t => `${t.name} (${t.city}, from ${t.basePrice} OMR)`).join("; ")

  const config = await getAIConfig()
  const instructions =
    kind === "flow" ? FLOW_INSTRUCTIONS : kind === "carousel" ? CAROUSEL_INSTRUCTIONS : TEMPLATE_INSTRUCTIONS

  const current = body?.current
    ? `\n\nThe current draft, to revise rather than replace:\n${JSON.stringify(body.current)}`
    : ""

  const system = `${instructions}\n\nFor reference only, and only if the brief is about them, the operator's live tours are: ${catalogue}${current}\n\nReturn JSON only. No prose, no markdown fences.`

  let raw: string
  try {
    if (config.provider === "openai") {
      const OpenAI = (await import("openai")).default
      const client = new OpenAI({ apiKey: config.openaiKey })

      let userMsgContent: any = brief || "Please generate the complete visual bot flow graph from the provided prompt or diagram."
      if (imageBase64 || imageUrl) {
        userMsgContent = [
          { type: "text", text: brief ? `${brief}\n\nPlease analyze this flowchart/diagram image carefully and reconstruct the exact architecture into visual nodes and edges.` : "Analyze this flowchart/architecture diagram image carefully and reconstruct the exact workflow into visual nodes and edges." },
          {
            type: "image_url",
            image_url: {
              url: imageBase64 ? (imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`) : imageUrl,
            },
          },
        ]
      }

      const completion = await client.chat.completions.create({
        model: config.model || "gpt-4o",
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: userMsgContent }],
      })
      raw = completion.choices[0]?.message?.content || ""
    } else {
      const Anthropic = (await import("@anthropic-ai/sdk")).default
      const client = new Anthropic({ apiKey: config.anthropicKey })

      let userMsgContent: any = brief || "Please generate the complete visual bot flow graph."
      if (imageBase64) {
        const match = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
        const media_type = (match ? match[1] : "image/png") as "image/png" | "image/jpeg" | "image/webp" | "image/gif"
        const data = match ? match[2] : imageBase64
        userMsgContent = [
          {
            type: "image",
            source: { type: "base64", media_type, data },
          },
          {
            type: "text",
            text: brief ? `${brief}\n\nAnalyze this flowchart/diagram image and generate the visual bot flow graph JSON.` : "Analyze this flowchart/diagram image and generate the visual bot flow graph JSON.",
          },
        ]
      }

      const message = await client.messages.create({
        model: config.model || "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        system,
        messages: [{ role: "user", content: userMsgContent }],
      })
      raw = message.content.filter(c => c.type === "text").map(c => (c as { text: string }).text).join("")
    }
  } catch (error) {
    console.error("AI generation failed:", error)
    return NextResponse.json({ error: "The AI provider did not respond" }, { status: 502 })
  }

  let draft: Record<string, unknown>
  try {
    draft = JSON.parse(raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim())
  } catch {
    return NextResponse.json({ error: "The model returned something that was not valid JSON. Try rephrasing." }, { status: 502 })
  }

  if (kind === "carousel") {
    const rawCards = Array.isArray(draft.cards) ? draft.cards as Record<string, unknown>[] : []
    const withImages = await db.tour.findMany({
      where: { status: "ACTIVE" },
      select: { name: true, media: true },
    })
    const imageFor = (text: string) => {
      const tour = withImages.find(t => text.toLowerCase().includes(t.name.toLowerCase().slice(0, 18)))
      if (!tour) return ""
      const parsed = typeof tour.media === "string"
        ? (() => { try { return JSON.parse(tour.media) } catch { return [] } })()
        : tour.media
      return Array.isArray(parsed) ? (parsed as { url?: string }[]).find(m => m.url)?.url ?? "" : ""
    }

    const cards = rawCards.slice(0, 10).map(card => ({
      imageUrl: imageFor(String(card.body || "")),
      body: String(card.body || "").slice(0, 160),
      buttons: (Array.isArray(card.buttons) ? card.buttons : []).slice(0, 2).map((b: Record<string, unknown>) => ({
        type: b.type === "URL" ? "URL" : "QUICK_REPLY",
        text: String(b.text || "Book now").slice(0, 25),
        ...(b.type === "URL" ? { url: String(b.url || "") } : {}),
      })),
    }))

    return NextResponse.json({
      kind,
      draft: {
        name: String(draft.name || "tour_catalogue").toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 60),
        category: "MARKETING",
        bodyContent: String(draft.bodyContent || ""),
        footerContent: String(draft.footerContent || "").slice(0, 60),
        cards,
      },
    })
  }

  if (kind === "flow") {
    let rawNodes: any[] = Array.isArray(draft.nodes) ? draft.nodes : []
    let rawEdges: any[] = Array.isArray(draft.edges) ? draft.edges : []

    if (rawNodes.length === 0) {
      const steps = Array.isArray(draft.steps) ? draft.steps as Record<string, unknown>[] : []
      rawNodes = [{ id: "trigger", type: "TRIGGER", data: {}, x: 400, y: 50 }]
      rawEdges = []
      let previous = "trigger"
      let curY = 200

      steps.forEach((step, index) => {
        const id = `n${index + 1}`
        const kindType = String(step.kind || step.type || "MESSAGE").toUpperCase()
        let nodeData: any = { ...step }

        if (kindType === "QUESTION") {
          nodeData = {
            name: String(step.name || `field_${index + 1}`).toLowerCase().replace(/[^a-z0-9_]/g, "_"),
            text: String(step.text || ""),
            inputType: ["email", "phone", "number", "select", "date", "image", "document"].includes(String(step.inputType))
              ? String(step.inputType) : "text",
            options: Array.isArray(step.options) ? step.options.map(String).slice(0, 20) : [],
            required: step.required !== false,
          }
        } else if (kindType === "AI") {
          nodeData = { instruction: String(step.instruction || step.text || "Reply naturally with knowledge"), useKnowledge: true }
        } else if (kindType === "HOSPITAL") {
          nodeData = { hospMode: step.hospMode || "menu", hospitalText: String(step.text || step.hospitalText || "🏥 Welcome to Kauvery Hospital Day Care & Appointments.") }
        } else if (kindType === "TOUR") {
          nodeData = { tourText: String(step.text || step.tourText || "Explore our Oman Tours & Desert Safaris"), tourCount: Number(step.tourCount || 4) }
        } else if (kindType === "PAYMENT") {
          nodeData = { amount: Number(step.amount || 10), currency: step.currency || "OMR", paymentDescription: step.paymentDescription || "Booking Payment" }
        }

        rawNodes.push({ id, type: kindType, data: nodeData, x: 400, y: curY })
        rawEdges.push({ id: `e${index + 1}`, source: previous, target: id })
        previous = id
        curY += 170
      })
    } else {
      if (!rawNodes.some(n => n.type === "TRIGGER")) {
        rawNodes.unshift({ id: "trigger", type: "TRIGGER", data: {}, x: 400, y: 50 })
        if (rawNodes.length > 1 && !rawEdges.some(e => e.source === "trigger")) {
          rawEdges.unshift({ id: "e_start", source: "trigger", target: rawNodes[1].id })
        }
      }
    }

    if (body?.preview === true) {
      return NextResponse.json({
        kind,
        draft: {
          name: String(draft.name || "Generated flow").slice(0, 200),
          description: String(draft.description || "").slice(0, 1000),
          trigger: draft.trigger === "INTENT" ? "INTENT" : "KEYWORD",
          triggerConfig: draft.triggerConfig ?? { keywords: ["start", "hello"], matchType: "contains" },
          nodes: rawNodes,
          edges: rawEdges,
        },
      })
    }

    const flow = await db.botFlow.create({
      data: {
        name: String(draft.name || "Generated flow").slice(0, 200),
        description: String(draft.description || "").slice(0, 1000) || null,
        trigger: draft.trigger === "INTENT" ? "INTENT" : "KEYWORD",
        triggerConfig: JSON.stringify(draft.triggerConfig ?? { keywords: ["start", "hello"], matchType: "contains" }),
        nodes: JSON.stringify(rawNodes),
        edges: JSON.stringify(rawEdges),
        isActive: false,
        priority: 0,
      },
    })
    return NextResponse.json({ kind, flow }, { status: 201 })
  }

  if (body?.preview === true) {
    return NextResponse.json({
      kind,
      draft: {
        name: String(draft.name || "generated_template").toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 60),
        category: draft.category === "UTILITY" ? "UTILITY" : "MARKETING",
        headerType: String(draft.headerType || "NONE"),
        headerContent: String(draft.headerContent || ""),
        bodyContent: String(draft.bodyContent || ""),
        footerContent: String(draft.footerContent || "").slice(0, 60),
        buttons: (Array.isArray(draft.buttons) ? draft.buttons : []).slice(0, 3).map((b: Record<string, unknown>) => ({
          type: b.type === "URL" ? "URL" : "QUICK_REPLY",
          text: String(b.text || "Learn more").slice(0, 25),
          ...(b.type === "URL" ? { url: String(b.url || "") } : {}),
        })),
        variables: Array.isArray(draft.variables) ? draft.variables.map(String) : [],
      },
    })
  }

  const tpl = await db.template.create({
    data: {
      channel: "WHATSAPP",
      type: "STANDARD",
      name: String(draft.name || "generated_template").toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 60),
      category: draft.category === "UTILITY" ? "UTILITY" : "MARKETING",
      language: "en_US",
      status: "DRAFT",
      bodyContent: String(draft.bodyContent || ""),
      headerContent: String(draft.headerContent || "") || null,
      headerType: String(draft.headerType || "NONE"),
      footerContent: String(draft.footerContent || "").slice(0, 60) || null,
      buttons: draft.buttons ? JSON.stringify(draft.buttons) : undefined,
      variables: draft.variables ? JSON.stringify(draft.variables) : undefined,
    },
  })
  return NextResponse.json({ kind, template: tpl }, { status: 201 })
}))
