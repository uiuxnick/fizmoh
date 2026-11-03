import { db } from "@/lib/db"
import { PLATFORM } from "@/lib/tenant"
import { indexSource } from "@/lib/knowledge"

export * from "@/lib/chat-training-types"
import type { LearnedFact, CandidateLearning, AutoLearnConfig, ConversationLearningResult } from "@/lib/chat-training-types"

/**
 * Heuristic fallback extraction in case AI model API is unavailable or returns non-JSON
 */
export function extractHeuristicLearnings(messages: Array<{ direction: string; content: string }>): LearnedFact[] {
  const learnings: LearnedFact[] = []

  for (let i = 0; i < messages.length - 1; i++) {
    const current = messages[i]
    const next = messages[i + 1]

    if (current.direction === "INBOUND" && next.direction === "OUTBOUND") {
      const q = current.content.trim()
      const a = next.content.trim()

      // Look for informative questions with substance (> 10 chars, has question mark or question words)
      const isQuestion = q.includes("?") || /^(do|can|is|are|how|what|when|where|why|which|how much|price)/i.test(q)
      const hasLength = q.length >= 10 && a.length >= 15
      const notGreeting = !/^(hi|hello|hey|salam|good morning|thanks|thank you)$/i.test(q)

      if (isQuestion && hasLength && notGreeting) {
        learnings.push({
          question: q,
          answer: a,
          topic: "Customer Inquiry",
          confidence: 0.8,
        })
      }
    }
  }

  return learnings.slice(0, 5)
}

/**
 * Analyze a full conversation transcript and extract generalized, reusable business knowledge Q&As
 */
export async function analyzeConversationForLearning(
  conversationId: string,
  tenantId?: string
): Promise<LearnedFact[]> {
  const messages = await db.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: { direction: true, content: true, isAiGenerated: true, createdAt: true },
    take: 100,
  })

  if (messages.length < 2) return []

  const transcript = messages
    .filter(m => m.content && m.content.trim())
    .map(m => {
      const speaker = m.direction === "INBOUND" ? "Customer" : (m.isAiGenerated ? "AI Bot" : "Human Agent")
      return `${speaker}: ${m.content.trim()}`
    })
    .join("\n")

  // Try LLM extraction first
  try {
    const { aiChat } = await import("@/lib/ai")
    const prompt = `You are a Chief Knowledge Officer & Training Specialist for an omnichannel business.
Analyze the following conversation transcript between a customer and customer service / staff agents:

--- TRANSCRIPT START ---
${transcript.slice(0, 6000)}
--- TRANSCRIPT END ---

Your job is to identify and extract any reusable, permanent business knowledge, policies, pricing, service terms, answers, or FAQs that the agent explained, so our AI chatbot can learn them for future customers.

STRICT RULES:
1. Extract generalized Q&A pairs. (e.g. Question: "Do you deliver to Al-Seeb?", Answer: "Yes, delivery to Al-Seeb is available daily from 12 PM to 10 PM with a 5 OMR order minimum.")
2. NEVER extract private personal customer info (names, customer phone numbers, delivery addresses, bank details, order numbers, passwords).
3. Ignore temporary conversation filler (greetings, 'thank you', scheduling specific to one person).
4. If no permanent business knowledge or reusable FAQs exist in this chat, return an empty array.

Output format MUST be valid JSON only (no markdown code blocks, no other text):
{
  "learnings": [
    {
      "question": "General customer inquiry",
      "answer": "Accurate, helpful answer based on staff response",
      "topic": "Pricing / Delivery / Policies / Products / Hours / Support",
      "confidence": 0.95
    }
  ]
}`

    const rawResponse = await aiChat(
      [{ role: "user", content: prompt }],
      "en",
      undefined,
      tenantId || null
    )

    // Parse JSON from model output
    const cleanJson = rawResponse.replace(/```json/gi, "").replace(/```/g, "").trim()
    const parsed = JSON.parse(cleanJson)

    if (parsed && Array.isArray(parsed.learnings) && parsed.learnings.length > 0) {
      return parsed.learnings.filter((l: any) => l.question && l.answer)
    }
  } catch (err) {
    // If AI generation failed or wasn't configured, fall back to heuristic extraction
    console.warn("LLM chat learning extraction error, using heuristic parser:", err)
  }

  return extractHeuristicLearnings(messages)
}

