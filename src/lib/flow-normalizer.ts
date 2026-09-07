export type RawFlowNode = { id?: unknown; type?: unknown; data?: unknown; x?: unknown; y?: unknown }
export type NormalizedFlowNode = { id: string; type: string; data: Record<string, any>; x?: number; y?: number }
export type RawFlowEdge = { id?: unknown; source?: unknown; target?: unknown; label?: unknown; from?: unknown; to?: unknown }
export type NormalizedFlowEdge = { id: string; source: string; target: string; label?: string }

const TYPE_ALIASES: Record<string, string> = {
  SEND_TEXT: "MESSAGE",
  QUICK_REPLY: "BUTTONS",
  HUMAN_HANDOFF: "HANDOFF",
}

const idPart = (value: unknown, fallback: string) => String(value || fallback).trim().slice(0, 120)

/**
 * The graph as stored, whatever shape that is.
 *
 * The builder saves nodes and edges as JSON strings; seeds and templates write
 * arrays. Both were reaching here and only the array survived — a string
 * normalised to an empty graph, so a flow that looked complete in the editor,
 * and passed the engine's own "does it have nodes" check (which parses
 * strings), walked no nodes and answered nothing. Silently, which is why it
 * read as "the bot is not replying" rather than as a broken flow.
 */
function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export function normalizeFlowNodes(value: unknown): NormalizedFlowNode[] {
  const list = asList(value)
  return list.flatMap((raw, index) => {
    if (!raw || typeof raw !== "object") return []
    const node = raw as RawFlowNode
    const id = idPart(node.id, `node_${index + 1}`)
    const originalType = String(node.type || "MESSAGE").toUpperCase()
    const type = TYPE_ALIASES[originalType] || originalType
    /*
     * Where a node keeps its content.
     *
     * Two shapes are in the database. The builder writes `data: { text, buttons }`;
     * older seeded flows write those fields at the top level instead. Only the
     * first was read, so a flat node normalised to `data: {}` — a MESSAGE with
     * no text, which the engine skips, and a BUTTONS with no buttons. The flow
     * stayed active and answered nothing, silently.
     *
     * Anything that is not structural is treated as content, so a flat node
     * keeps what it was written with. A node that already has `data` is left
     * exactly as it was.
     */
    const structural = new Set(["id", "type", "data", "x", "y", "position", "measured", "selected", "dragging"])
    const hasData = node.data && typeof node.data === "object" && !Array.isArray(node.data)
    const data = hasData
      ? { ...(node.data as Record<string, any>) }
      : Object.fromEntries(
          Object.entries(raw as Record<string, unknown>).filter(([key]) => !structural.has(key)),
        )

    for (const key of ["text", "header", "footer", "caption", "instruction", "mediaUrl", "url", "name", "value"]) {
      if (data[key] !== undefined && typeof data[key] !== "string") data[key] = typeof data[key] === "number" ? String(data[key]) : ""
    }
    if (Array.isArray(data.rows)) data.rows = data.rows.filter(Boolean).map((row: any, i: number) => ({
      id: idPart(row.id, `row_${i}`), title: String(row.title ?? row.label ?? ""), description: String(row.description ?? ""),
    }))
    if (originalType === "QUICK_REPLY" || type === "BUTTONS") {
      const buttons = Array.isArray(data.buttons) ? data.buttons : []
      data.buttons = buttons.map((button: any, buttonIndex: number) => typeof button === "string"
        ? { id: `option_${buttonIndex + 1}`, title: button }
        : { id: idPart(button?.id, `option_${buttonIndex + 1}`), title: String(button?.title || button?.text || `Option ${buttonIndex + 1}`).slice(0, 20) })
    }

    return [{ id, type, data, ...(typeof node.x === "number" ? { x: node.x } : {}), ...(typeof node.y === "number" ? { y: node.y } : {}) }]
  })
}

export function normalizeFlowEdges(value: unknown, nodes: NormalizedFlowNode[]): NormalizedFlowEdge[] {
  const ids = new Set(nodes.map(node => node.id))
  const seen = new Set<string>()
  return asList(value).flatMap((raw, index) => {
    if (!raw || typeof raw !== "object") return []
    const edge = raw as RawFlowEdge & { from?: unknown; to?: unknown }
    // `from`/`to` is what the older seeded flows use. An edge written that way
    // referenced nodes by names this function never read, so it was discarded
    // as dangling and the flow lost the only link it had.
    const source = String(edge.source || edge.from || "")
    const target = String(edge.target || edge.to || "")
    if (!source || !target) return []
    const label = edge.label === undefined || edge.label === null ? undefined : String(edge.label).slice(0, 120)
    const key = `${source}|${target}|${label || ""}`
    if (seen.has(key)) return []
    seen.add(key)
    return [{ id: idPart(edge.id, `edge_${index + 1}`), source, target, ...(label ? { label } : {}) }]
  })
}

export function normalizeFlowGraph(nodes: unknown, edges: unknown) {
  let normalizedNodes = normalizeFlowNodes(nodes)
  let normalizedEdges = normalizeFlowEdges(edges, normalizedNodes)
  if (normalizedNodes.length > 0 && !normalizedNodes.some(node => node.type === "TRIGGER")) {
    const triggerId = normalizedNodes.some(node => node.id === "trigger") ? "flow_trigger" : "trigger"
    const first = normalizedNodes[0]
    normalizedNodes = [{ id: triggerId, type: "TRIGGER", data: {}, x: 300, y: 40 }, ...normalizedNodes]
    normalizedEdges = [{ id: `${triggerId}_edge`, source: triggerId, target: first.id }, ...normalizedEdges]
  }
  return { nodes: normalizedNodes, edges: normalizedEdges }
}
