import { db, raw } from "@/lib/db"
import { PLATFORM, currentTenant, withTenant } from "@/lib/tenant"
import { sendWhatsApp as flowWhatsApp } from "@/lib/flow-delivery"
import { sendEmail, sendWhatsApp as notifyWhatsApp } from "@/lib/notifications"
import { canSendFreeform } from "@/lib/whatsapp-session"

export * from "@/lib/sequence-types"
import type { SequenceStep, DripSequence, SequenceEnrollment, SequenceStats, EnrolledContactSummary } from "@/lib/sequence-types"
import { STARTER_SEQUENCES } from "@/lib/sequence-types"

/**
 * Calculate the next scheduled Date based on step delay settings
 */
export function calculateNextScheduledAt(step: SequenceStep, fromDate: Date = new Date()): string {
  const ms =
    (Number(step.delayDays || 0) * 86400 +
     Number(step.delayHours || 0) * 3600 +
     Number(step.delayMinutes || 0) * 60) * 1000
  return new Date(fromDate.getTime() + ms).toISOString()
}

/**
 * Resolve company name dynamically for a tenant
 */
async function resolveCompanyName(tenantId: string): Promise<string> {
  const tid = tenantId || PLATFORM
  try {
    const { getConfigValue } = await import("@/lib/app-config")
    const configuredName = await getConfigValue("business_name").catch(() => "")
    if (configuredName?.trim()) {
      return configuredName.trim()
    }
    const tenantRow = await raw.tenant.findUnique({
      where: { id: tid },
      select: { name: true },
    })
    if (tenantRow?.name?.trim()) {
      return tenantRow.name.trim()
    }
  } catch {}
  return "Our Company"
}

/**
 * Fetch all configured Sequences for a tenant
 */
export async function getTenantSequences(tenantId: string): Promise<DripSequence[]> {
  const tid = tenantId || PLATFORM
  const setting = await db.systemSetting.findFirst({
    where: { key: "crm_drip_sequences", tenantId: tid },
  })

  let sequences: DripSequence[] = []
  if (setting?.value) {
    try {
      sequences = JSON.parse(setting.value)
    } catch {
      sequences = []
    }
  } else if (!setting) {
    // Only return default starter templates if setting row has never been saved
    sequences = STARTER_SEQUENCES.map(s => ({ ...s, tenantId: tid }))
  }

  return sequences
}

/**
 * Save or update a Sequence
 */
export async function saveTenantSequence(tenantId: string, seq: Partial<DripSequence>): Promise<DripSequence> {
  const tid = tenantId || PLATFORM
  const existing = await getTenantSequences(tid)

  const id = seq.id || `seq_${Date.now()}`
  const now = new Date().toISOString()

  const fullSeq: DripSequence = {
    id,
    tenantId: tid,
    name: seq.name || "Untitled Sequence",
    description: seq.description || "",
    channel: seq.channel || "WHATSAPP",
    isActive: seq.isActive !== false,
    trigger: seq.trigger || "MANUAL",
    triggerConfig: seq.triggerConfig || {},
    steps: Array.isArray(seq.steps) ? seq.steps : [],
    createdAt: seq.createdAt || now,
    updatedAt: now,
  }

  const index = existing.findIndex(s => s.id === id)
  if (index >= 0) {
    existing[index] = fullSeq
  } else {
    existing.push(fullSeq)
  }

  await db.systemSetting.upsert({
    where: {
      tenantId_key: { tenantId: tid, key: "crm_drip_sequences" },
    },
    update: {
      value: JSON.stringify(existing),
      type: "JSON",
      category: "CRM",
    },
    create: {
      tenantId: tid,
      key: "crm_drip_sequences",
      value: JSON.stringify(existing),
      type: "JSON",
      category: "CRM",
    },
  })

  return fullSeq
}

/**
 * Delete a sequence definition
 */
export async function deleteTenantSequence(tenantId: string, id: string): Promise<boolean> {
  const tid = tenantId || PLATFORM
  const existing = await getTenantSequences(tid)
  const filtered = existing.filter(s => s.id !== id)

  await db.systemSetting.upsert({
    where: {
      tenantId_key: { tenantId: tid, key: "crm_drip_sequences" },
    },
    update: {
      value: JSON.stringify(filtered),
    },
    create: {
      tenantId: tid,
      key: "crm_drip_sequences",
      value: JSON.stringify(filtered),
      type: "JSON",
      category: "CRM",
    },
  })

  return true
}

