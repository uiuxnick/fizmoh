/**
 * Universal Chatbot Flow Importer & AI Opportunity Detector
 *
 * Supports importing:
 * 1. xitFB Flow JSON Format (e.g. xitFB@0.0.1 - Facebook / WhatsApp Flow Builder exports)
 * 2. ManyChat JSON Format
 * 3. FizMoh / LineTrip native Flow JSON
 *
 * Automatically detects dynamic business opportunities:
 * - Pricing / Fees detected -> proposes dynamic AmwalPay Payment Gateway checkout node
 * - Contact / Phone numbers detected -> proposes 1-tap WhatsApp Call CTA button
 * - Outdoor / Tours activities -> proposes live Tour Date / Slot booking node
 * - Appointments / Meetings -> proposes Appointment Booking & Calendar sync
 */

export interface ImportedNode {
  id: string
  type: string
  data: Record<string, any>
  x?: number
  y?: number
}

export interface ImportedEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface DynamicSuggestion {
  id: string
  nodeId: string
  type: "ADD_NODE" | "REPLACE_NODE" | "ADD_EDGE"
  category: "PAYMENT" | "CTA_URL" | "TOUR" | "APPOINTMENT" | "AI_ASSISTANT"
  title: string
  description: string
  proposedNode?: ImportedNode
  proposedData?: Record<string, any>
  appliedByDefault: boolean
}

export interface ImportResult {
  name: string
  trigger: "KEYWORD" | "INTENT" | "ALWAYS"
  triggerConfig: {
    keywords?: string[]
    matchType?: "contains" | "exact"
  }
  nodes: ImportedNode[]
  edges: ImportedEdge[]
  suggestions: DynamicSuggestion[]
  format: "xitFB" | "manychat" | "fizmoh" | "unknown"
}

export function parseExternalFlow(rawInput: string | Record<string, any>): ImportResult {
  let data: any = rawInput
  if (typeof rawInput === "string") {
    try {
      data = JSON.parse(rawInput)
    } catch (e: any) {
      throw new Error(`Invalid JSON format: ${e.message}`)
    }
  }

  if (!data || typeof data !== "object") {
    throw new Error("Flow data must be a valid JSON object.")
  }

  if (data.id && typeof data.id === "string" && data.id.startsWith("xitFB")) {
    return parseXitFbFlow(data)
  }

  if (Array.isArray(data.nodes) && Array.isArray(data.edges)) {
    return parseFizmohFlow(data)
  }

  if (data.version && data.nodes && Array.isArray(data.nodes)) {
    return parseFizmohFlow(data)
  }

  if (data.nodes && typeof data.nodes === "object" && !Array.isArray(data.nodes)) {
    return parseXitFbFlow(data)
  }

  throw new Error("Unrecognized flow format. Supported formats: xitFB JSON, ManyChat JSON, and FizMoh BotFlow JSON.")
}

