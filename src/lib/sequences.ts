import { db } from "@/lib/db"
import { PLATFORM } from "@/lib/tenant"
import { sendWhatsApp } from "@/lib/flow-delivery"

export interface SequenceStep {
  stepIndex: number
  title?: string
  delayDays: number // e.g. 0 for immediate, 2 for 2 days later, etc.
  delayHours?: number
  delayMinutes?: number
  messageBody: string
  templateName?: string
  condition?: {
    stage?: string
    tag?: string
  }
}

export interface DripSequence {
  id: string
  tenantId: string
  name: string
  description?: string
  channel: "WHATSAPP" | "EMAIL" | "MULTI"
  isActive: boolean
  trigger: "MANUAL" | "ON_SUBSCRIBE" | "STAGE_CHANGE" | "TAG_ADDED"
  triggerConfig?: Record<string, any>
  steps: SequenceStep[]
  createdAt: string
  updatedAt: string
}

export interface SequenceEnrollment {
  sequenceId: string
  sequenceName: string
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED"
  currentStepIndex: number
  totalSteps: number
  enrolledAt: string
  nextScheduledAt: string | null
  completedAt?: string | null
  history: Array<{
    stepIndex: number
    sentAt: string
    preview: string
    status: "SENT" | "FAILED"
  }>
}

export const STARTER_SEQUENCES: DripSequence[] = [
  {
    id: "seq_welcome_nurture",
    tenantId: "",
    name: "New Lead 3-Step WhatsApp Nurture",
    description: "Automated onboarding flow for newly engaged prospects over 5 days.",
    channel: "WHATSAPP",
    isActive: true,
    trigger: "ON_SUBSCRIBE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    steps: [
      {
        stepIndex: 0,
        title: "Welcome & Introduction",
        delayDays: 0,
        delayHours: 0,
        delayMinutes: 0,
        messageBody: "Hello {{customer.name}}! 👋 Welcome to our official WhatsApp support channel. We're delighted to connect with you. If you have any questions about our products or services, simply reply here anytime!",
      },
      {
        stepIndex: 1,
        title: "Value Proposition & Catalog",
        delayDays: 2,
        delayHours: 0,
        delayMinutes: 0,
        messageBody: "Hi {{customer.name}}, we hope you're having a wonderful week! Did you know you can browse our full catalog and current seasonal offers right here on WhatsApp? Let us know if you'd like a direct recommendation.",
      },
      {
        stepIndex: 2,
        title: "VIP Follow-up & Special Offer",
        delayDays: 5,
        delayHours: 0,
        delayMinutes: 0,
        messageBody: "Hey {{customer.name}}! As a valued contact, here is an exclusive 10% discount on your next booking or order with us. Feel free to reply here if you'd like our team to assist you today! 🌟",
      },
    ],
  },
  {
    id: "seq_reengagement",
    tenantId: "",
    name: "Inactive Contact Re-engagement",
    description: "Gentle 2-step check-in for customers who haven't interacted in recent weeks.",
    channel: "WHATSAPP",
    isActive: true,
    trigger: "MANUAL",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    steps: [
      {
        stepIndex: 0,
        title: "Check-in Message",
        delayDays: 0,
        delayHours: 0,
        delayMinutes: 0,
        messageBody: "Hello {{customer.name}}, we haven't heard from you in a little while! Just checking in to see how everything is going and if you need assistance with anything. We are always here to help!",
      },
      {
        stepIndex: 1,
        title: "Special VIP Perk",
        delayDays: 3,
        delayHours: 0,
        delayMinutes: 0,
        messageBody: "Hi {{customer.name}}, our newest seasonal packages just dropped! Let us know if you'd like us to share our latest brochure with you.",
      },
    ],
  }
]

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
  }

  if (sequences.length === 0) {
    // Return cloned starter templates
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

  // If first step has 0 delay and immediate trigger, execute step 0 now
  if (shouldSendNow && firstStep) {
    await executeSequenceStep(customer, sequence, newEnrollment, firstStep)
  }

  return { success: true, enrollment: newEnrollment }
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
  // Format message body with customer variables
  let body = step.messageBody || ""
  body = body.replace(/\{\{customer\.name\}\}/gi, customer.name || "there")
  body = body.replace(/\{\{name\}\}/gi, customer.name || "there")
  body = body.replace(/\{\{customer\.phone\}\}/gi, customer.phone || "")

  let sent = false
  if (customer.phone) {
    try {
      const result = await sendWhatsApp({
        to: customer.phone,
        body,
        allowOutsideSession: true,
      })
      sent = result.success

      // Find or create conversation for message logging
      const conversation = await db.conversation.findFirst({
        where: { customerId: customer.id },
        orderBy: { updatedAt: "desc" },
      })

      if (conversation) {
        await db.message.create({
          data: {
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
    // All steps completed!
    enrollment.status = "COMPLETED"
    enrollment.nextScheduledAt = null
    enrollment.completedAt = new Date().toISOString()
  }

  // Persist updated enrollment to customer
  const cf = (customer.customFields
    ? (typeof customer.customFields === "string" ? JSON.parse(customer.customFields) : customer.customFields)
    : {}) as Record<string, any>

  const list: SequenceEnrollment[] = Array.isArray(cf.sequences) ? cf.sequences : []
  const idx = list.findIndex(e => e.sequenceId === sequence.id)
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

  return sent
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
      await executeSequenceStep(customer, sequence, enrollment, step)
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
  const tid = tenantId || PLATFORM

  // Find customers with active sequences
  const customers = await db.customer.findMany({
    where: {
      ...(tenantId ? { tenantId } : {}),
      customFields: { not: null as any },
    },
    take: 100,
  })

  const sequences = await getTenantSequences(tid)
  const seqMap = new Map(sequences.map(s => [s.id, s]))

  let processed = 0
  let sent = 0
  let failed = 0

  for (const customer of customers) {
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
          const success = await executeSequenceStep(customer, seq, enrollment, step)
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