/**
 * Retrieve all sequence enrollments for a given subscriber
 */
export async function getSubscriberEnrollments(customerId: string): Promise<SequenceEnrollment[]> {
  const customer = await db.customer.findUnique({
    where: { id: customerId },
    select: { customFields: true },
  })

  if (!customer?.customFields) return []

  const cf = typeof customer.customFields === "string"
    ? JSON.parse(customer.customFields)
    : customer.customFields

  if (!cf || !Array.isArray(cf.sequences)) return []
  return cf.sequences as SequenceEnrollment[]
}

/**
 * Enroll a subscriber in a drip sequence
 */
export async function enrollSubscriberInSequence(
  customerId: string,
  sequenceId: string,
  tenantId: string,
  triggerFirstStepImmediately: boolean = true
): Promise<{ success: boolean; enrollment?: SequenceEnrollment; error?: string }> {
  const tid = tenantId || PLATFORM
  const sequences = await getTenantSequences(tid)
  const sequence = sequences.find(s => s.id === sequenceId)

  if (!sequence) {
    return { success: false, error: "Sequence not found" }
  }

  const customer = await db.customer.findUnique({
    where: { id: customerId },
  })

  if (!customer) {
    return { success: false, error: "Customer not found" }
  }

  const cf = (customer.customFields
    ? (typeof customer.customFields === "string" ? JSON.parse(customer.customFields) : customer.customFields)
    : {}) as Record<string, any>

  const existingList: SequenceEnrollment[] = Array.isArray(cf.sequences) ? cf.sequences : []

  // Check if already actively enrolled
  const existingActive = existingList.find(e => e.sequenceId === sequenceId && e.status === "ACTIVE")
  if (existingActive) {
    return { success: false, error: "Subscriber is already actively enrolled in this sequence" }
  }

  const firstStep = sequence.steps[0]
  const delayMs = firstStep
    ? (Number(firstStep.delayDays || 0) * 86400 +
       Number(firstStep.delayHours || 0) * 3600 +
       Number(firstStep.delayMinutes || 0) * 60) * 1000
    : 0

  const shouldSendNow = triggerFirstStepImmediately || delayMs === 0
  const nextScheduledAt = shouldSendNow
    ? new Date().toISOString()
    : calculateNextScheduledAt(firstStep)

  const newEnrollment: SequenceEnrollment = {
    sequenceId: sequence.id,
    sequenceName: sequence.name,
    status: "ACTIVE",
    currentStepIndex: 0,
    totalSteps: sequence.steps.length,
    enrolledAt: new Date().toISOString(),
    nextScheduledAt,
    history: [],
  }

  // Update or append
  const updatedList = existingList.filter(e => e.sequenceId !== sequenceId)
  updatedList.push(newEnrollment)
  cf.sequences = updatedList

  await db.customer.update({
    where: { id: customerId },
    data: { customFields: cf },
  })

  // If first step has 0 delay and immediate trigger, execute step 0 now under tenant context
  if (shouldSendNow && firstStep) {
    await withTenant({ tenantId: tid, slug: "" }, async () => {
      await executeSequenceStep(customer, sequence, newEnrollment, firstStep)
    })
  }

  return { success: true, enrollment: newEnrollment }
}

/**
 * Automatically trigger sequences matching an event (e.g. ON_SUBSCRIBE, TAG_ADDED, STAGE_CHANGE)
 */