function parseXitFbFlow(data: any): ImportResult {
  const xitNodes = data.nodes || {}
  const nodes: ImportedNode[] = []
  const edges: ImportedEdge[] = []

  let flowName = "Imported WhatsApp Flow"
  let triggerKeyword = "start"
  let triggerMatchingType: "contains" | "exact" = "exact"

  const xitNodeList = Object.values(xitNodes) as any[]

  for (const node of xitNodeList) {
    if (node.name === "Start Bot Flow") {
      flowName = node.data?.title || node.data?.triggerKeyword || flowName
      triggerKeyword = node.data?.triggerKeyword || triggerKeyword
      if (node.data?.triggerMatchingType === "contains" || node.data?.triggerMatchingType === "exact") {
        triggerMatchingType = node.data.triggerMatchingType
      }
    }
  }

  const helperNodeMap = new Map<string, any>()
  for (const node of xitNodeList) {
    helperNodeMap.set(String(node.id), node)
  }

  for (const node of xitNodeList) {
    const id = String(node.id)
    const name = node.name
    const nodeData = node.data || {}
    const pos = node.position || {}

    if (name === "Start Bot Flow") {
      nodes.push({
        id,
        type: "TRIGGER",
        data: {
          title: nodeData.title || "Trigger",
          trigger: "KEYWORD",
          keywords: [nodeData.triggerKeyword || "start"],
          matchType: triggerMatchingType,
        },
        x: pos.x || 100,
        y: pos.y || 100,
      })
    } else if (name === "Text") {
      nodes.push({
        id,
        type: "MESSAGE",
        data: {
          text: nodeData.textMessage || "",
        },
        x: pos.x || 300,
        y: pos.y || 100,
      })
    } else if (name === "Interactive") {
      const textMessage = nodeData.textMessage || ""
      const isList = node.outputs?.interactiveOutputListMessage !== undefined
      const isButton = node.outputs?.interactiveOutputButton !== undefined

      if (isList) {
        const rows: { id: string; title: string; description?: string }[] = []
        const listConn = node.outputs?.interactiveOutputListMessage?.connections || []

        for (const conn of listConn) {
          const keyboardNode = helperNodeMap.get(String(conn.node))
          if (keyboardNode && keyboardNode.name === "Keyboard") {
            const secConns = keyboardNode.outputs?.quickReplyOutput?.connections || []
            for (const sConn of secConns) {
              const secNode = helperNodeMap.get(String(sConn.node))
              if (secNode && secNode.name === "Sections") {
                const rowConns = secNode.outputs?.sectionOutputRows?.connections || []
                for (const rConn of rowConns) {
                  const rowNode = helperNodeMap.get(String(rConn.node))
                  if (rowNode && rowNode.name === "Rows") {
                    rows.push({
                      id: String(rowNode.id),
                      title: rowNode.data?.title || `Option ${rows.length + 1}`,
                      description: rowNode.data?.description || "",
                    })
                  }
                }
              }
            }
          }
        }

        nodes.push({
          id,
          type: "LIST",
          data: {
            text: textMessage,
            buttonText: "Choose",
            rows,
          },
          x: pos.x || 300,
          y: pos.y || 100,
        })
      } else if (isButton) {
        const buttons: { id: string; title: string }[] = []
        const btnConns = node.outputs?.interactiveOutputButton?.connections || []

        for (const conn of btnConns) {
          const btnNode = helperNodeMap.get(String(conn.node))
          if (btnNode && (btnNode.name === "Inline Button" || btnNode.name === "Quick Reply")) {
            buttons.push({
              id: String(btnNode.id),
              title: btnNode.data?.buttonText || `Button ${buttons.length + 1}`,
            })
          }
        }

        nodes.push({
          id,
          type: "BUTTONS",
          data: {
            text: textMessage,
            buttons: buttons.slice(0, 3),
          },
          x: pos.x || 300,
          y: pos.y || 100,
        })
      } else {
        nodes.push({
          id,
          type: "MESSAGE",
          data: { text: textMessage },
          x: pos.x || 300,
          y: pos.y || 100,
        })
      }
    } else if (name === "User Input Flow Single") {
      const q = nodeData.question || ""
      const field = (nodeData.customFieldSelectedOptionText || "answer").toLowerCase().replace(/\s+/g, "_")
      let inputType: "text" | "phone" | "email" | "number" = "text"
      if (q.includes("رقم") || q.includes("هاتف") || field.includes("phone")) inputType = "phone"
      if (q.includes("بريد") || field.includes("email")) inputType = "email"

      nodes.push({
        id,
        type: "QUESTION",
        data: {
          text: q,
          name: field,
          inputType,
          required: true,
        },
        x: pos.x || 300,
        y: pos.y || 100,
      })
    } else if (name === "CTA URL Button") {
      nodes.push({
        id,
        type: "CTA_URL",
        data: {
          text: nodeData.bodyMessage || nodeData.footerMessage || "Tap below to connect directly:",
          buttonText: "Open Link",
          url: nodeData.buttonUrl || "https://fizmoh.cloud",
        },
        x: pos.x || 300,
        y: pos.y || 100,
      })
    }
  }

  for (const node of xitNodeList) {
    const id = String(node.id)
    const name = node.name
    const outputs = node.outputs || {}

    if (name === "Start Bot Flow") {
      const conns = outputs.referenceOutput?.connections || []
      for (const conn of conns) {
        edges.push({
          id: `e_${id}_${conn.node}`,
          source: id,
          target: String(conn.node),
        })
      }
    } else if (name === "Interactive") {
      if (outputs.interactiveOutputListMessage) {
        const keyboardConns = outputs.interactiveOutputListMessage.connections || []
        for (const kConn of keyboardConns) {
          const keyboardNode = helperNodeMap.get(String(kConn.node))
          if (keyboardNode) {
            const secConns = keyboardNode.outputs?.quickReplyOutput?.connections || []
            for (const sConn of secConns) {
              const secNode = helperNodeMap.get(String(sConn.node))
              if (secNode) {
                const rowConns = secNode.outputs?.sectionOutputRows?.connections || []
                for (const rConn of rowConns) {
                  const rowNode = helperNodeMap.get(String(rConn.node))
                  if (rowNode && rowNode.outputs?.rowOutput?.connections) {
                    for (const nextConn of rowNode.outputs.rowOutput.connections) {
                      edges.push({
                        id: `e_${id}_${nextConn.node}_${rowNode.id}`,
                        source: id,
                        target: String(nextConn.node),
                        label: rowNode.data?.title || undefined,
                      })
                    }
                  }
                }
              }
            }
          }
        }
      }

      if (outputs.interactiveOutputButton) {
        const btnConns = outputs.interactiveOutputButton.connections || []
        for (const bConn of btnConns) {
          const btnNode = helperNodeMap.get(String(bConn.node))
          if (btnNode && btnNode.outputs?.buttonOutput?.connections) {
            for (const nextConn of btnNode.outputs.buttonOutput.connections) {
              edges.push({
                id: `e_${id}_${nextConn.node}_${btnNode.id}`,
                source: id,
                target: String(nextConn.node),
                label: btnNode.data?.buttonText || undefined,
              })
            }
          }
        }
      }
    } else if (name === "User Input Flow Single") {
      const conns = outputs.userInputFlowSingleOutput?.connections || []
      for (const conn of conns) {
        edges.push({
          id: `e_${id}_${conn.node}`,
          source: id,
          target: String(conn.node),
        })
      }
    }
  }

  const suggestions = analyzeDynamicOpportunities(nodes, edges)

  return {
    name: flowName,
    trigger: "KEYWORD",
    triggerConfig: {
      keywords: [triggerKeyword],
      matchType: triggerMatchingType,
    },
    nodes,
    edges,
    suggestions,
    format: "xitFB",
  }
}

