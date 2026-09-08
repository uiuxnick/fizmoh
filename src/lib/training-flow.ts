import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { sendWhatsApp } from "@/lib/notifications"
import { sendMediaMessage, sendInteractiveMessage } from "@/lib/whatsapp"
import { generateOrderNumber } from "@/lib/helpers"
import { notifyStaff } from "@/lib/realtime"
import { syncOrderToCalendar } from "@/lib/google-calendar"
import { sendPostBookingChatChoice, type FlowContext, type Lang } from "@/lib/booking-flow"

const PREFIX = "bk_"

export type TrainingStep =
  | "TRAINING_PROGRAM"
  | "TRAINING_DETAILS"
  | "TRAINING_NAME"
  | "TRAINING_AGE"
  | "TRAINING_DONE"

export type TrainingProgram = "WOMEN" | "MEN_KIDS"

export type TrainingState = {
  flowType: "TRAINING"
  step: TrainingStep
  program?: TrainingProgram
  riderName?: string
  riderAge?: string
  orderId?: string
  updatedAt: string
}

const TRAINING_BANNER_IMG = "https://bot-data.s3.ap-southeast-1.wasabisys.com/flowbuilder/72377/313675/whatsapp-451753/flowbuilder-313675-1787557601.PNG"
const SUPPORT_PHONE = "+968 92009161"

const COACH_DETAILS = {
  WOMEN: {
    titleEn: "Women’s Training",
    titleAr: "تدريب النساء",
    coachEn: "Nouf",
    coachAr: "نوف",
    daysEn: "Monday & Wednesday",
    daysAr: "الاثنين والأربعاء",
    contact: "+968 71717580",
  },
  MEN_KIDS: {
    titleEn: "Men’s Training",
    titleAr: "تدريب الرجال",
    coachEn: "Yahya",
    coachAr: "يحيى",
    daysEn: "Sunday & Tuesday",
    daysAr: "الأحد والثلاثاء",
    contact: "+968 79197578",
  },
}

export function isTrainingTrigger(text: string): boolean {
  const t = text.trim().toLowerCase().replace(/[!.،,?؟]/g, "")
  const keywords = [
    "training",
    "train",
    "course",
    "courses",
    "riding training",
    "arabic flow training",
    "english flow training",
    "تدريب",
    "تدريب الخيل",
    "تدريب ركوب الخيل",
    "كورس",
    "كورسات",
    "تعليم الخيل",
    "تعليم ركوب الخيل",
    "دورة",
    "دورات",
    "تدريب نساء",
    "تدريب رجال",
    "تدريب اطفال",
  ]
  return keywords.some(k => t.includes(k))
}

export function isTrainingReply(id?: string | null): boolean {
  if (!id) return false
  const clean = id.startsWith(PREFIX) ? id.slice(PREFIX.length) : id
  return clean.startsWith("train_")
}

export async function getTrainingState(conversationId: string): Promise<TrainingState | null> {
  const convo = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { bookingState: true },
  })
  const raw = convo?.bookingState
  if (!raw) return null
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
    if (parsed?.flowType !== "TRAINING") return null
    if (Date.now() - new Date(parsed.updatedAt).getTime() > 24 * 60 * 60 * 1000) return null
    return parsed as TrainingState
  } catch {
    return null
  }
}

export async function setTrainingState(conversationId: string, state: TrainingState | null) {
  await db.conversation.update({
    where: { id: conversationId },
    data: { bookingState: state ? JSON.stringify(state) : Prisma.DbNull },
  })
}

/**
 * Step 1: Start Training Flow
 * Displays Course Overview card + Options: Women's Training vs Men's Training
 */