export async function handleSequenceTriggerEvent(event: {
  tenantId: string
  customerId: string
  trigger: "ON_SUBSCRIBE" | "TAG_ADDED" | "STAGE_CHANGE"
  tag?: string
  stage?: string
}): Promise<{ enrolled: number }> {
  const tid = event.tenantId || PLATFORM

  // If auto-replies or bot are disabled for this tenant, DO NOT trigger automatic welcome sequences
  try {
    const { getConfigValue } = await import("@/lib/app-config")
    const [botVal, waBotVal, autoVal, aiVal] = await Promise.all([
      getConfigValue("bot_enabled", tid).catch(() => ""),
      getConfigValue("wa_bot_enabled", tid).catch(() => ""),
      getConfigValue("auto_reply_enabled", tid).catch(() => ""),
      getConfigValue("ai_assistant_enabled", tid).catch(() => ""),
    ])
    const isOff = (v: string) => {
      const s = String(v ?? "").trim().toLowerCase()
      return s === "false" || s === "off" || s === "0"
    }
    if (isOff(botVal) || isOff(waBotVal) || isOff(autoVal) || isOff(aiVal)) {
      console.log(`[sequences] Auto-replies disabled for tenant ${tid}. Skipping automatic sequence triggers.`)
      return { enrolled: 0 }
    }
  } catch {}

  const sequences = await getTenantSequences(tid)
  let enrolledCount = 0

  for (const seq of sequences) {
    if (!seq.isActive || seq.trigger !== event.trigger) continue

    // Trigger config conditions
    if (event.trigger === "TAG_ADDED" && seq.triggerConfig?.tag) {
      if (seq.triggerConfig.tag.trim().toLowerCase() !== (event.tag || "").trim().toLowerCase()) {
        continue
      }
    }

    if (event.trigger === "STAGE_CHANGE" && seq.triggerConfig?.stage) {
      if (seq.triggerConfig.stage.trim().toUpperCase() !== (event.stage || "").trim().toUpperCase()) {
        continue
      }
    }

    const res = await enrollSubscriberInSequence(event.customerId, seq.id, tid, true)
    if (res.success) {
      enrolledCount++
    }
  }

  return { enrolled: enrolledCount }
}

/**
 * Helper to update customer enrollment inside customFields JSON
 */
async function persistCustomerEnrollment(customer: any, sequenceId: string, enrollment: SequenceEnrollment) {
  const cf = (customer.customFields
    ? (typeof customer.customFields === "string" ? JSON.parse(customer.customFields) : customer.customFields)
    : {}) as Record<string, any>

  const list: SequenceEnrollment[] = Array.isArray(cf.sequences) ? cf.sequences : []
  const idx = list.findIndex(e => e.sequenceId === sequenceId)
  if (idx >= 0) {
    list[idx] = enrollment
  } else {
    list.push(enrollment)
  }
  cf.sequences = list

  await db.customer.update({
    where: { id: customer.id },
    data: { customFields: cf },
  }).catch(() => {})
}

/**
 * Advance enrollment to the next step when current step is skipped due to condition or stop trigger
 */
async function advanceToNextStep(
  customer: any,
  sequence: DripSequence,
  enrollment: SequenceEnrollment,
  step: SequenceStep,
  previewText: string
): Promise<boolean> {
  enrollment.history.push({
    stepIndex: step.stepIndex,
    sentAt: new Date().toISOString(),
    preview: previewText,
    status: "SENT",
  })

  const nextStepIndex = step.stepIndex + 1
  if (nextStepIndex < sequence.steps.length) {
    enrollment.currentStepIndex = nextStepIndex
    const nextStep = sequence.steps[nextStepIndex]
    enrollment.nextScheduledAt = calculateNextScheduledAt(nextStep)
  } else {
    enrollment.status = "COMPLETED"
    enrollment.nextScheduledAt = null
    enrollment.completedAt = new Date().toISOString()
  }

  await persistCustomerEnrollment(customer, sequence.id, enrollment)
  return true
}

/**
 * Execute a single step in a sequence for a customer
 */