/**
 * Save extracted Q&As into tenant KnowledgeBase and index them for vector & keyword search
 */
export async function saveLearnedKnowledge(
  tenantId: string,
  conversationId: string,
  learnings: LearnedFact[],
  createdById?: string
): Promise<{ sourceId: string; chunkCount: number }> {
  const tid = tenantId || PLATFORM

  if (!learnings || learnings.length === 0) {
    throw new Error("No learnings provided to save")
  }

  // Format content for indexing
  const topics = Array.from(new Set(learnings.map(l => l.topic).filter(Boolean))).join(", ")
  const title = `Learned from Chat #${conversationId.slice(-6)}${topics ? ` (${topics})` : ""}`

  const formattedText = learnings
    .map((l, i) => `### FAQ ${i + 1}: ${l.question}\n**Answer:** ${l.answer}\n**Category:** ${l.topic || "General"}`)
    .join("\n\n")

  // Create KnowledgeSource row
  const source = await db.knowledgeSource.create({
    data: {
      tenantId: tid,
      title,
      type: "CONVERSATION",
      url: `/inbox?c=${conversationId}`,
      status: "INDEXING",
      charCount: formattedText.length,
      chunkCount: learnings.length,
      createdById: createdById || null,
    },
  })

  // Index chunks with embeddings
  const result = await indexSource({
    sourceId: source.id,
    text: formattedText,
    heading: `Chat Learning #${conversationId.slice(-6)}`,
    url: `/inbox?c=${conversationId}`,
  })

  return {
    sourceId: source.id,
    chunkCount: result.chunks,
  }
}

/**
 * Check if auto-learning from resolved chats is enabled for workspace
 */
export async function isAutoLearnEnabled(tenantId: string): Promise<boolean> {
  const cfg = await getAutoLearnConfig(tenantId)
  return cfg.enabled
}

/**
 * Set auto-learning setting
 */
export async function setAutoLearnEnabled(tenantId: string, enabled: boolean): Promise<void> {
  await saveAutoLearnConfig(tenantId, { enabled })
}

/**
 * Get comprehensive auto-learning configuration
 */
export async function getAutoLearnConfig(tenantId: string): Promise<AutoLearnConfig> {
  const tid = tenantId || PLATFORM
  const setting = await db.systemSetting.findFirst({
    where: { key: "ai_auto_learn_config", tenantId: tid },
  })
  if (setting?.value) {
    try {
      const cfg = JSON.parse(setting.value)
      return {
        enabled: cfg.enabled ?? false,
        requireApproval: cfg.requireApproval ?? true,
        minConfidence: cfg.minConfidence ?? 0.75,
      }
    } catch {}
  }
  // Check legacy setting
  const legacySetting = await db.systemSetting.findFirst({
    where: { key: "ai_auto_learn_chats", tenantId: tid },
  })
  return {
    enabled: legacySetting?.value === "true",
    requireApproval: true,
    minConfidence: 0.75,
  }
}

/**
 * Save updated auto-learning configuration
 */
export async function saveAutoLearnConfig(
  tenantId: string,
  config: Partial<AutoLearnConfig>
): Promise<AutoLearnConfig> {
  const tid = tenantId || PLATFORM
  const current = await getAutoLearnConfig(tid)
  const updated: AutoLearnConfig = {
    enabled: config.enabled !== undefined ? config.enabled : current.enabled,
    requireApproval: config.requireApproval !== undefined ? config.requireApproval : current.requireApproval,
    minConfidence: config.minConfidence !== undefined ? config.minConfidence : current.minConfidence,
    autoIndexFaqs: config.autoIndexFaqs !== undefined ? config.autoIndexFaqs : (current.autoIndexFaqs ?? true),
  }

  await db.systemSetting.upsert({
    where: { tenantId_key: { tenantId: tid, key: "ai_auto_learn_config" } },
    update: { value: JSON.stringify(updated), type: "JSON", category: "AI" },
    create: { tenantId: tid, key: "ai_auto_learn_config", value: JSON.stringify(updated), type: "JSON", category: "AI" },
  })

  // Also sync legacy key for backward compatibility
  await db.systemSetting.upsert({
    where: { tenantId_key: { tenantId: tid, key: "ai_auto_learn_chats" } },
    update: { value: updated.enabled ? "true" : "false", type: "BOOLEAN", category: "AI" },
    create: { tenantId: tid, key: "ai_auto_learn_chats", value: updated.enabled ? "true" : "false", type: "BOOLEAN", category: "AI" },
  }).catch(() => {})

  return updated
}