export async function startTrainingFlow(ctx: FlowContext): Promise<boolean> {
  const isAr = ctx.lang === "ar"

  // 1. Send overview media image banner
  await sendMediaMessage({
    to: ctx.phone,
    type: "image",
    mediaUrl: TRAINING_BANNER_IMG,
    caption: isAr ? "🎓 تدريب ركوب الخيل" : "🎓 Horse Riding Training",
  }).catch(() => null)

  const bodyText = isAr
    ? `🎓 *تدريب ركوب الخيل*

📚 *إجمالي عدد الحصص:* 8 حصص

📅 *عدد الحصص أسبوعياً:* حصتان

⏱ *مدة الحصة:* ساعة واحدة

💰 *رسوم الدورة:* *70 ريال عماني*

👩 *تدريب النساء*
• الاثنين والأربعاء
• 7:15 مساءً أو 8:15 مساءً

👨 *تدريب الرجال*
• الأحد والثلاثاء
• 7:15 مساءً أو 8:15 مساءً

🧒 *تدريب الأطفال*
• الأحد والثلاثاء
• 7:15 مساءً أو 8:15 مساءً

هل ترغب في حجز دورة تدريبية؟ 🐎`
    : `🎓 *Horse Riding Training*

📚 *Total Classes:* 8 Classes

📅 *Classes Per Week:* 2 Classes

⏱ *Duration:* 1 Hour per Class

💰 *Course Fee:* *70 OMR*

👩 *Women’s Training*
• Monday & Wednesday
• 7:15 PM or 8:15 PM

👨 *Men’s Training*
• Sunday & Tuesday
• 7:15 PM or 8:15 PM

🧒 *Kids’ Training*
• Sunday & Tuesday
• 7:15 PM or 8:15 PM

Would you like to book a training course? 🐎`

  const buttons = isAr
    ? [
        { id: `${PREFIX}train_prog_women`, title: "👩 تدريب النساء" },
        { id: `${PREFIX}train_prog_men`, title: "👨 تدريب الرجال" },
      ]
    : [
        { id: `${PREFIX}train_prog_women`, title: "👩 Women's Training" },
        { id: `${PREFIX}train_prog_men`, title: "👨 Men & Kids" },
      ]

  await sendInteractiveMessage({
    to: ctx.phone,
    body: bodyText,
    buttons,
  })

  await setTrainingState(ctx.conversationId, {
    flowType: "TRAINING",
    step: "TRAINING_PROGRAM",
    updatedAt: new Date().toISOString(),
  })

  return true
}

/**
 * Handles interactive button selections in the training flow.
 */
export async function handleTrainingReply(
  ctx: FlowContext,
  rawReplyId: string,
): Promise<boolean> {
  const isAr = ctx.lang === "ar"
  const id = rawReplyId.startsWith(PREFIX) ? rawReplyId.slice(PREFIX.length) : rawReplyId
  const state = await getTrainingState(ctx.conversationId)

  // 1. Program selected (Women or Men/Kids) -> Show Course Details with Book Now / Contact Us
  if (id === "train_prog_women" || id === "train_prog_men") {
    const program: TrainingProgram = id === "train_prog_women" ? "WOMEN" : "MEN_KIDS"

    const detailsText = isAr
      ? `🎓 *تدريب ركوب الخيل*

📚 *إجمالي عدد الحصص:* 8 حصص
📅 *عدد الحصص أسبوعياً:* حصتان
⏱ *مدة الحصة:* ساعة واحدة
💰 *رسوم الدورة:* *70 ريال عماني*`
      : `🎓 *Horse Riding Training*

📚 *Total Classes:* 8 Classes
📅 *Classes Per Week:* 2 Classes
⏱ *Duration:* 1 Hour per Class
💰 *Course Fee:* *70 OMR*`

    const buttons = isAr
      ? [
          { id: `${PREFIX}train_accept`, title: "✅ احجز الآن" },
          { id: `${PREFIX}train_contact`, title: "📞 تواصل معنا" },
        ]
      : [
          { id: `${PREFIX}train_accept`, title: "✅ Book Now" },
          { id: `${PREFIX}train_contact`, title: "📞 Contact Us" },
        ]

    await sendInteractiveMessage({
      to: ctx.phone,
      headerText: isAr ? "تدريب ركوب الخيل" : "Beach Horse Riding Training",
      body: detailsText,
      buttons,
    })

    await setTrainingState(ctx.conversationId, {
      flowType: "TRAINING",
      step: "TRAINING_DETAILS",
      program,
      updatedAt: new Date().toISOString(),
    })
    return true
  }

  // 2. Contact Us selected
  if (id === "train_contact" || id === "train_decline") {
    const contactMsg = isAr
      ? `📞 *تواصل معنا*\n\nإذا كنت بحاجة إلى أي مساعدة أو لديك استفسار، يرجى التواصل مع فريقنا وسنسعد بخدمتك.\n\n📞 *رقم التواصل:* ${SUPPORT_PHONE}\n\nفريقنا جاهز لمساعدتك. 🐎`
      : `📞 *Contact Us*\n\nIf you need any assistance or have any questions, please reach out to our team:\n\n📞 *Support:* ${SUPPORT_PHONE}\n\nOur team is ready to assist you. 🐎`

    await sendWhatsApp({
      to: ctx.phone,
      body: contactMsg,
      allowOutsideSession: true,
    })

    // Offer follow-up AI or Human choice
    await sendPostBookingChatChoice(ctx)
    await setTrainingState(ctx.conversationId, null)
    return true
  }

  // 3. Book Now / Accept selected -> Ask Participant Name (Node 20 / 49)
  if (id === "train_accept") {
    const askNameMsg = isAr
      ? "👤 ما هو اسم المشارك؟"
      : "👤 What is the rider`s name?"

    await sendWhatsApp({
      to: ctx.phone,
      body: askNameMsg,
      allowOutsideSession: true,
    })

    await setTrainingState(ctx.conversationId, {
      flowType: "TRAINING",
      step: "TRAINING_NAME",
      program: state?.program || "WOMEN",
      updatedAt: new Date().toISOString(),
    })
    return true
  }

  return false
}