export async function executeSequenceStep(
  customer: any,
  sequence: DripSequence,
  enrollment: SequenceEnrollment,
  step: SequenceStep
): Promise<boolean> {
  const targetTenantId = customer.tenantId || sequence.tenantId || PLATFORM

  // Ensure execution runs within tenant context
  return await withTenant({ tenantId: targetTenantId, slug: "" }, async () => {
    // 1. Check Smart Stop: stopOnReply
    const stopOnReply = step.stopOnReply ?? sequence.triggerConfig?.stopOnReply ?? false
    if (stopOnReply && enrollment.enrolledAt) {
      const inboundMessage = await db.message.findFirst({
        where: {
          tenantId: targetTenantId,
          customerId: customer.id,
          direction: "INBOUND",
          createdAt: { gte: new Date(enrollment.enrolledAt) },
        },
      })
      if (inboundMessage) {
        enrollment.status = "COMPLETED"
        enrollment.nextScheduledAt = null
        enrollment.completedAt = new Date().toISOString()
        enrollment.history.push({
          stepIndex: step.stepIndex,
          sentAt: new Date().toISOString(),
          preview: "[Sequence Stopped: Customer replied to conversation]",
          status: "SENT",
        })
        await persistCustomerEnrollment(customer, sequence.id, enrollment)
        return true
      }
    }

    // 2. Check Smart Stop: stopOnOrder
    const stopOnOrder = step.stopOnOrder ?? sequence.triggerConfig?.stopOnOrder ?? false
    if (stopOnOrder && enrollment.enrolledAt) {
      const recentOrder = await db.order.findFirst({
        where: {
          tenantId: targetTenantId,
          customerId: customer.id,
          createdAt: { gte: new Date(enrollment.enrolledAt) },
        },
      })
      if (recentOrder) {
        enrollment.status = "COMPLETED"
        enrollment.nextScheduledAt = null
        enrollment.completedAt = new Date().toISOString()
        enrollment.history.push({
          stepIndex: step.stepIndex,
          sentAt: new Date().toISOString(),
          preview: `[Sequence Stopped: Customer placed order #${recentOrder.orderNumber || recentOrder.id.slice(-6)}]`,
          status: "SENT",
        })
        await persistCustomerEnrollment(customer, sequence.id, enrollment)
        return true
      }
    }

    // 3. Step conditions (tag, excludeTag, stage)
    if (step.condition) {
      let custTags: string[] = []
      if (Array.isArray(customer.tags)) {
        custTags = customer.tags
      } else if (typeof customer.tags === "string") {
        try {
          const parsed = JSON.parse(customer.tags)
          if (Array.isArray(parsed)) custTags = parsed
        } catch {
          custTags = customer.tags.split(",").map((t: string) => t.trim())
        }
      }

      if (step.condition.tag && !custTags.includes(step.condition.tag)) {
        return advanceToNextStep(customer, sequence, enrollment, step, `[Condition skipped: Tag '${step.condition.tag}' required]`)
      }
      if (step.condition.excludeTag && custTags.includes(step.condition.excludeTag)) {
        return advanceToNextStep(customer, sequence, enrollment, step, `[Condition skipped: Excluded tag '${step.condition.excludeTag}']`)
      }
      if (step.condition.stage && customer.stage !== step.condition.stage) {
        return advanceToNextStep(customer, sequence, enrollment, step, `[Condition skipped: Stage '${step.condition.stage}' required]`)
      }
    }

    // 4. Resolve dynamic company name and format message body
    const companyName = await resolveCompanyName(targetTenantId)
    let body = step.messageBody || ""
    body = body.replace(/\{\{customer\.name\}\}/gi, customer.name || "there")
    body = body.replace(/\{\{name\}\}/gi, customer.name || "there")
    body = body.replace(/\{\{customer\.phone\}\}/gi, customer.phone || "")
    body = body.replace(/\{\{customer\.email\}\}/gi, customer.email || "")
    body = body.replace(/\{\{customer\.city\}\}/gi, customer.city || "")
    body = body.replace(/\{\{company\.name\}\}/gi, companyName)
    body = body.replace(/\{\{company\}\}/gi, companyName)
    body = body.replace(/\{\{business\.name\}\}/gi, companyName)

    let sent = false
    const isEmail = step.channel === "EMAIL" || (sequence.channel === "EMAIL" && step.channel !== "WHATSAPP")

    if (isEmail && customer.email) {
      try {
        const subject = step.emailSubject || `${sequence.name} - Step ${step.stepIndex + 1}`
        const result = await sendEmail({
          to: customer.email,
          subject,
          text: body,
          html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1c1917; max-width: 600px; padding: 16px;">${body.replace(/\n/g, "<br/>")}</div>`,
        })
        sent = result.success
      } catch (err) {
        console.error("Error sending sequence Email step:", err)
        sent = false
      }
    } else if (customer.phone) {
      try {
        const cleanPhone = customer.phone.replace(/[^0-9+]/g, "")
        const isInside24h = await canSendFreeform(cleanPhone).catch(() => false)

        let waResult: { success: boolean; messageId?: string; error?: string } = { success: false }

        if (step.templateName) {
          // If explicit templateName provided on step, send template
          waResult = await notifyWhatsApp({
            to: cleanPhone,
            templateName: step.templateName,
            templateVariables: [customer.name || "there", companyName],
            body,
            forceTemplate: !isInside24h,
            allowOutsideSession: true,
          })
        } else if (isInside24h) {
          // Customer is inside 24h window - free-form delivery
          waResult = await flowWhatsApp({
            to: cleanPhone,
            body,
            allowOutsideSession: true,
          })
        } else {
          // Outside 24h window and no template configured on step:
          // Look for any active approved template on tenant as a fallback to deliver notification
          const approvedTemplate = await db.template.findFirst({
            where: {
              tenantId: targetTenantId,
              status: "APPROVED",
            },
            orderBy: { updatedAt: "desc" },
          })

          if (approvedTemplate?.name) {
            waResult = await notifyWhatsApp({
              to: cleanPhone,
              templateName: approvedTemplate.name,
              templateVariables: [customer.name || "there", companyName],
              body,
              allowOutsideSession: true,
            })
          } else {
            // Freeform send attempt
            waResult = await flowWhatsApp({
              to: cleanPhone,
              body,
              allowOutsideSession: true,
            })
          }
        }

        sent = waResult.success

        // Find or create conversation for message logging
        let conversation = await db.conversation.findFirst({
          where: { customerId: customer.id, tenantId: targetTenantId },
          orderBy: { updatedAt: "desc" },
        })

        if (!conversation) {
          conversation = await db.conversation.create({
            data: {
              tenantId: targetTenantId,
              customerId: customer.id,
              customerPhone: cleanPhone || customer.phone || "unknown",
              customerName: customer.name || "Customer",
              channel: "WHATSAPP",
              status: "ACTIVE",
            },
          }).catch(() => null)
        }

        if (conversation) {
          await db.message.create({
            data: {
              tenantId: targetTenantId,
              conversationId: conversation.id,
              customerId: customer.id,
              direction: "OUTBOUND",
              type: "TEXT",
              content: body,
              status: sent ? "SENT" : "FAILED",
            },
          }).catch(() => {})
        }
      } catch (err) {
        console.error("Error sending sequence WhatsApp step:", err)
        sent = false
      }
    }

    // Record history
    enrollment.history.push({
      stepIndex: step.stepIndex,
      sentAt: new Date().toISOString(),
      preview: body.slice(0, 100),
      status: sent ? "SENT" : "FAILED",
    })

    // Determine next step
    const nextStepIndex = step.stepIndex + 1
    if (nextStepIndex < sequence.steps.length) {
      enrollment.currentStepIndex = nextStepIndex
      const nextStep = sequence.steps[nextStepIndex]
      enrollment.nextScheduledAt = calculateNextScheduledAt(nextStep)
    } else {
      // All steps completed
      enrollment.status = "COMPLETED"
      enrollment.nextScheduledAt = null
      enrollment.completedAt = new Date().toISOString()
    }

    // Persist updated enrollment to customer
    await persistCustomerEnrollment(customer, sequence.id, enrollment)
    return sent
  })
}