/**
 * Get items from the chat learnings review queue
 */
export async function getLearningsQueue(
  tenantId: string,
  filterStatus?: "PENDING" | "APPROVED" | "DISMISSED" | "ALL"
): Promise<CandidateLearning[]> {
  const tid = tenantId || PLATFORM
  const setting = await db.systemSetting.findFirst({
    where: { key: "ai_chat_learnings_queue", tenantId: tid },
  })
  if (!setting?.value) return []
  try {
    const list: CandidateLearning[] = JSON.parse(setting.value)
    if (!Array.isArray(list)) return []
    if (!filterStatus || filterStatus === "ALL") return list
    return list.filter(item => item.status === filterStatus)
  } catch {
    return []
  }
}

/**
 * Add extracted chat facts into the review queue
 */
export async function queueLearnings(
  tenantId: string,
  conversationId: string,
  facts: LearnedFact[]
): Promise<CandidateLearning[]> {
  const tid = tenantId || PLATFORM
  const existing = await getLearningsQueue(tid, "ALL")
  const now = new Date().toISOString()

  const newCandidates: CandidateLearning[] = facts.map((fact, idx) => ({
    id: `cl_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
    conversationId,
    question: fact.question,
    answer: fact.answer,
    topic: fact.topic || "General",
    confidence: fact.confidence ?? 0.85,
    status: "PENDING",
    extractedAt: now,
  }))

  const combined = [...newCandidates, ...existing].slice(0, 500)

  await db.systemSetting.upsert({
    where: { tenantId_key: { tenantId: tid, key: "ai_chat_learnings_queue" } },
    update: { value: JSON.stringify(combined), type: "JSON", category: "AI" },
    create: { tenantId: tid, key: "ai_chat_learnings_queue", value: JSON.stringify(combined), type: "JSON", category: "AI" },
  })

  return newCandidates
}

/**
 * Approve a pending candidate and index it into the KnowledgeBase
 */
export async function approveLearning(
  tenantId: string,
  candidateId: string,
  staffId?: string,
  overrideQA?: { question?: string; answer?: string; topic?: string }
): Promise<{ success: boolean; sourceId?: string }> {
  const tid = tenantId || PLATFORM
  const existing = await getLearningsQueue(tid, "ALL")
  const itemIndex = existing.findIndex(c => c.id === candidateId)
  if (itemIndex < 0) throw new Error("Candidate learning not found")

  const item = existing[itemIndex]
  const question = overrideQA?.question || item.question
  const answer = overrideQA?.answer || item.answer
  const topic = overrideQA?.topic || item.topic || "General"

  // Index into Knowledge Base
  const saved = await saveLearnedKnowledge(
    tid,
    item.conversationId,
    [{ question, answer, topic, confidence: item.confidence }],
    staffId
  )

  item.question = question
  item.answer = answer
  item.topic = topic
  item.status = "APPROVED"
  item.reviewedAt = new Date().toISOString()
  item.reviewedBy = staffId || "staff"
  item.sourceId = saved.sourceId

  existing[itemIndex] = item

  await db.systemSetting.upsert({
    where: { tenantId_key: { tenantId: tid, key: "ai_chat_learnings_queue" } },
    update: { value: JSON.stringify(existing) },
    create: { tenantId: tid, key: "ai_chat_learnings_queue", value: JSON.stringify(existing), type: "JSON", category: "AI" },
  })

  return { success: true, sourceId: saved.sourceId }
}

/**
 * Dismiss a candidate from the review queue
 */
export async function dismissLearning(
  tenantId: string,
  candidateId: string,
  staffId?: string
): Promise<{ success: boolean }> {
  const tid = tenantId || PLATFORM
  const existing = await getLearningsQueue(tid, "ALL")
  const itemIndex = existing.findIndex(c => c.id === candidateId)
  if (itemIndex < 0) throw new Error("Candidate learning not found")

  existing[itemIndex].status = "DISMISSED"
  existing[itemIndex].reviewedAt = new Date().toISOString()
  existing[itemIndex].reviewedBy = staffId || "staff"

  await db.systemSetting.upsert({
    where: { tenantId_key: { tenantId: tid, key: "ai_chat_learnings_queue" } },
    update: { value: JSON.stringify(existing) },
    create: { tenantId: tid, key: "ai_chat_learnings_queue", value: JSON.stringify(existing), type: "JSON", category: "AI" },
  })

  return { success: true }
}

/**
 * Batch approve multiple candidates
 */
export async function batchApproveLearnings(
  tenantId: string,
  candidateIds: string[],
  staffId?: string
): Promise<{ approvedCount: number }> {
  let count = 0
  for (const cid of candidateIds) {
    try {
      await approveLearning(tenantId, cid, staffId)
      count++
    } catch {}
  }
  return { approvedCount: count }
}

/**
 * Batch dismiss multiple candidates
 */
export async function batchDismissLearnings(
  tenantId: string,
  candidateIds: string[],
  staffId?: string
): Promise<{ dismissedCount: number }> {
  let count = 0
  for (const cid of candidateIds) {
    try {
      await dismissLearning(tenantId, cid, staffId)
      count++
    } catch {}
  }
  return { dismissedCount: count }
}

/**
 * Triggered automatically when a conversation is marked as RESOLVED.
 * If auto-learn is enabled, extracts facts and queues or saves them to knowledge base.
 */
export async function handleConversationAutoLearn(
  conversationId: string,
  tenantId?: string
): Promise<ConversationLearningResult | null> {
  const tid = tenantId || PLATFORM
  const config = await getAutoLearnConfig(tid)
  if (!config.enabled) return null

  // Ensure conversation exists and has messages
  const learnings = await analyzeConversationForLearning(conversationId, tid)
  if (!learnings || learnings.length === 0) return null

  // Filter confidence threshold
  const validLearnings = learnings.filter(l => (l.confidence ?? 0.8) >= config.minConfidence)
  if (validLearnings.length === 0) return null

  if (config.requireApproval) {
    // Queue for staff review
    await queueLearnings(tid, conversationId, validLearnings)
    return {
      conversationId,
      learnings: validLearnings,
      autoLearned: false,
    }
  } else {
    // Directly index high-confidence learnings
    const saved = await saveLearnedKnowledge(tid, conversationId, validLearnings)
    // Also record in queue as approved for traceability
    const queued = await queueLearnings(tid, conversationId, validLearnings)
    const existing = await getLearningsQueue(tid, "ALL")
    for (const q of queued) {
      const idx = existing.findIndex(e => e.id === q.id)
      if (idx >= 0) {
        existing[idx].status = "APPROVED"
        existing[idx].sourceId = saved.sourceId
        existing[idx].reviewedAt = new Date().toISOString()
        existing[idx].reviewedBy = "auto-indexer"
      }
    }
    await db.systemSetting.upsert({
      where: { tenantId_key: { tenantId: tid, key: "ai_chat_learnings_queue" } },
      update: { value: JSON.stringify(existing) },
      create: { tenantId: tid, key: "ai_chat_learnings_queue", value: JSON.stringify(existing), type: "JSON", category: "AI" },
    }).catch(() => {})

    return {
      conversationId,
      learnings: validLearnings,
      sourceId: saved.sourceId,
      chunksCreated: saved.chunkCount,
      autoLearned: true,
    }
  }
}