/**
 * Handles free-text messages when collecting Participant Name and Age.
 * Note: Timing has been removed as requested; entering Age immediately completes the booking.
 */
export async function handleTrainingText(
  ctx: FlowContext,
  text: string,
): Promise<boolean> {
  const isAr = ctx.lang === "ar"
  const state = await getTrainingState(ctx.conversationId)
  if (!state) return false

  // A. Awaiting Participant Name (Node 20 / 49)
  if (state.step === "TRAINING_NAME") {
    const riderName = text.trim().slice(0, 80)
    if (!riderName) return true

    const askAgeMsg = isAr
      ? "🎂 كم عمر المشارك؟"
      : "🎂 What is the rider`s **age**?"

    await sendWhatsApp({
      to: ctx.phone,
      body: askAgeMsg,
      allowOutsideSession: true,
    })

    await setTrainingState(ctx.conversationId, {
      ...state,
      step: "TRAINING_AGE",
      riderName,
      updatedAt: new Date().toISOString(),
    })
    return true
  }

  // B. Awaiting Participant Age (Node 21 / 50) -> Complete booking directly (no timing question)
  if (state.step === "TRAINING_AGE") {
    const riderAge = text.trim().slice(0, 20)
    if (!riderAge) return true

    const currentState = {
      ...state,
      riderAge,
      updatedAt: new Date().toISOString(),
    }

    await saveTrainingBooking(ctx, currentState)
    return true
  }

  return false
}

/**
 * Ensures a Training Tour & Slot exist for this tenant so the Order relation is valid.
 */