/**
 * Update an existing enrollment (pause, resume, cancel, or trigger_next)
 */
export async function updateSubscriberEnrollment(
  customerId: string,
  sequenceId: string,
  action: "pause" | "resume" | "cancel" | "trigger_next",
  tenantId?: string
): Promise<{ success: boolean; enrollment?: SequenceEnrollment; error?: string }> {
  const customer = await db.customer.findUnique({
    where: { id: customerId },
  })

  if (!customer) return { success: false, error: "Customer not found" }

  const cf = (customer.customFields
    ? (typeof customer.customFields === "string" ? JSON.parse(customer.customFields) : customer.customFields)
    : {}) as Record<string, any>

  const list: SequenceEnrollment[] = Array.isArray(cf.sequences) ? cf.sequences : []
  const enrollment = list.find(e => e.sequenceId === sequenceId)

  if (!enrollment) return { success: false, error: "Enrollment not found" }

  const tid = tenantId || customer.tenantId || PLATFORM
  const sequences = await getTenantSequences(tid)
  const sequence = sequences.find(s => s.id === sequenceId)

  if (action === "pause") {
    enrollment.status = "PAUSED"
  } else if (action === "resume") {
    enrollment.status = "ACTIVE"
    if (!enrollment.nextScheduledAt) {
      enrollment.nextScheduledAt = new Date().toISOString()
    }
  } else if (action === "cancel") {
    enrollment.status = "CANCELLED"
    enrollment.nextScheduledAt = null
  } else if (action === "trigger_next") {
    if (!sequence) return { success: false, error: "Sequence definition not found" }
    const step = sequence.steps[enrollment.currentStepIndex]
    if (step) {
      await withTenant({ tenantId: tid, slug: "" }, async () => {
        await executeSequenceStep(customer, sequence, enrollment, step)
      })
    } else {
      enrollment.status = "COMPLETED"
      enrollment.nextScheduledAt = null
    }
  }

  cf.sequences = list
  await db.customer.update({
    where: { id: customerId },
    data: { customFields: cf },
  })

  return { success: true, enrollment }
}

