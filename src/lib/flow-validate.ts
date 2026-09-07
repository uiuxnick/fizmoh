import { normalizeFlowGraph } from "@/lib/flow-normalizer"

/**
 * What is wrong with a flow, before a customer finds out.
 *
 * Every bot fault this week was structural and would have been caught here:
 * a condition whose branches carried no labels, so the walk took whichever
 * edge was drawn first and sent men to the women's coach; a question with
 * nothing after it, so the customer answered into silence; a graph the engine
 * could not read at all, so the bot simply never replied.
 *
 * None of it announced itself. A flow looks complete in the builder whether or
 * not it can actually run, which is the reason to check it at the point of
 * saving rather than hoping someone tests every branch.
 *
 * "error" means the flow cannot work. "warning" means it will run but will
 * probably behave in a way its author did not intend.
 */

export type FlowIssue = {
  level: "error" | "warning"
  nodeId?: string
  message: string
}

const TERMINAL = new Set(["END", "HANDOFF"])
const YES = new Set(["true", "yes", "y", "1"])
const NO = new Set(["false", "no", "n", "0"])

export function validateFlow(rawNodes: unknown, rawEdges: unknown): FlowIssue[] {
  const { nodes, edges } = normalizeFlowGraph(rawNodes, rawEdges)
  const issues: FlowIssue[] = []

  if (nodes.length === 0) {
    return [{ level: "error", message: "This flow has no nodes, so it will never reply." }]
  }

  const byId = new Map(nodes.map(node => [node.id, node]))
  if (byId.size !== nodes.length) issues.push({ level: "error", message: "Every step must have a unique ID." })
  if (nodes.length > 250 || edges.length > 1000) issues.push({ level: "error", message: "A flow supports at most 250 steps and 1000 connections." })
  const outgoing = new Map<string, typeof edges>()
  for (const edge of edges) {
    if (!byId.has(edge.source)) issues.push({ level: "error", message: `Connection starts at a missing step (${edge.source}).` })
    if (edge.source === edge.target) issues.push({ level: "error", nodeId: edge.source, message: "A step cannot connect directly to itself." })
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge])
  }

  // An edge pointing at a node that no longer exists silently ends the walk.
  for (const edge of edges) {
    if (!byId.has(edge.target)) {
      issues.push({ level: "error", nodeId: edge.source, message: `Goes to a step that no longer exists (${edge.target}).` })
    }
  }

  const start = nodes.find(node => node.type === "TRIGGER") ?? nodes[0]
  const reached = new Set<string>()
  const stack = [start.id]
  while (stack.length) {
    const current = stack.pop()!
    if (reached.has(current)) continue
    reached.add(current)
    for (const edge of outgoing.get(current) ?? []) stack.push(edge.target)
  }

  for (const node of nodes) {
    const next = outgoing.get(node.id) ?? []
    if (node.type === "HTTP" && node.data.method && !["GET", "POST"].includes(node.data.method)) issues.push({ level: "error", nodeId: node.id, message: "HTTP steps support GET or POST." })
    if (node.type === "DELAY" && (!Number.isFinite(Number(node.data.seconds)) || Number(node.data.seconds) < 1 || Number(node.data.seconds) > 86400)) issues.push({ level: "error", nodeId: node.id, message: "Delay must be between 1 and 86400 seconds." })
    if (["HTTP", "AI", "BOOKING"].includes(node.type) && !next.some(e => e.label === "failed")) issues.push({ level: "warning", nodeId: node.id, message: "Add a failed branch so an unsuccessful step cannot continue as if it succeeded." })

    if (!reached.has(node.id)) {
      issues.push({ level: "warning", nodeId: node.id, message: "Nothing leads here, so this step can never run." })
    }

    if (!TERMINAL.has(node.type) && next.length === 0) {
      issues.push({ level: "error", nodeId: node.id, message: "Nothing follows this step — the customer would be left with no reply." })
    }

    if (node.type === "CONDITION") {
      const labels = next.map(edge => (edge.label ?? "").trim().toLowerCase())
      const hasYes = labels.some(label => YES.has(label))
      const hasNo = labels.some(label => NO.has(label))
      if (next.length >= 2 && !(hasYes && hasNo)) {
        issues.push({
          level: "error",
          nodeId: node.id,
          message: "Both branches must be labelled yes and no, or the answer decides nothing and the first branch always wins.",
        })
      }
    }

    if (node.type === "QUESTION") {
      if (next.length > 1) {
        issues.push({ level: "warning", nodeId: node.id, message: "A question should lead to one step; extra connections are ignored." })
      }
      if (!node.data?.name) {
        issues.push({ level: "warning", nodeId: node.id, message: "This answer is not saved under a name, so later steps cannot use it." })
      }
      const options: string[] = Array.isArray(node.data?.options) ? node.data.options : []
      if (node.data?.inputType === "select") {
        if (options.length < 2) {
          issues.push({ level: "error", nodeId: node.id, message: "A choice needs at least two options." })
        }
        if (options.length > 10) {
          issues.push({ level: "error", nodeId: node.id, message: `WhatsApp allows at most 10 options; this has ${options.length}.` })
        }
        // Two or three options render as buttons, which WhatsApp truncates at
        // 20 characters — long enough to cut the meaning out of a choice.
        if (options.length <= 3) {
          for (const option of options.filter(o => o.length > 20)) {
            issues.push({ level: "warning", nodeId: node.id, message: `Option "${option}" is longer than the 20 characters WhatsApp shows on a button.` })
          }
        }
      }
    }

    if (node.type === "BUTTONS") {
      const buttons = Array.isArray(node.data?.buttons) ? node.data.buttons : []
      if (buttons.length > 3) {
        issues.push({ level: "error", nodeId: node.id, message: `WhatsApp allows at most 3 buttons; this has ${buttons.length}. Use a list instead.` })
      }
      if (buttons.length === 0) {
        issues.push({ level: "error", nodeId: node.id, message: "This step offers no buttons." })
      }
      /*
       * An interactive message with no body is refused by WhatsApp.
       *
       * Refused messages used to park the whole conversation: the step still
       * waited for a tap, and the customer had received nothing to tap. The
       * runtime now falls back to plain text, but the text is the question —
       * so a step with neither buttons nor words has nothing to fall back to.
       */
      if (!String(node.data?.text ?? "").trim()) {
        issues.push({ level: "error", nodeId: node.id, message: "This step has no message above its buttons." })
      }
      /*
       * Unlabelled connections are legitimate here.
       *
       * The engine matches a tap to a branch by label first and by position
       * second — the first button leads down the first connection. So an
       * unlabelled pair is a working flow, not a broken one, and warning about
       * it would be a false alarm on flows that behave correctly today.
       *
       * What does break is a count that does not line up: three buttons and
       * two connections means the third tap silently follows the first branch.
       */
      if (next.length > 1 && next.every(edge => !(edge.label ?? "").trim()) && next.length !== buttons.length) {
        issues.push({
          level: "warning",
          nodeId: node.id,
          message: `${buttons.length} buttons but ${next.length} connections — taps are matched by position, so some would go to the wrong step. Label the connections or match the counts.`,
        })
      }

      // Buttons store nothing. A condition later that tests which was tapped
      // has no value to read — the fault that sent every trainee to the same
      // coach. A select question saves its answer; buttons do not.

    }

    if (node.type === "LIST") {
      const rows = Array.isArray(node.data?.rows) ? node.data.rows : []
      // The same fatal case as a buttons step with no buttons, and it was not
      // checked here at all: WhatsApp refuses a list with nothing in it.
      if (rows.length === 0) {
        issues.push({ level: "error", nodeId: node.id, message: "This list has no items." })
      }
      if (!String(node.data?.text ?? "").trim()) {
        issues.push({ level: "error", nodeId: node.id, message: "This step has no message above its list." })
      }
      if (rows.length > 10) {
        issues.push({
          level: "error",
          nodeId: node.id,
          message: `WhatsApp list messages support at most 10 items (currently ${rows.length}).`,
        })
      }
    }

    if (node.type === "HOURS") {
      const labels = next.map(e => (e.label || "").trim().toLowerCase())
      if (next.length > 0 && !labels.includes("open") && !labels.includes("closed")) {
        issues.push({
          level: "warning",
          nodeId: node.id,
          message: "Business hours branch works best with connections labeled 'open' and 'closed'.",
        })
      }
    }

    if (node.type === "HTTP" && !node.data?.url) {
      issues.push({ level: "error", nodeId: node.id, message: "HTTP Request node requires a URL." })
    }

    if (node.type === "TEMPLATE" && !node.data?.templateName) {
      issues.push({ level: "error", nodeId: node.id, message: "WhatsApp Template node requires a template name." })
    }

    if (node.type === "MEDIA" && !node.data?.mediaUrl && !node.data?.url) {
      issues.push({ level: "error", nodeId: node.id, message: "Media node requires a media URL." })
    }

    if (node.type === "MESSAGE" && !String(node.data?.text ?? "").trim()) {
      issues.push({ level: "error", nodeId: node.id, message: "This message is empty." })
    }
  }

  return issues
}
