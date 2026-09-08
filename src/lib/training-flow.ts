import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { sendWhatsApp } from "@/lib/notifications"
import { sendMediaMessage, sendInteractiveMessage } from "@/lib/whatsapp"
import { generateOrderNumber } from "@/lib/helpers"
import { notifyStaff } from "@/lib/realtime"
import { syncOrderToCalendar } from "@/lib/google-calendar"
import type { FlowContext, Lang } from "@/lib/booking-flow"

const PREFIX = "bk_"

export type TrainingStep =
  | "TRAINING_PROGRAM"
  | "TRAINING_TERMS"
  | "TRAINING_NAME"
  | "TRAINING_AGE"
  | "TRAINING_TIME"
  | "TRAINING_DONE"

export type TrainingProgram = "WOMEN" | "MEN_KIDS"

export type TrainingState = {
  flowType: "TRAINING"
  step: TrainingStep
  program?: TrainingProgram
  riderName?: string
  riderAge?: string
  preferredTime?: string
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
    titleEn: "Men & Kids Training",
    titleAr: "تدريب الرجال والأطفال",
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
    "تدريب",
    "تدريب الخيل",
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
 * Displays Course Overview card + Options: Women's Training vs Men & Kids Training
 */
export async function startTrainingFlow(ctx: FlowContext): Promise<boolean> {
  const isAr = ctx.lang === "ar"

  // 1. Send overview media image
  await sendMediaMessage({
    to: ctx.phone,
    type: "image",
    mediaUrl: TRAINING_BANNER_IMG,
    caption: isAr ? "🎓 دورة تدريب ركوب الخيل" : "🎓 Horse Riding Training Course",
  }).catch(() => null)

  const bodyText = isAr
    ? `🎓 *تدريب ركوب الخيل*

📚 *عدد الحصص:* 8 حصص
📅 *الحصص أسبوعياً:* حصتان في الأسبوع
⏱ *المدة:* ساعة واحدة لكل حصة
💰 *رسوم الدورة:* *70 ر.ع*

👩 *تدريب النساء*
• الاثنين والأربعاء
• 7:15 مساءً أو 8:15 مساءً

👨 *تدريب الرجال*
• الأحد والثلاثاء
• 7:15 مساءً أو 8:15 مساءً

🧒 *تدريب الأطفال*
• الأحد والثلاثاء
• 7:15 مساءً أو 8:15 مساءً

هل ترغب في التسجيل بالدورة التدريبية؟ 🐎`
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

  // 1. Program selected (Women or Men & Kids)
  if (id === "train_prog_women" || id === "train_prog_men") {
    const program: TrainingProgram = id === "train_prog_women" ? "WOMEN" : "MEN_KIDS"

    const termsText = isAr
      ? `📌 *شروط وأحكام ركوب الخيل* 🏇🌊

يرجى قراءة الشروط التالية قبل الحجز:

1️⃣ *الحجز والإلغاء*
• يلزم الحجز المسبق والدفع الكامل مقدماً.
• الإلغاء قبل *10 ساعات* على الأقل من الموعد لاسترداد المبلغ.
• التأخر لأكثر من *15 دقيقة* يؤدي للإلغاء بدون استرداد.

2️⃣ *العمر والوزن*
• الحد الأدنى للعمر: *8 سنوات*
• الحد الأقصى للوزن: *95 كجم*

3️⃣ *السلامة والأمان*
• ارتداء خوذة الأمان إلزامي.
• اتباع تعليمات المدرب في جميع الأوقات.
• يمنع الركض السريع والمناورات الخطرة.
• الخبب / الجري فقط بموافقة المدرب (بحد أقصى 20% من وقت الجولة).
• لا يسمح بالجري أثناء الجولات الليلية.
• مخالفة تعليمات السلامة قد تؤدي لإنهاء الجولة بدون استرداد.

4️⃣ *الأحوال الجوية*
في حال سوء الأحوال الجوية يتم إعادة الجدولة أو استرداد المبلغ.

5️⃣ *المسؤولية*
ركوب الخيل على مسؤولية الفارس الشخصية.

6️⃣ *الملابس*
ارتداء قميص وبنطال طويل وحذاء مغلق (يفضل حذاء مسطح).

هل توافق على هذه الشروط والأحكام؟`
      : `📌 *Beach Horse Riding Tour Terms & Conditions* 🏇🌊

Please read the following before booking:

1️⃣ *Booking & Cancellation*
• Advance booking & full prepayment required.
• Cancel at least *10 hours before* the ride for a refund.
• Arriving over *15 minutes late* will result in cancellation without refund.

2️⃣ *Age & Weight*
• Minimum age: *8 years*
• Maximum weight: *95 kg*

3️⃣ *Safety*
• Safety helmet is mandatory.
• Follow the instructor’s directions at all times.
• Galloping, free riding & dangerous maneuvers are prohibited.
• Trotting/cantering only with instructor approval.
• Cantering: maximum *20% of ride time*.
• No trotting/cantering during night rides.
• Safety violations may end the ride without refund.

4️⃣ *Weather*
Bad weather: reschedule or refund as agreed.

5️⃣ *Liability*
Horse riding is at the rider’s own risk.

6️⃣ *Dress Code*
Wear a shirt, long pants & closed-toe shoes. Flat shoes recommended.

Do you accept these Terms & Conditions?`

    const buttons = isAr
      ? [
          { id: `${PREFIX}train_accept`, title: "✅ أوافق" },
          { id: `${PREFIX}train_decline`, title: "❌ لا أوافق" },
        ]
      : [
          { id: `${PREFIX}train_accept`, title: "✅ I Accept" },
          { id: `${PREFIX}train_decline`, title: "❌ I Don't Accept" },
        ]

    await sendInteractiveMessage({
      to: ctx.phone,
      headerText: isAr ? "شروط وأحكام التدريب" : "Terms & Conditions",
      body: termsText,
      buttons,
    })

    await setTrainingState(ctx.conversationId, {
      flowType: "TRAINING",
      step: "TRAINING_TERMS",
      program,
      updatedAt: new Date().toISOString(),
    })
    return true
  }

  // 2. Terms Declined
  if (id === "train_decline") {
    const declineMsg = isAr
      ? `لا توجد مشكلة. للمتابعة دون الموافقة على الشروط والأحكام، يرجى التواصل مع *فريق الدعم* للمساعدة.\n\n📞 *الدعم:* ${SUPPORT_PHONE}\n\nسيسعد فريقنا بمساعدتك. 🐎`
      : `No problem. To continue without accepting the Terms & Conditions, please chat with our *Support Executive* for assistance.\n\n📞 *Support:* ${SUPPORT_PHONE}\n\nOur team will assist you further. 🐎`

    await sendWhatsApp({
      to: ctx.phone,
      body: declineMsg,
      allowOutsideSession: true,
    })

    await setTrainingState(ctx.conversationId, null)
    return true
  }

  // 3. Terms Accepted -> Ask Rider's Name
  if (id === "train_accept") {
    const askNameMsg = isAr
      ? "👤 ما هو اسم الفارس؟"
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

  // 4. Preferred Time Selected -> Evening 7:15 PM or Evening 8:15 PM
  if (id === "train_time_715" || id === "train_time_815") {
    const preferredTime = id === "train_time_715" ? "Evening 7:15 PM" : "Evening 8:15 PM"
    const currentState = state || {
      flowType: "TRAINING" as const,
      step: "TRAINING_TIME" as const,
      program: "WOMEN" as TrainingProgram,
      riderName: "Valued Rider",
      riderAge: "Adult",
      updatedAt: new Date().toISOString(),
    }

    await saveTrainingBooking(ctx, currentState, preferredTime)
    return true
  }

  return false
}

/**
 * Handles free-text messages when collecting Rider Name and Rider Age.
 */
export async function handleTrainingText(
  ctx: FlowContext,
  text: string,
): Promise<boolean> {
  const isAr = ctx.lang === "ar"
  const state = await getTrainingState(ctx.conversationId)
  if (!state) return false

  // A. Awaiting Rider Name
  if (state.step === "TRAINING_NAME") {
    const riderName = text.trim().slice(0, 80)
    if (!riderName) return true

    const askAgeMsg = isAr
      ? `🎂 كم عمر الفارس يا *${riderName}*؟`
      : `🎂 What is the rider\`s *age*?`

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

  // B. Awaiting Rider Age
  if (state.step === "TRAINING_AGE") {
    const riderAge = text.trim().slice(0, 20)
    if (!riderAge) return true

    const askTimeMsg = isAr
      ? "🕐 يرجى اختيار موعد التدريب المفضل لديك:"
      : "🕐 Please select your preferred training time:"

    const buttons = isAr
      ? [
          { id: `${PREFIX}train_time_715`, title: "مساءً 7:15" },
          { id: `${PREFIX}train_time_815`, title: "مساءً 8:15" },
        ]
      : [
          { id: `${PREFIX}train_time_715`, title: "Evening 7:15 PM" },
          { id: `${PREFIX}train_time_815`, title: "Evening 8:15 PM" },
        ]

    await sendInteractiveMessage({
      to: ctx.phone,
      body: askTimeMsg,
      buttons,
    })

    await setTrainingState(ctx.conversationId, {
      ...state,
      step: "TRAINING_TIME",
      riderAge,
      updatedAt: new Date().toISOString(),
    })
    return true
  }

  // C. In case user typed time instead of clicking the buttons
  if (state.step === "TRAINING_TIME") {
    const t = text.toLowerCase()
    let preferredTime = "Evening 7:15 PM"
    if (t.includes("8") || t.includes("8:15")) {
      preferredTime = "Evening 8:15 PM"
    }
    await saveTrainingBooking(ctx, state, preferredTime)
    return true
  }

  return false
}

/**
 * Ensures a Training Tour & Slot exist for this tenant so the Order relation is valid.
 */
async function ensureTrainingTourAndSlot(tenantId: string, preferredTime: string) {
  // 1. Find or create the Training Tour
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
        nameAr: "🎓 دورة تدريب ركوب الخيل",
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

  // 2. Find or create a Slot for today/tomorrow at the chosen hour
  const timeStr = preferredTime.includes("8:15") ? "20:15" : "19:15"
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let slot = await db.slot.findFirst({
    where: {
      tenantId,
      tourId: tour.id,
      date: { gte: today },
      startTime: timeStr,
    },
  })

  if (!slot) {
    slot = await db.slot.create({
      data: {
        tenantId,
        tourId: tour.id,
        date: today,
        startTime: timeStr,
        endTime: preferredTime.includes("8:15") ? "21:15" : "20:15",
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
 */
async function saveTrainingBooking(
  ctx: FlowContext,
  state: TrainingState,
  preferredTime: string,
) {
  const isAr = ctx.lang === "ar"
  const programKey = state.program === "MEN_KIDS" ? "MEN_KIDS" : "WOMEN"
  const coach = COACH_DETAILS[programKey]
  const riderName = state.riderName || "Valued Rider"
  const riderAge = state.riderAge || "Not specified"

  // 1. Ensure Tour and Slot exist
  const { tour, slot } = await ensureTrainingTourAndSlot(ctx.tenantId, preferredTime)

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
      specialRequests: `Training: ${coach.titleEn} | Rider Name: ${riderName} | Age: ${riderAge} | Preferred Time: ${preferredTime} | Assigned Coach: ${coach.coachEn} (${coach.contact})`,
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
    message: `${riderName} booked ${coach.titleEn} (${preferredTime}). Order #${order.orderNumber}.`,
    data: { orderId: order.id },
  }).catch(() => null)

  // 6. Sync to Google Calendar
  void syncOrderToCalendar(order.id)

  // 7. Send Final Confirmation Message (matching Node 26 / 55)
  const confirmationMsg = isAr
    ? `✅ *شكراً لك ${riderName}! تم استلام طلب التدريب بنجاح.*

🎓 *${coach.titleAr}*
${programKey === "WOMEN" ? "👩" : "👨"} المدرب: *${coach.coachAr}*
📅 الأيام: *${coach.daysAr}*
🕐 الوقت: *${preferredTime}*
📞 للتواصل: *${coach.contact}*

سيتواصل معك المدرب لمساعدتك في المواعيد والخطوات القادمة. 🐎`
    : `✅ *Thank you! ${riderName}, your training request has been received.*

🎓 *${coach.titleEn}*
${programKey === "WOMEN" ? "👩" : "👨"} Coach: *${coach.coachEn}*
📅 Days: *${coach.daysEn}*
🕐 Time: *${preferredTime}*
📞 Contact: *${coach.contact}*

The coach will assist you with availability and the next steps. 🐎`

  await sendWhatsApp({
    to: ctx.phone,
    body: confirmationMsg,
    allowOutsideSession: true,
  })

  // 8. Clear state
  await setTrainingState(ctx.conversationId, null)
}
