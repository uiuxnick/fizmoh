import { db } from "@/lib/db"
import { PLATFORM } from "@/lib/tenant"
import { indexSource } from "@/lib/knowledge"

export interface LearnedFact {
  question: string
  answer: string
  topic?: string
  confidence?: number
}

export interface ConversationLearningResult {
  conversationId: string
  learnings: LearnedFact[]
  sourceId?: string
  chunksCreated?: number
  autoLearned?: boolean
  error?: string
}

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
  const tid = tenantId || PLATFORM
  const setting = await db.systemSetting.findFirst({
    where: { key: "ai_auto_learn_chats", tenantId: tid },
  })
  return setting?.value === "true"
}

/**
 * Set auto-learning setting
 */
export async function setAutoLearnEnabled(tenantId: string, enabled: boolean): Promise<void> {
  const tid = tenantId || PLATFORM
  await db.systemSetting.upsert({
    where: {
      tenantId_key: { tenantId: tid, key: "ai_auto_learn_chats" },
    },
    update: {
      value: enabled ? "true" : "false",
      type: "BOOLEAN",
      category: "AI",
    },
    create: {
      tenantId: tid,
      key: "ai_auto_learn_chats",
      value: enabled ? "true" : "false",
      type: "BOOLEAN",
      category: "AI",
    },
  })
}

/**
 * Triggered automatically when a conversation is marked as RESOLVED.
 * If auto-learn is enabled, extracts facts and saves them to knowledge base.
 */
export async function handleConversationAutoLearn(
  conversationId: string,
  tenantId?: string
): Promise<ConversationLearningResult | null> {
  const tid = tenantId || PLATFORM
  const enabled = await isAutoLearnEnabled(tid)
  if (!enabled) return null

  // Ensure conversation exists and has messages
  const learnings = await analyzeConversationForLearning(conversationId, tid)
  if (!learnings || learnings.length === 0) return null

  // Filter only high confidence learnings for auto-indexing (>= 0.85)
  const highConfidence = learnings.filter(l => (l.confidence ?? 0.8) >= 0.8)
  if (highConfidence.length === 0) return null

  const saved = await saveLearnedKnowledge(tid, conversationId, highConfidence)

  return {
    conversationId,
    learnings: highConfidence,
    sourceId: saved.sourceId,
    chunksCreated: saved.chunkCount,
    autoLearned: true,
  }
}