/**
 * Cron runner: finds all customers with due sequence steps and executes them
 */
export async function processDueSequences(tenantId?: string): Promise<{ processed: number; sent: number; failed: number }> {
  const now = new Date()
  const targetTenantId = tenantId || currentTenant()?.tenantId || null

  // Find customers with active sequences (scoped to target tenant if specified)
  const customers = await db.customer.findMany({
    where: {
      ...(targetTenantId ? { tenantId: targetTenantId } : {}),
      customFields: { not: null as any },
    },
    take: 200,
  })

  // Dynamic sequence definitions cache by tenant
  const tenantSequencesCache = new Map<string, Map<string, DripSequence>>()

  let processed = 0
  let sent = 0
  let failed = 0

  for (const customer of customers) {
    const custTenant = customer.tenantId || targetTenantId || PLATFORM

    if (!tenantSequencesCache.has(custTenant)) {
      const seqs = await getTenantSequences(custTenant)
      tenantSequencesCache.set(custTenant, new Map(seqs.map(s => [s.id, s])))
    }
    const seqMap = tenantSequencesCache.get(custTenant)!

    const cf = (customer.customFields
      ? (typeof customer.customFields === "string" ? JSON.parse(customer.customFields) : customer.customFields)
      : {}) as Record<string, any>

    const enrollments: SequenceEnrollment[] = Array.isArray(cf.sequences) ? cf.sequences : []
    let modified = false

    for (const enrollment of enrollments) {
      if (enrollment.status !== "ACTIVE" || !enrollment.nextScheduledAt) continue

      const scheduledDate = new Date(enrollment.nextScheduledAt)
      if (scheduledDate <= now) {
        processed++
        const seq = seqMap.get(enrollment.sequenceId)
        if (!seq || !seq.isActive) continue

        const step = seq.steps[enrollment.currentStepIndex]
        if (step) {
          const success = await withTenant({ tenantId: custTenant, slug: "" }, async () => {
            return await executeSequenceStep(customer, seq, enrollment, step)
          })
          if (success) sent++
          else failed++
          modified = true
        } else {
          enrollment.status = "COMPLETED"
          enrollment.nextScheduledAt = null
          modified = true
        }
      }
    }

    if (modified) {
      await db.customer.update({
        where: { id: customer.id },
        data: { customFields: cf },
      }).catch(() => {})
    }
  }

  return { processed, sent, failed }
}

/**
 * Aggregate sequence statistics across all enrolled customers
 */
export async function getSequenceStats(tenantId: string): Promise<Record<string, SequenceStats>> {
  const tid = tenantId || PLATFORM
  const customers = await db.customer.findMany({
    where: {
      tenantId: tid,
      customFields: { not: null as any },
    },
    select: { customFields: true },
  })

  const stats: Record<string, SequenceStats> = {}

  for (const c of customers) {
    if (!c.customFields) continue
    const cf = typeof c.customFields === "string" ? JSON.parse(c.customFields) : c.customFields
    if (!cf || !Array.isArray(cf.sequences)) continue

    for (const enr of cf.sequences as SequenceEnrollment[]) {
      if (!enr.sequenceId) continue
      if (!stats[enr.sequenceId]) {
        stats[enr.sequenceId] = {
          sequenceId: enr.sequenceId,
          totalEnrolled: 0,
          activeCount: 0,
          completedCount: 0,
          pausedCount: 0,
          cancelledCount: 0,
          completionRate: 0,
        }
      }
      const s = stats[enr.sequenceId]
      s.totalEnrolled++
      if (enr.status === "ACTIVE") s.activeCount++
      else if (enr.status === "COMPLETED") s.completedCount++
      else if (enr.status === "PAUSED") s.pausedCount++
      else if (enr.status === "CANCELLED") s.cancelledCount++
    }
  }

  for (const s of Object.values(stats)) {
    s.completionRate = s.totalEnrolled > 0
      ? Math.round((s.completedCount / s.totalEnrolled) * 100)
      : 0
  }

  return stats
}

/**
 * Enrolled contact summary for sequence manager views
 */
