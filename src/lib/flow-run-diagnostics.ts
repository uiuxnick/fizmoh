/** Return actionable categories without echoing provider payloads or patient answers. */
export function flowRunDiagnosis(status: string, error: unknown): string {
  if (status === "EXPIRED") return "The reply or continuation window expired."
  if (status === "WAITING") return "Waiting for a customer reply or scheduled continuation."
  if (status !== "FAILED") return "No failure reported."
  const message = typeof error === "string" ? error.toLowerCase() : ""
  if (/timeout|timed out/.test(message)) return "An operation timed out. Check provider availability and the current node."
  if (/rate.?limit|\b429\b/.test(message)) return "The provider rate limit was reached. Review channel capacity before retrying."
  if (/token|credential|unauthori[sz]ed|\b401\b/.test(message)) return "Channel authorization failed. Check the channel connection and credentials."
  if (/node.*(missing|not found)|unknown node/.test(message)) return "A referenced node is missing. Validate the published graph."
  if (/invalid|validation/.test(message)) return "Node input or provider validation failed. Review the node configuration."
  return "Execution failed. Use the run ID and current node to locate the server error."
}