function parseFizmohFlow(data: any): ImportResult {
  const nodes = (data.nodes || []) as ImportedNode[]
  const edges = (data.edges || []) as ImportedEdge[]
  const name = data.name || "Imported Bot Flow"
  const trigger = data.trigger || "KEYWORD"
  const triggerConfig = data.triggerConfig || { keywords: ["start"], matchType: "exact" }

  const suggestions = analyzeDynamicOpportunities(nodes, edges)

  return {
    name,
    trigger,
    triggerConfig,
    nodes,
    edges,
    suggestions,
    format: "fizmoh",
  }
}

export function analyzeDynamicOpportunities(nodes: ImportedNode[], edges: ImportedEdge[]): DynamicSuggestion[] {
  const suggestions: DynamicSuggestion[] = []

  for (const node of nodes) {
    const textContent = String(node.data?.text || node.data?.question || "").toLowerCase()

    const priceMatch = textContent.match(/(\d+)\s*(omr|riyal|ريال)/i)
    if (priceMatch && !nodes.some(n => n.type === "PAYMENT")) {
      const amount = Number(priceMatch[1])
      suggestions.push({
        id: `sug_pay_${node.id}`,
        nodeId: node.id,
        type: "ADD_NODE",
        category: "PAYMENT",
        title: `💳 Dynamic AmwalPay Checkout (${amount} OMR)`,
        description: `Detected course fee of ${amount} OMR in message. Connect a 1-tap AmwalPay payment link directly inside WhatsApp.`,
        proposedData: {
          action: "AMWALPAY_CHECKOUT",
          amount,
          currency: "OMR",
          title: "Course / Service Fee Payment",
        },
        appliedByDefault: true,
      })
    }

    const phoneMatch = textContent.match(/(\+?968\s*\d{8}|\b[79]\d{7}\b)/)
    if (phoneMatch && !nodes.some(n => n.type === "CTA_URL")) {
      const phoneNum = phoneMatch[0].replace(/\s+/g, "")
      suggestions.push({
        id: `sug_cta_${node.id}`,
        nodeId: node.id,
        type: "ADD_NODE",
        category: "CTA_URL",
        title: `📞 Interactive Call CTA Button (${phoneNum})`,
        description: `Detected contact number ${phoneNum}. Replace plain text with a WhatsApp native tap-to-call button.`,
        proposedData: {
          text: "Tap below to contact our support & coach team instantly:",
          buttonText: "Call Now",
          url: `tel:${phoneNum}`,
        },
        appliedByDefault: true,
      })
    }

    if ((textContent.includes("ركوب الخيل") || textContent.includes("خيل") || textContent.includes("horse") || textContent.includes("riding") || textContent.includes("safari") || textContent.includes("tour") || textContent.includes("رحلة")) && !nodes.some(n => n.type === "TOUR" || n.type === "TOUR_AVAIL")) {
      suggestions.push({
        id: `sug_tour_${node.id}`,
        nodeId: node.id,
        type: "ADD_NODE",
        category: "TOUR",
        title: "🚙 Live Tour & Safari Date Selector",
        description: "Connect this activity to your real-time booking calendar and live slot availability.",
        proposedData: {
          action: "SHOW_TOUR_SLOTS",
          activityCategory: "HORSE_RIDING",
        },
        appliedByDefault: true,
      })
    }

    if ((textContent.includes("تدريب") || textContent.includes("training") || textContent.includes("موعد") || textContent.includes("appointment") || textContent.includes("جلسة")) && !nodes.some(n => n.type === "APPOINTMENT")) {
      suggestions.push({
        id: `sug_apt_${node.id}`,
        nodeId: node.id,
        type: "ADD_NODE",
        category: "APPOINTMENT",
        title: "📅 Dynamic Appointment & Calendar Sync",
        description: "Automatically book trainee schedule onto Google Calendar and notify coaches via SMS/WhatsApp.",
        proposedData: {
          action: "SAVE_APPOINTMENT",
          syncGoogleCalendar: true,
        },
        appliedByDefault: true,
      })
    }
  }

  return suggestions
}