export async function getSequenceEnrollmentsList(
  tenantId: string,
  sequenceId: string,
  limit: number = 100
): Promise<EnrolledContactSummary[]> {
  const tid = tenantId || PLATFORM
  const customers = await db.customer.findMany({
    where: {
      tenantId: tid,
      customFields: { not: null as any },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      customFields: true,
    },
    take: 250,
  })

  const results: EnrolledContactSummary[] = []
  for (const c of customers) {
    if (!c.customFields) continue
    const cf = typeof c.customFields === "string" ? JSON.parse(c.customFields) : c.customFields
    if (!cf || !Array.isArray(cf.sequences)) continue

    const enr = (cf.sequences as SequenceEnrollment[]).find(s => s.sequenceId === sequenceId)
    if (enr) {
      const lastHistory = enr.history && enr.history.length > 0
        ? enr.history[enr.history.length - 1]
        : null
      results.push({
        customerId: c.id,
        customerName: c.name || "Unnamed Contact",
        customerPhone: c.phone,
        customerEmail: c.email,
        status: enr.status,
        currentStepIndex: enr.currentStepIndex,
        totalSteps: enr.totalSteps,
        enrolledAt: enr.enrolledAt,
        nextScheduledAt: enr.nextScheduledAt,
        completedAt: enr.completedAt,
        historyCount: enr.history ? enr.history.length : 0,
        lastSentAt: lastHistory ? lastHistory.sentAt : null,
      })
      if (results.length >= limit) break
    }
  }

  return results
}

/**
 * Batch enroll multiple customers into a sequence
 */
export async function batchEnrollSubscribers(
  tenantId: string,
  sequenceId: string,
  customerIds: string[],
  triggerFirstStepImmediately: boolean = true
): Promise<{ enrolledCount: number; errors: string[] }> {
  let count = 0
  const errors: string[] = []
  for (const cid of customerIds) {
    const res = await enrollSubscriberInSequence(cid, sequenceId, tenantId, triggerFirstStepImmediately)
    if (res.success) {
      count++
    } else if (res.error) {
      errors.push(`${cid}: ${res.error}`)
    }
  }
  return { enrolledCount: count, errors }
}

/**
 * Test a sequence step copy with dummy/sample contact values
 */
export async function testSequenceStep(
  tenantId: string,
  step: SequenceStep,
  recipient: { phone?: string; email?: string }
): Promise<{ success: boolean; error?: string }> {
  const tid = tenantId || PLATFORM

  return await withTenant({ tenantId: tid, slug: "" }, async () => {
    const companyName = await resolveCompanyName(tid)

    let body = step.messageBody || ""
    body = body.replace(/\{\{customer\.name\}\}/gi, "Test Contact")
    body = body.replace(/\{\{name\}\}/gi, "Test Contact")
    body = body.replace(/\{\{customer\.phone\}\}/gi, recipient.phone || "+96890000000")
    body = body.replace(/\{\{customer\.email\}\}/gi, recipient.email || "test@example.com")
    body = body.replace(/\{\{customer\.city\}\}/gi, "Muscat")
    body = body.replace(/\{\{company\.name\}\}/gi, companyName)
    body = body.replace(/\{\{company\}\}/gi, companyName)
    body = body.replace(/\{\{business\.name\}\}/gi, companyName)

    if (step.channel === "EMAIL" || (!step.channel && recipient.email && !recipient.phone)) {
      if (!recipient.email) return { success: false, error: "Recipient email is required for Email test" }
      const subject = step.emailSubject || "[Test] " + (step.title || "Sequence Step")
      const res = await sendEmail({
        to: recipient.email,
        subject,
        text: body,
        html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1c1917; max-width: 600px; padding: 16px;">${body.replace(/\n/g, "<br/>")}</div>`,
      })
      return res
    }

    if (!recipient.phone) return { success: false, error: "Recipient phone is required for WhatsApp test" }
    const cleanPhone = recipient.phone.replace(/[^0-9+]/g, "")

    if (step.templateName) {
      const res = await notifyWhatsApp({
        to: cleanPhone,
        templateName: step.templateName,
        templateVariables: ["Test Contact", companyName],
        body,
        allowOutsideSession: true,
      })
      return { success: res.success, error: res.error }
    }

    const res = await flowWhatsApp({
      to: cleanPhone,
      body,
      allowOutsideSession: true,
    })
    return { success: res.success, error: res.success ? undefined : "WhatsApp send failed" }
  })
}