async function ensureTrainingTourAndSlot(tenantId: string) {
  let tour = await db.tour.findFirst({
    where: {
      tenantId,
      OR: [
        { category: { equals: "education", mode: "insensitive" } },
        { slug: "horse-riding-training" },
      ],
    },
  })

  if (!tour) {
    tour = await db.tour.create({
      data: {
        tenantId,
        slug: "horse-riding-training",
        name: "🎓 Horse Riding Training",
        nameAr: "🎓 تدريب ركوب الخيل",
        description: "8 Classes, 2 Classes per week, 1 Hour per Class. 70 OMR.",
        descriptionAr: "٨ حصص، حصتان أسبوعياً، ساعة واحدة لكل حصة. ٧٠ ر.ع.",
        category: "education",
        city: "Muscat",
        basePrice: 70,
        currency: "OMR",
        durationHours: 1,
        capacityPerSlot: 10,
        status: "ACTIVE",
      },
    })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let slot = await db.slot.findFirst({
    where: {
      tenantId,
      tourId: tour.id,
      date: { gte: today },
    },
    orderBy: { date: "asc" },
  })

  if (!slot) {
    slot = await db.slot.create({
      data: {
        tenantId,
        tourId: tour.id,
        date: today,
        startTime: "19:15",
        endTime: "20:15",
        capacity: 10,
        seatsBooked: 1,
        status: "OPEN",
      },
    })
  } else {
    await db.slot.update({
      where: { id: slot.id },
      data: { seatsBooked: { increment: 1 } },
    }).catch(() => null)
  }

  return { tour, slot }
}

/**
 * Saves customer details in booking (Order + Payment) and shows training booked.
 * Followed immediately by AI vs Human chat mode choice.
 */
async function saveTrainingBooking(
  ctx: FlowContext,
  state: TrainingState,
) {
  const isAr = ctx.lang === "ar"
  const programKey = state.program === "MEN_KIDS" ? "MEN_KIDS" : "WOMEN"
  const coach = COACH_DETAILS[programKey]
  const riderName = state.riderName || "Valued Rider"
  const riderAge = state.riderAge || "Not specified"

  // 1. Ensure Tour and Slot exist
  const { tour, slot } = await ensureTrainingTourAndSlot(ctx.tenantId)

  // 2. Customer record update
  if (state.riderName) {
    await db.customer.update({
      where: { id: ctx.customerId },
      data: { name: state.riderName },
    }).catch(() => null)
  }

  // 3. Create the Order with status CONFIRMED
  const orderNumber = await generateOrderNumber()
  const order = await db.order.create({
    data: {
      tenantId: ctx.tenantId,
      orderNumber,
      customerId: ctx.customerId,
      tourId: tour.id,
      slotId: slot.id,
      paxAdult: 1,
      paxChild: 0,
      paxInfant: 0,
      customerName: riderName,
      customerPhone: ctx.phone,
      subtotal: 70,
      taxAmount: 0,
      totalAmount: 70,
      paymentMethod: "BANK_TRANSFER",
      paymentStatus: "PENDING",
      orderStatus: "CONFIRMED",
      confirmedAt: new Date(),
      channel: "WHATSAPP",
      specialRequests: `Training: ${coach.titleEn} | Rider Name: ${riderName} | Age: ${riderAge} | Assigned Coach: ${coach.coachEn} (${coach.contact})`,
    },
  })

  // 4. Create the Payment record
  await db.payment.create({
    data: {
      tenantId: ctx.tenantId,
      orderId: order.id,
      customerId: ctx.customerId,
      method: "BANK_TRANSFER",
      amount: 70,
      status: "PENDING",
    },
  }).catch(() => null)

  // 5. Notify Staff so dashboard shows new confirmed training booking immediately
  await notifyStaff({
    tenantId: ctx.tenantId,
    type: "NEW_BOOKING",
    title: `🎓 New Training Booking: ${riderName}`,
    message: `${riderName} booked ${coach.titleEn}. Order #${order.orderNumber}.`,
    data: { orderId: order.id },
  }).catch(() => null)

  // 6. Sync to Google Calendar
  void syncOrderToCalendar(order.id)

  // 7. Send Final Confirmation Message (matching Node 26 / 55)
  const confirmationMsg = isAr
    ? `✅ *شكراً لك ${riderName}! تم استلام طلب التدريب.*

🎓 *${coach.titleAr}*

${programKey === "WOMEN" ? "👩 المدربة:" : "👨 المدرب:"} *${coach.coachAr}*

📅 الأيام: *${coach.daysAr}*

📞 رقم التواصل: *${coach.contact}*

${programKey === "WOMEN" ? "ستقوم المدربة" : "سيقوم المدرب"} بمساعدتك في تأكيد التوفر والخطوات التالية. 🐎`
    : `✅ *Thank you ${riderName}! Your training request has been received.*

🎓 *${coach.titleEn}*

${programKey === "WOMEN" ? "👩 Coach:" : "👨 Coach:"} *${coach.coachEn}*

📅 Days: *${coach.daysEn}*

📞 Contact: *${coach.contact}*

The coach will assist you with availability and the next steps. 🐎`

  await sendWhatsApp({
    to: ctx.phone,
    body: confirmationMsg,
    allowOutsideSession: true,
  })

  // 8. Clear state
  await setTrainingState(ctx.conversationId, null)

  // 9. Send AI vs Human Chat choice in the last message
  await sendPostBookingChatChoice(ctx)
}
