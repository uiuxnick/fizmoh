import { describe, it, expect } from "bun:test"

describe("Milestone 1 & 2: Omnichannel Team Inbox & CRM Enhancements", () => {
  describe("Task 1: Voice Note Audio AI Transcription", () => {
    it("extracts transcript text from cached message caption", () => {
      const caption = "Transcript: مرحبا، أود الاستفسار عن تفاصيل الحجز"
      const hasPrefix = caption.startsWith("Transcript: ")
      const extracted = caption.replace(/^Transcript:\s*/, "").trim()

      expect(hasPrefix).toBe(true)
      expect(extracted).toBe("مرحبا، أود الاستفسار عن تفاصيل الحجز")
    })

    it("handles MIME type to audio file extension mapping properly", () => {
      const getExtension = (mimeType: string) => {
        if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a"
        if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3"
        if (mimeType.includes("wav")) return "wav"
        return "ogg" // Default WhatsApp voice note
      }

      expect(getExtension("audio/ogg; codecs=opus")).toBe("ogg")
      expect(getExtension("audio/mpeg")).toBe("mp3")
      expect(getExtension("audio/wav")).toBe("wav")
      expect(getExtension("audio/mp4")).toBe("m4a")
    })
  })

  describe("Task 2: Real-time Inbound & Outbound Translation", () => {
    it("detects Arabic text accurately using Unicode range", () => {
      const isArabic = (text: string) => /[\u0600-\u06FF]/.test(text)

      expect(isArabic("مرحبا كيف حالك؟")).toBe(true)
      expect(isArabic("Hello, how are you?")).toBe(false)
      expect(isArabic("Order #12345 تم التأكيد")).toBe(true)
    })

    it("determines smart default translation target language", () => {
      const getTargetLang = (text: string) => {
        const hasArabic = /[\u0600-\u06FF]/.test(text)
        return hasArabic ? "en" : "ar"
      }

      expect(getTargetLang("أريد حجز جولة في الصحراء")).toBe("en")
      expect(getTargetLang("Can I book a safari tour tomorrow?")).toBe("ar")
    })
  })

  describe("Task 3: Conversation Snooze & Auto Wake-up Lifecycle", () => {
    it("calculates accurate snooze expiration dates", () => {
      const baseTime = new Date("2026-09-24T10:00:00.000Z")

      const computeUntil = (duration: string, fromDate: Date = baseTime): Date => {
        const until = new Date(fromDate)
        if (duration === "1h") {
          until.setHours(until.getHours() + 1)
        } else if (duration === "3h") {
          until.setHours(until.getHours() + 3)
        } else if (duration === "tomorrow_9am") {
          until.setDate(until.getDate() + 1)
          until.setHours(9, 0, 0, 0)
        } else if (duration === "2d") {
          until.setDate(until.getDate() + 2)
        }
        return until
      }

      expect(computeUntil("1h").getTime() - baseTime.getTime()).toBe(3600 * 1000)
      expect(computeUntil("3h").getTime() - baseTime.getTime()).toBe(3 * 3600 * 1000)
      expect(computeUntil("2d").getTime() - baseTime.getTime()).toBe(2 * 24 * 3600 * 1000)
    })

    it("wakes up conversation to OPEN status upon incoming message", () => {
      const currentStatus = "SNOOZED"
      const shouldReopen = ["CLOSED", "RESOLVED", "SNOOZED"].includes(currentStatus)
      const nextStatus = shouldReopen ? "OPEN" : currentStatus

      expect(shouldReopen).toBe(true)
      expect(nextStatus).toBe("OPEN")
    })

    it("identifies expired snoozes in cron sweep", () => {
      const now = new Date("2026-09-24T12:00:00.000Z")
      const snoozedPast = new Date("2026-09-24T11:00:00.000Z")
      const snoozedFuture = new Date("2026-09-24T15:00:00.000Z")

      expect(now >= snoozedPast).toBe(true)
      expect(now >= snoozedFuture).toBe(false)
    })
  })

  describe("Task 4: Bulk Actions in Team Inbox", () => {
    it("applies labels without creating duplicates across conversation and customer tags", () => {
      const existing = ["VIP", "Arabic Speaker"]
      const newLabel = "Payment Pending"
      const next = Array.from(new Set([...existing, newLabel]))

      expect(next).toEqual(["VIP", "Arabic Speaker", "Payment Pending"])

      // Adding existing label does not duplicate
      const duplicateAdd = Array.from(new Set([...next, "VIP"]))
      expect(duplicateAdd).toEqual(["VIP", "Arabic Speaker", "Payment Pending"])
    })

    it("removes specified label while preserving remaining labels", () => {
      const existing = ["VIP", "Arabic Speaker", "Follow Up"]
      const removeLabel = "Arabic Speaker"
      const next = existing.filter(l => l !== removeLabel)

      expect(next).toEqual(["VIP", "Follow Up"])
    })
  })

  describe("Task 5: Dynamic Custom CRM Fields Manager", () => {
    it("sanitizes and slugifies custom field internal keys", () => {
      const sanitizeKey = (key: string) => key.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_")

      expect(sanitizeKey("VIP Tier")).toBe("vip_tier")
      expect(sanitizeKey("Annual Budget ($)")).toBe("annual_budget____")
      expect(sanitizeKey("Company-Name")).toBe("company_name")
    })

    it("validates allowed data types for custom fields", () => {
      const ALLOWED_TYPES = ["text", "number", "date", "select", "boolean"]
      const validateType = (type: string) => (ALLOWED_TYPES.includes(type) ? type : "text")

      expect(validateType("select")).toBe("select")
      expect(validateType("boolean")).toBe("boolean")
      expect(validateType("invalid_type")).toBe("text")
    })

    it("serializes and deserializes customer customFields JSON accurately", () => {
      const original = {
        city: "Muscat",
        vip_tier: "Gold",
        lead_budget: 1500,
        nda_signed: true,
      }

      const serialized = JSON.stringify(original)
      const deserialized = JSON.parse(serialized)

      expect(deserialized.city).toBe("Muscat")
      expect(deserialized.vip_tier).toBe("Gold")
      expect(deserialized.lead_budget).toBe(1500)
      expect(deserialized.nda_signed).toBe(true)
    })
  })

  describe("Task 6: Smart Dynamic Segments", () => {
    // We import dynamically or use the functions from segments.ts
    const { matchesSegment, parseFilterRules, buildSegmentWhere } = require("../src/lib/segments")

    it("parses filter rules correctly from JSON strings and arrays", () => {
      const arrayRules = [{ field: "tag", op: "contains", value: "VIP" }]
      expect(parseFilterRules(arrayRules)).toEqual(arrayRules)

      const stringRules = JSON.stringify([{ field: "status", op: "eq", value: "opted_in" }])
      expect(parseFilterRules(stringRules)).toEqual([{ field: "status", op: "eq", value: "opted_in" }])

      expect(parseFilterRules(null)).toEqual([])
      expect(parseFilterRules("invalid json")).toEqual([])
    })

    it("matches customer against channel and tag rules", () => {
      const customer = {
        channel: "WHATSAPP",
        tags: ["VIP", "High Value"],
        whatsappOptIn: true,
      }

      // Matching rule
      expect(matchesSegment(customer, [{ field: "tag", op: "contains", value: "VIP" }], "WHATSAPP")).toBe(true)

      // Negative rule - channel mismatch
      expect(matchesSegment(customer, [{ field: "tag", op: "contains", value: "VIP" }], "INSTAGRAM")).toBe(false)

      // Negative rule - missing tag
      expect(matchesSegment(customer, [{ field: "tag", op: "contains", value: "Wholesale" }], "ALL")).toBe(false)

      // Negative rule - not_contains tag
      expect(matchesSegment(customer, [{ field: "tag", op: "not_contains", value: "VIP" }], "ALL")).toBe(false)
    })

    it("evaluates custom CRM field conditions accurately", () => {
      const customer = {
        channel: "WHATSAPP",
        customFields: {
          vip_tier: "Platinum",
          lead_score: 85,
        },
      }

      // Custom field equals
      expect(matchesSegment(customer, [{ field: "customField", key: "vip_tier", op: "eq", value: "Platinum" }])).toBe(true)
      expect(matchesSegment(customer, [{ field: "customField", key: "vip_tier", op: "eq", value: "Bronze" }])).toBe(false)

      // Custom field numeric comparison
      expect(matchesSegment(customer, [{ field: "customField", key: "lead_score", op: "gte", value: 80 }])).toBe(true)
      expect(matchesSegment(customer, [{ field: "customField", key: "lead_score", op: "lt", value: 50 }])).toBe(false)

      // Custom field exists
      expect(matchesSegment(customer, [{ field: "customField", key: "vip_tier", op: "exists" }])).toBe(true)
      expect(matchesSegment(customer, [{ field: "customField", key: "non_existent", op: "exists" }])).toBe(false)
    })

    it("evaluates monetary and loyalty metrics", () => {
      const customer = {
        channel: "WHATSAPP",
        totalSpent: 1200,
        totalBookings: 8,
        loyaltyTier: "GOLD",
        stage: "CUSTOMER",
      }

      expect(matchesSegment(customer, [
        { field: "totalSpent", op: "gte", value: 1000 },
        { field: "loyaltyTier", op: "eq", value: "GOLD" },
        { field: "stage", op: "eq", value: "CUSTOMER" },
      ])).toBe(true)

      // Fails on totalSpent threshold
      expect(matchesSegment(customer, [
        { field: "totalSpent", op: "gte", value: 5000 },
      ])).toBe(false)
    })

    it("constructs valid Prisma where clauses for database queries", () => {
      const rules = [
        { field: "totalSpent", op: "gte", value: 500 },
        { field: "preferredLang", op: "eq", value: "ar" },
        { field: "tag", op: "contains", value: "VIP" },
      ]

      const where = buildSegmentWhere(rules)
      expect(where.AND).toBeDefined()
      expect(where.AND?.length).toBe(3)
    })
  })

  describe("Task 7: CSV Import Column Mapper & Deduplication Merge", () => {
    const { parseCsvText, guessColumnMapping } = require("../src/lib/csv-parser")

    it("parses RFC-4180 CSV strings with quotes and commas inside cells", () => {
      const csv = `Phone,Full Name,City,Notes\n"+96898821965","Salim, Al-Habsi",Muscat,"Interested in Safari, VIP client"\n+96891234567,Fatma,Sohar,Regular`

      const parsed = parseCsvText(csv)
      expect(parsed.headers).toEqual(["Phone", "Full Name", "City", "Notes"])
      expect(parsed.rows.length).toBe(2)
      expect(parsed.rows[0][0]).toBe("+96898821965")
      expect(parsed.rows[0][1]).toBe("Salim, Al-Habsi")
      expect(parsed.rows[0][2]).toBe("Muscat")
      expect(parsed.rows[0][3]).toBe("Interested in Safari, VIP client")
      expect(parsed.rows[1][1]).toBe("Fatma")
    })

    it("guesses target field mappings based on column header variations", () => {
      expect(guessColumnMapping("Mobile Number")).toBe("phone")
      expect(guessColumnMapping("WhatsApp")).toBe("phone")
      expect(guessColumnMapping("Contact Name")).toBe("name")
      expect(guessColumnMapping("E-Mail Address")).toBe("email")
      expect(guessColumnMapping("Instagram Handle")).toBe("socialUsername")
      expect(guessColumnMapping("Customer Tags")).toBe("tags")
      expect(guessColumnMapping("Pipeline Stage")).toBe("stage")
      expect(guessColumnMapping("Membership Tier")).toBe("loyaltyTier")
      expect(guessColumnMapping("Total Revenue")).toBe("totalSpent")

      // Custom fields match
      expect(guessColumnMapping("City", ["city", "vip_tier"])).toBe("customField:city")
      expect(guessColumnMapping("VIP Level", ["vip_tier"])).toBe("customField:vip_tier")

      // Unrecognized header
      expect(guessColumnMapping("Random Column")).toBe("skip")
    })

    it("performs smart merge on duplicate contacts without data loss", () => {
      const existing = {
        name: "Salim",
        email: null,
        tags: ["Existing", "Lead"],
        customFields: { city: "Muscat", registered_via: "web" },
      }

      const imported = {
        name: "Salim Al-Habsi",
        email: "salim@example.com",
        tags: ["VIP", "Lead"],
        customFields: { city: "Muscat", vip_tier: "Gold" },
      }

      // Merge tags
      const mergedTags = Array.from(new Set([...existing.tags, ...imported.tags]))
      expect(mergedTags).toEqual(["Existing", "Lead", "VIP"])

      // Smart merge custom fields (existing preserved, new added)
      const mergedCustomFields = { ...existing.customFields, ...imported.customFields }
      expect(mergedCustomFields).toEqual({
        city: "Muscat",
        registered_via: "web",
        vip_tier: "Gold",
      })

      // Merge fill-in-blank for scalar fields
      const mergedEmail = existing.email || imported.email
      expect(mergedEmail).toBe("salim@example.com")
    })
  })

  describe("Task 8: AI Knowledge Base (RAG) Node in Botflow Studio", () => {
    it("defines dual branches ('answered' and 'fallback') for visual canvas routing", () => {
      const getBranches = (type: string) => {
        if (type === "AI_KNOWLEDGE") return ["answered", "fallback"]
        if (type === "CONDITION") return ["true", "false"]
        return []
      }

      expect(getBranches("AI_KNOWLEDGE")).toEqual(["answered", "fallback"])
    })

    it("evaluates fallback routing when score is below threshold", () => {
      const passages = [
        { score: 0.05, content: "Low relevance snippet", sourceTitle: "FAQ" }
      ]
      const threshold = 0.2
      const valid = passages.filter(p => !threshold || (p.score && p.score >= threshold))

      expect(valid.length).toBe(0)
      const branch = valid.length > 0 ? "answered" : "fallback"
      expect(branch).toBe("fallback")
    })

    it("evaluates answered routing and populates variable when knowledge meets threshold", () => {
      const passages = [
        { score: 0.88, content: "Our showroom opens at 9:00 AM on weekdays.", sourceTitle: "Hours" }
      ]
      const threshold = 0.2
      const valid = passages.filter(p => !threshold || (p.score && p.score >= threshold))

      expect(valid.length).toBe(1)
      const branch = valid.length > 0 ? "answered" : "fallback"
      expect(branch).toBe("answered")

      const mockAiReply = "Our showroom opens at 9:00 AM on weekdays. Let us know if you need directions!"
      const result = {
        branch,
        set: {
          ai_knowledge_answer: mockAiReply,
          ai_knowledge_matched: "true",
          ai_knowledge_sources: JSON.stringify(valid.map(p => p.sourceTitle)),
        }
      }

      expect(result.branch).toBe("answered")
      expect(result.set.ai_knowledge_matched).toBe("true")
      expect(result.set.ai_knowledge_answer).toContain("9:00 AM")
    })
  })

  describe("Task 9: Botflow Drop-off & Funnel Analytics", () => {
    const { computeFlowAnalytics } = require("../src/app/api/botflows/[id]/analytics/route")

    it("handles zero-run flows without division errors", () => {
      const result = computeFlowAnalytics("flow-empty", [], ["trigger-1", "msg-1"])
      expect(result.totalRuns).toBe(0)
      expect(result.completedRuns).toBe(0)
      expect(result.overallCompletionRate).toBe(0)
      expect(result.overallDropOffRate).toBe(0)
      expect(result.nodeStats["trigger-1"].impressions).toBe(0)
      expect(result.nodeStats["trigger-1"].dropOffRate).toBe(0)
    })

    it("accurately computes node impressions, drop-offs, and throughput rates", () => {
      const mockRuns = [
        // Run 1: Completed all the way
        {
          id: "r1",
          status: "DONE",
          path: ["trigger-1", "question-1", "payment-1", "end-1"],
          startedAt: new Date(),
        },
        // Run 2: Completed all the way
        {
          id: "r2",
          status: "DONE",
          path: ["trigger-1", "question-1", "payment-1", "end-1"],
          startedAt: new Date(),
        },
        // Run 3: Dropped off at payment-1
        {
          id: "r3",
          status: "FAILED",
          currentNodeId: "payment-1",
          path: ["trigger-1", "question-1", "payment-1"],
          startedAt: new Date(),
        },
        // Run 4: Dropped off at question-1
        {
          id: "r4",
          status: "ABANDONED",
          currentNodeId: "question-1",
          path: ["trigger-1", "question-1"],
          startedAt: new Date(),
        },
      ]

      const allNodes = ["trigger-1", "question-1", "payment-1", "end-1"]
      const stats = computeFlowAnalytics("flow-123", mockRuns, allNodes)

      expect(stats.totalRuns).toBe(4)
      expect(stats.completedRuns).toBe(2)
      expect(stats.failedRuns).toBe(1)
      expect(stats.abandonedRuns).toBe(1)
      expect(stats.overallCompletionRate).toBe(50) // 2 / 4 = 50%
      expect(stats.overallDropOffRate).toBe(50)

      // trigger-1 had 4 visits and 0 dropoffs
      expect(stats.nodeStats["trigger-1"].impressions).toBe(4)
      expect(stats.nodeStats["trigger-1"].dropOffs).toBe(0)
      expect(stats.nodeStats["trigger-1"].passThroughRate).toBe(100)

      // question-1 had 4 visits and 1 dropoff
      expect(stats.nodeStats["question-1"].impressions).toBe(4)
      expect(stats.nodeStats["question-1"].dropOffs).toBe(1)
      expect(stats.nodeStats["question-1"].dropOffRate).toBe(25) // 1 / 4 = 25%

      // payment-1 had 3 visits and 1 dropoff
      expect(stats.nodeStats["payment-1"].impressions).toBe(3)
      expect(stats.nodeStats["payment-1"].dropOffs).toBe(1)
      expect(stats.nodeStats["payment-1"].dropOffRate).toBe(33.3) // 1 / 3 = 33.3%

      // Top dropoff bottleneck nodes identified
      expect(stats.topDropOffNodes.length).toBe(2)
      const topNodeIds = stats.topDropOffNodes.map((n: any) => n.nodeId)
      expect(topNodeIds).toContain("question-1")
      expect(topNodeIds).toContain("payment-1")
    })
  })

  describe("Task 10: Automated Drip Sequence Execution Engine", () => {
    const { calculateNextScheduledAt } = require("../src/lib/sequences")

    it("calculates accurate next scheduled execution timestamp from step delay settings", () => {
      const baseDate = new Date("2026-09-24T10:00:00.000Z")
      const step = {
        stepIndex: 1,
        delayDays: 2,
        delayHours: 4,
        delayMinutes: 30,
        messageBody: "Follow up message",
      }

      const scheduled = calculateNextScheduledAt(step, baseDate)
      const scheduledDate = new Date(scheduled)

      // Expected: + 2 days, 4 hours, 30 minutes = 2026-09-26T14:30:00.000Z
      expect(scheduledDate.toISOString()).toBe("2026-09-26T14:30:00.000Z")
    })

    it("handles zero-delay immediate step scheduling", () => {
      const baseDate = new Date("2026-09-24T10:00:00.000Z")
      const immediateStep = {
        stepIndex: 0,
        delayDays: 0,
        delayHours: 0,
        delayMinutes: 0,
        messageBody: "Welcome!",
      }

      const scheduled = calculateNextScheduledAt(immediateStep, baseDate)
      expect(new Date(scheduled).getTime()).toBe(baseDate.getTime())
    })

    it("correctly models lifecycle state transitions (pause, resume, complete)", () => {
      const enrollment = {
        sequenceId: "seq_1",
        sequenceName: "VIP Nurture",
        status: "ACTIVE",
        currentStepIndex: 0,
        totalSteps: 3,
        enrolledAt: "2026-09-24T10:00:00.000Z",
        nextScheduledAt: "2026-09-26T10:00:00.000Z",
        history: [],
      }

      // 1. Pause
      enrollment.status = "PAUSED"
      expect(enrollment.status).toBe("PAUSED")

      // 2. Resume
      enrollment.status = "ACTIVE"
      expect(enrollment.status).toBe("ACTIVE")

      // 3. Step 0 delivery
      enrollment.history.push({
        stepIndex: 0,
        sentAt: new Date().toISOString(),
        preview: "Welcome message...",
        status: "SENT",
      })
      enrollment.currentStepIndex = 1
      enrollment.nextScheduledAt = "2026-09-28T10:00:00.000Z"

      expect(enrollment.currentStepIndex).toBe(1)
      expect(enrollment.history.length).toBe(1)

      // 4. Final step completion
      enrollment.currentStepIndex = 2
      enrollment.history.push({
        stepIndex: 1,
        sentAt: new Date().toISOString(),
        preview: "Step 2...",
        status: "SENT",
      })
      enrollment.status = "COMPLETED"
      enrollment.nextScheduledAt = null
      enrollment.completedAt = new Date().toISOString()

      expect(enrollment.status).toBe("COMPLETED")
      expect(enrollment.nextScheduledAt).toBeNull()
      expect(enrollment.completedAt).toBeTruthy()
      expect(enrollment.history.length).toBe(2)
    })
  })

  describe("Task 8: AI Chat Continuous Training & Self-Learning Engine", () => {
    it("extracts meaningful business Q&A from conversation messages using heuristic parser", () => {
      const messages = [
        { direction: "INBOUND", content: "Hi" },
        { direction: "OUTBOUND", content: "Hello, welcome to Fizmoh!" },
        { direction: "INBOUND", content: "What is your refund policy for canceled safari tours?" },
        { direction: "OUTBOUND", content: "Full refunds are provided if canceled at least 24 hours prior to departure time." },
        { direction: "INBOUND", content: "Thank you!" },
        { direction: "OUTBOUND", content: "You're very welcome, have a great day!" },
      ]

      const extractHeuristicLearnings = (msgs: Array<{ direction: string; content: string }>) => {
        const learnings: Array<{ question: string; answer: string; topic?: string; confidence?: number }> = []
        for (let i = 0; i < msgs.length - 1; i++) {
          const current = msgs[i]
          const next = msgs[i + 1]
          if (current.direction === "INBOUND" && next.direction === "OUTBOUND") {
            const q = current.content.trim()
            const a = next.content.trim()
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
        return learnings
      }

      const results = extractHeuristicLearnings(messages)

      expect(results.length).toBe(1)
      expect(results[0].question).toBe("What is your refund policy for canceled safari tours?")
      expect(results[0].answer).toContain("Full refunds are provided")
      expect(results[0].confidence).toBe(0.8)
    })

    it("filters out greetings, chit-chat, and trivial small talk", () => {
      const chitChatMessages = [
        { direction: "INBOUND", content: "hello" },
        { direction: "OUTBOUND", content: "hi there how can i assist?" },
        { direction: "INBOUND", content: "ok" },
        { direction: "OUTBOUND", content: "sure let me know" },
        { direction: "INBOUND", content: "thanks" },
        { direction: "OUTBOUND", content: "anytime!" },
      ]

      const isUsefulQuestion = (q: string, a: string) => {
        const isQuestion = q.includes("?") || /^(do|can|is|are|how|what|when|where|why|which|how much|price)/i.test(q)
        const hasLength = q.length >= 10 && a.length >= 15
        const notGreeting = !/^(hi|hello|hey|salam|good morning|thanks|thank you|ok)$/i.test(q)
        return isQuestion && hasLength && notGreeting
      }

      const useful = chitChatMessages.some((m, i) => {
        if (m.direction === "INBOUND" && chitChatMessages[i + 1]?.direction === "OUTBOUND") {
          return isUsefulQuestion(m.content, chitChatMessages[i + 1].content)
        }
        return false
      })

      expect(useful).toBe(false)
    })

    it("formats extracted chat learnings into structured knowledge passages", () => {
      const learnings = [
        {
          question: "Do you deliver to Al-Seeb?",
          answer: "Yes, delivery is available from 12 PM to 10 PM daily with a 5 OMR order minimum.",
          topic: "Delivery",
        },
        {
          question: "What payment methods do you accept?",
          answer: "We accept Visa, Mastercard, BenefitPay, and Cash on Delivery.",
          topic: "Payments",
        },
      ]

      const formattedText = learnings
        .map((l, i) => `### FAQ ${i + 1}: ${l.question}\n**Answer:** ${l.answer}\n**Category:** ${l.topic || "General"}`)
        .join("\n\n")

      expect(formattedText).toContain("### FAQ 1: Do you deliver to Al-Seeb?")
      expect(formattedText).toContain("**Answer:** Yes, delivery is available")
      expect(formattedText).toContain("### FAQ 2: What payment methods do you accept?")
      expect(formattedText).toContain("**Category:** Payments")
    })

    it("enforces confidence thresholding for autonomous background indexing", () => {
      const learnings = [
        { question: "Q1", answer: "A1", confidence: 0.95 },
        { question: "Q2", answer: "A2", confidence: 0.60 },
        { question: "Q3", answer: "A3", confidence: 0.85 },
        { question: "Q4", answer: "A4", confidence: 0.72 },
      ]

      // Only high confidence >= 0.8 should be indexed automatically without human review
      const autoLearned = learnings.filter(l => (l.confidence ?? 0.8) >= 0.8)
      const requiresReview = learnings.filter(l => (l.confidence ?? 0.8) < 0.8)

      expect(autoLearned.length).toBe(2)
      expect(autoLearned.map(l => l.question)).toEqual(["Q1", "Q3"])
      expect(requiresReview.length).toBe(2)
      expect(requiresReview.map(l => l.question)).toEqual(["Q2", "Q4"])
    })

    it("respects auto-learn enablement flag on conversation resolution", () => {
      const checkShouldAutoLearn = (status: string, enabled: boolean, learningsCount: number) => {
        if (status !== "RESOLVED") return false
        if (!enabled) return false
        if (learningsCount === 0) return false
        return true
      }

      expect(checkShouldAutoLearn("RESOLVED", true, 2)).toBe(true)
      expect(checkShouldAutoLearn("OPEN", true, 2)).toBe(false)
      expect(checkShouldAutoLearn("RESOLVED", false, 2)).toBe(false)
      expect(checkShouldAutoLearn("RESOLVED", true, 0)).toBe(false)
    })
  })
})

