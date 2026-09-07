"use client"

import { useEffect, useRef, useState } from "react"
import {
  CheckCheck, Phone, Video, ChevronLeft,
  Sparkles, RefreshCw, Send, MousePointerClick,
  Stethoscope, Compass, ShoppingBag,
} from "lucide-react"

interface Message {
  id: string
  from: "them" | "us"
  text?: string
  buttons?: string[]
  card?: { title: string; subtitle?: string; amount?: string; tag?: string }
  image?: string
  imageCaption?: string
  time: string
}

export type DemoMode = "marketing" | "hospital" | "tours" | "retail"

/**
 * The demo can now be driven from outside.
 *
 * The hero slider needs the phone to show the industry the slide is talking
 * about — a slide about clinics beside a marketing conversation reads as a
 * mistake. Passing `mode` makes the component controlled and hides its own
 * switcher, because two competing controls for one value is the surest way to
 * confuse someone. With no props it behaves exactly as before.
 */
export function WhatsAppDemo({
  isAr = false,
  mode: controlledMode,
  showSwitcher = true,
}: {
  isAr?: boolean
  mode?: DemoMode
  showSwitcher?: boolean
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [internalMode, setMode] = useState<DemoMode>("marketing")
  const mode = controlledMode ?? internalMode
  const [interactiveInput, setInteractiveInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const getTime = () => {
    const d = new Date()
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Reset conversation based on selected scenario
  const resetDemo = (selectedMode = mode) => {
    setIsTyping(false)
    if (selectedMode === "marketing") {
      setMessages([
        {
          id: "m1",
          from: "them",
          text: isAr ? "مرحباً، أود معرفة خدمات التسويق الرقمي وإدارة الحملات لشركتي." : "Hi! I need digital marketing and SEO growth for my business.",
          time: getTime(),
        },
        {
          id: "m2",
          from: "us",
          text: isAr
            ? "👋 *أهلاً بك في FizMoh للنمو الرقمي!*\n\nشريكك المعتمد لإعلانات جوجل، منصات التواصل، وأتمتة مسارات المبيعات.\n\nيرجى اختيار الخدمة المطلوبة للمتابعة 👇"
            : "👋 *Hello! Welcome to FizMoh Growth.*\n\nYour certified partner for Google Ads, Meta scaling, and WhatsApp sales automation.\n\nPlease select an option from our menu below 👇",
          buttons: isAr
            ? ["🔍 خدمات التسويق وإعلانات جوجل", "📊 دراسات الحالة والنتائج", "📑 طلب عرض سعر مخصص", "🎥 حجز استشارة Google Meet"]
            : ["🔍 Marketing & SEO Services", "📊 Case Studies & ROI", "📑 Request Custom Proposal", "🎥 Book Google Meet Session"],
          time: getTime(),
        },
      ])
    } else if (selectedMode === "hospital") {
      setMessages([
        {
          id: "h1",
          from: "them",
          text: isAr ? "السلام عليكم، أود حجز سرير رعاية نهارية للعلاج الكيماوي لمريض رقم MRN-9182." : "Hello, I need to book Chemotherapy Day Care for patient MRN-9182.",
          time: getTime(),
        },
        {
          id: "h2",
          from: "us",
          text: isAr
            ? "🏥 *مستشفى كوفري - وحدة الرعاية النهارية والأورام*\n\nيتوفر لدينا 30 سريراً مجهزاً بالكامل. يرجى اختيار الجناح المفضل لتثبيت الحجز:"
            : "🏥 *Kauvery Hospital Oncology Day Care*\n\nWe have 30 clinical infusion beds available. Which ward do you prefer?",
          buttons: isAr
            ? ["جناح خاص (S01-S15)", "جناح عام (N01-N15)", "استشارة طبيب الأورام"]
            : ["Special Ward (S01-S15)", "Normal Ward (N01-N15)", "Oncology Consultation"],
          time: getTime(),
        },
      ])
    } else if (selectedMode === "tours") {
      setMessages([
        {
          id: "t1",
          from: "them",
          text: isAr ? "مرحباً، هل تتوفر رحلات سفاري صحراء الوهيبة في نهاية هذا الأسبوع؟" : "Hi! Do you have Wahiba Sands desert safari slots this weekend?",
          time: getTime(),
        },
        {
          id: "t2",
          from: "us",
          text: isAr
            ? "🐪 *مغامرات عمان — سفاري صحراء الوهيبة والتخييم*\n\nتتوفر لدينا مقاعد شاغرة يومي السبت والأحد مع جولة الكثبان الرملية ووجبة عشاء.\n\nاختر الموعد المفضل:"
            : "🐪 *Oman Adventures — Wahiba Sands Desert Safari*\n\nWe have slots open this Saturday & Sunday with dune bashing and sunset dinner.\n\nChoose your preferred departure:",
          image: "/tours/desert-1.jpg",
          imageCaption: isAr ? "سفاري صحراء الوهيبة وتجربة التخييم الفاخر 🐪" : "Wahiba Sands Desert Safari & VIP Camp 🐪",
          buttons: isAr
            ? ["السبت 6:00 صباحاً (شخصين)", "الأحد 6:00 صباحاً", "سفاري VIP خاص"]
            : ["Saturday 6:00 AM (2 Guests)", "Sunday 6:00 AM", "Private VIP Safari"],
          time: getTime(),
        },
      ])
    } else {
      setMessages([
        {
          id: "r1",
          from: "them",
          text: isAr ? "هل طقم عطور العود الملكي متوفر لديكم للتوصيل في مسقط؟" : "Is the Royal Arabic Oud gift set in stock for delivery in Muscat?",
          time: getTime(),
        },
        {
          id: "r2",
          from: "us",
          text: isAr
            ? "🛍️ *متجر عطور مسقط الفاخرة*\n\nنعم، متوفر في المخزن (آخر 3 قطع) مع توصيل مجاني سريع في مسقط خلال 24 ساعة.\n\nالسعر: 45.000 ر.ع."
            : "🛍️ *Muscat Luxury Perfumes*\n\nYes! 3 gift sets remaining in stock with free express delivery in Muscat.\n\nPrice: 45.000 OMR.",
          image: "/retail/oud-perfume.svg",
          imageCaption: isAr ? "طقم عطور العود الملكي الفاخر (45.000 ر.ع)" : "Royal Arabic Oud Gift Set (45.000 OMR)",
          buttons: isAr
            ? ["شراء الآن (45.000 ر.ع)", "استعراض صور المنتج", "تفاصيل التوصيل"]
            : ["Order Now (45 OMR)", "View Product Photos", "Delivery Info"],
          time: getTime(),
        },
      ])
    }
  }

  useEffect(() => {
    resetDemo(mode)
  }, [mode, isAr])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  // Handle interactive button clicks
  const handleButtonClick = (btnText: string) => {
    const userMsg: Message = {
      id: `u_${Date.now()}`,
      from: "them",
      text: btnText,
      time: getTime(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsTyping(true)

    setTimeout(() => {
      setIsTyping(false)
      if (mode === "marketing") {
        if (btnText.includes("Marketing") || btnText.includes("تسويق") || btnText.includes("Services")) {
          setMessages((prev) => [
            ...prev,
            {
              id: `b_${Date.now()}`,
              from: "us",
              text: isAr
                ? "📢 *خدمات FizMoh للنمو:*\nما هي القناة الإعلانية التي ترغب بالتركيز عليها؟"
                : "📢 *FizMoh Performance Services:*\nWhich primary channel would you like to scale?",
              buttons: isAr
                ? ["🎯 إعلانات جوجل والظهور الأول", "📱 إعلانات إنستغرام وتيك توك", "💻 تطوير المواقع والمتاجر"]
                : ["🎯 Google Ads & Top Rankings", "📱 Instagram & TikTok Ads", "💻 High-Converting Funnels"],
              time: getTime(),
            },
          ])
        } else if (btnText.includes("Google Meet") || btnText.includes("استشارة") || btnText.includes("Proposal") || btnText.includes("عرض")) {
          setMessages((prev) => [
            ...prev,
            {
              id: `b_${Date.now()}`,
              from: "us",
              text: isAr
                ? "🎉 *تم تأكيد موعد الاستشارة الاستراتيجية!*\n\n📅 الموعد: غداً في تمام الساعة 10:00 صباحاً\n🔖 رقم المرجع: #APT-2026-9812\n\n🎥 *رابط اجتماع Google Meet:*\nhttps://meet.google.com/fiz-apt-grow\n\nتم حفظ البيانات في CRM وإسناد الموعد لكبير مستشاري النمو! 🚀"
                : "🎉 *Strategy Consultation Confirmed!*\n\n📅 Date: Tomorrow at 10:00 AM\n🔖 Ref: #APT-2026-9812\n\n🎥 *Google Meet Video Room:*\nhttps://meet.google.com/fiz-apt-grow\n\nSynced to CRM and assigned to senior growth strategist! 🚀",
              card: {
                title: isAr ? "استشارة استراتيجية رقمية · Google Meet" : "Digital Strategy · Google Meet",
                subtitle: isAr ? "تم الحجز والتأكيد" : "Confirmed & Synced to CRM",
                amount: isAr ? "مؤكد ✅" : "Active Booking ✅",
                tag: "CRM Synced",
              },
              buttons: isAr ? ["🏠 القائمة الرئيسية", "💬 استفسار آخر"] : ["🏠 Main Menu", "💬 Ask Another Question"],
              time: getTime(),
            },
          ])
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `b_${Date.now()}`,
              from: "us",
              text: isAr
                ? "📊 *توصية الاستراتيجية:*\nنوصي بإطلاق حملة متكاملة تجمع بين إعلانات الدفع بالنقرة ومسار واتساب الآلي.\n\nهل ترغب بجدولة اجتماع مباشر عبر Google Meet؟"
                : "📊 *Strategy Blueprint:*\nWe recommend a multi-channel performance strategy with automated WhatsApp lead capture.\n\nWould you like to schedule a 30-min strategy walkthrough?",
              buttons: isAr ? ["🎥 حجز استشارة Google Meet", "📑 طلب عرض PDF"] : ["🎥 Book Google Meet Session", "📑 Request PDF Proposal"],
              time: getTime(),
            },
          ])
        }
      } else if (mode === "hospital") {
        if (btnText.includes("Special") || btnText.includes("خاص") || btnText.includes("Normal") || btnText.includes("عام")) {
          const bedName = btnText.includes("Special") || btnText.includes("خاص") ? "Bed S04 (Special Ward)" : "Bed N07 (Normal Ward)"
          setMessages((prev) => [
            ...prev,
            {
              id: `b_${Date.now()}`,
              from: "us",
              text: isAr
                ? `🏥 *تم تخصيص السرير: ${bedName}*\nالفترة: الصباحية (08:00 - 14:00) مع د. أحمد خان.\nتم تفعيل حجز مؤقت لمدة 5 دقائق. هل ترغب بتأكيد الحجز؟`
                : `🏥 *${bedName} Available*\nSession: Morning (08:00 - 14:00) with Dr. Ahmed Khan.\n5-minute hold active. Confirm your booking?`,
              buttons: isAr ? [`تأكيد حجز ${bedName}`, "تغيير الموعد"] : [`Confirm ${bedName}`, "Change Schedule"],
              time: getTime(),
            },
          ])
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `b_${Date.now()}`,
              from: "us",
              text: isAr
                ? "✅ *تم تأكيد حجز سرير العلاج الكيماوي!*\n\n🛏️ السرير: S04 (الجناح الخاص)\n⏰ التوقيت: 08:00 - 14:00\n👨‍⚕️ الأخصائي: د. أحمد خان\n\n📋 *تعليمات ما قبل الجلسة:* يرجى تناول الأدوية الموصوفة مع وجبة خفيفة والحضور قبل الموعد بـ 15 دقيقة."
                : "✅ *Chemotherapy Day Care Reserved!*\n\n🛏️ Bed S04 (Special Ward)\n⏰ Session: 08:00 - 14:00\n👨‍⚕️ Oncologist: Dr. Ahmed Khan\n\n📋 *Pre-Med Checklist:* Take prescribed meds with light food and arrive 15 minutes before 08:00 AM.",
              card: {
                title: isAr ? "سرير رعاية نهارية S04 · مؤكد" : "Day Care Bed S04 · Reserved",
                subtitle: isAr ? "مستشفى كوفري للأورام" : "Kauvery Oncology Care",
                amount: isAr ? "محجوز 🛏️" : "Confirmed 🛏️",
                tag: "Clinical EHR",
              },
              buttons: isAr ? ["🏠 العودة للرئيسية", "🔔 إرسال تذكير واتساب"] : ["🏠 Hospital Home", "🔔 Send WhatsApp Reminder"],
              time: getTime(),
            },
          ])
        }
      } else if (mode === "tours") {
        if (btnText.includes("QR") || btnText.includes("قسيمة") || btnText.includes("Voucher")) {
          setMessages((prev) => [
            ...prev,
            {
              id: `b_${Date.now()}`,
              from: "us",
              image: "/tours/desert-1.jpg",
              imageCaption: isAr ? "قسيمة حجز رقم #OMN-88219 معتمدة مع باركود الصعود 🎫" : "Booking Voucher #OMN-88219 with QR Boarding Pass 🎫",
              text: isAr
                ? "🎫 *قسيمة الحجز والتذكرة الرقمية:*\nيرجى إبراز هذه القسيمة لكابتن السفاري عند نقطة الانطلاق.\nنراكم غداً صباحاً!"
                : "🎫 *Digital Boarding Voucher:*\nPlease present this pass to your safari guide at hotel pickup point.\nSee you tomorrow morning!",
              buttons: isAr ? ["حجز جولة أخرى", "موقع نقطة الانطلاق"] : ["Book Another Tour", "Pickup GPS Location"],
              time: getTime(),
            },
          ])
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `b_${Date.now()}`,
              from: "us",
              text: isAr
                ? "✅ *تم تأكيد حجز سفاري صحراء الوهيبة!*\nنقطة الانطلاق: فندق مسقط (6:00 صباحاً)\nالمبلغ: 90.000 ر.ع عبر بوابة أموال باي.\nتم إصدار قسيمة الحجز (QR Voucher) ورابط موقع السائق!"
                : "✅ *Wahiba Sands Safari Booked!*\nPickup: Muscat Hotel (6:00 AM)\nTotal: 90.000 OMR via AmwalPay card checkout.\nQR Voucher and driver GPS link generated!",
              card: {
                title: isAr ? "سفاري صحراء الوهيبة · شخصين" : "Wahiba Sands Safari · 2 Guests",
                subtitle: isAr ? "تم الدفع عبر أموال باي" : "Paid via AmwalPay Gateway",
                amount: "90.000 OMR ✅",
                tag: "Paid & Verified",
              },
              buttons: isAr ? ["عرض قسيمة الحجز (QR)", "حجز جولة أخرى"] : ["View QR Voucher", "Book Another Tour"],
              time: getTime(),
            },
          ])
        }
      } else {
        if (btnText.includes("Photos") || btnText.includes("صور") || btnText.includes("استعراض")) {
          setMessages((prev) => [
            ...prev,
            {
              id: `b_${Date.now()}`,
              from: "us",
              image: "/retail/oud-perfume.svg",
              imageCaption: isAr ? "طقم عطور العود الملكي مع صندوق الإهداء الفاخر 🎁" : "Royal Arabic Oud Extrait with Luxury Gift Box 🎁",
              text: isAr
                ? "📸 *تفاصيل الطقم الفاخر:*\n• زجاجة عود ملكي 100 مل مركز\n• مخلط دهن العود الكمبودي 12 مل\n• صندوق خشبي مطعم بنقوش ذهبية\n\nالسعر: 45.000 ر.ع فقط مع توصيل مجاني."
                : "📸 *Luxury Gift Set Specs:*\n• 100ml Pure Royal Oud Extrait\n• 12ml Cambodian Dehn Al Oud\n• Handcrafted Velvet Box\n\nPrice: 45.000 OMR with Free Muscat Delivery.",
              buttons: isAr ? ["شراء الآن (45.000 ر.ع)", "تفاصيل التوصيل"] : ["Order Now (45 OMR)", "Delivery Info"],
              time: getTime(),
            },
          ])
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `b_${Date.now()}`,
              from: "us",
              text: isAr
                ? "✅ *تم تأكيد الطلب بنجاح!*\nطقم عطور العود الملكي قيد التجهيز للتوصيل السريع.\nموعد الوصول المتوقع: غداً بين 10:00 صباحاً و1:00 ظهراً."
                : "✅ *Order Confirmed!*\nRoyal Arabic Oud Gift Set is prepared for express dispatch.\nExpected delivery: Tomorrow 10:00 AM - 1:00 PM.",
              card: {
                title: isAr ? "طقم عود ملكي فاخر · جاهز" : "Royal Oud Gift Set · In Stock",
                subtitle: isAr ? "تم التحصيل عبر أموال باي" : "Settled via AmwalPay Card",
                amount: "45.000 OMR ✅",
                tag: "Order #8491",
              },
              buttons: isAr ? ["تتبع حالة الشحنة", "استعراض المزيد"] : ["Track Delivery", "View More Perfumes"],
              time: getTime(),
            },
          ])
        }
      }
    }, 600)
  }

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault()
    if (!interactiveInput.trim()) return
    const text = interactiveInput.trim()
    setInteractiveInput("")
    handleButtonClick(text)
  }

  return (
    <div className="space-y-3.5 max-w-[360px] mx-auto">
      {/* Clean Segmented Scenario Switcher (Vibrant Light System) */}
      <div className={`flex items-center justify-between gap-1 p-1 rounded-[8px] bg-[#F2F2F2] border border-[#E5E7EB] ${showSwitcher ? "" : "hidden"}`}>
        {[
          { id: "marketing", label: isAr ? "تسويق" : "Agency", icon: Sparkles },
          { id: "hospital", label: isAr ? "مستشفى" : "Clinic", icon: Stethoscope },
          { id: "tours", label: isAr ? "سياحة" : "Safari", icon: Compass },
          { id: "retail", label: isAr ? "متجر" : "Store", icon: ShoppingBag },
        ].map((item) => {
          const active = mode === item.id
          return (
            <button
              key={item.id}
              onClick={() => setMode(item.id as any)}
              className={`flex-1 py-1.5 px-2 rounded-[6px] text-[11.5px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                active
                  ? "bg-white text-[#1D1D1D] shadow-xs border border-[#E5E7EB]"
                  : "text-[#717680] hover:text-[#1D1D1D]"
              }`}
            >
              <item.icon className="h-3 w-3 text-[#00B96A]" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>

      {/*
        * A device, not a dark rectangle.
        *
        * The chrome is what makes a product shot read as a real phone: a
        * titanium-toned bezel with a lit edge, the dynamic island cut out of
        * the screen rather than drawn on top of it, physical side buttons, and
        * a single diagonal glare across the glass. All of it is decorative, so
        * it is hidden from assistive technology — a screen reader announcing
        * "volume button" on a marketing page is noise.
        */}
      <div className="relative">
        {/* Side buttons, sitting behind the body so they read as part of it. */}
        <span aria-hidden="true" className="absolute -left-[3px] top-[92px] h-8 w-[3px] rounded-l-sm bg-gradient-to-b from-[#3a3a3c] to-[#1d1d1f]" />
        <span aria-hidden="true" className="absolute -left-[3px] top-[136px] h-14 w-[3px] rounded-l-sm bg-gradient-to-b from-[#3a3a3c] to-[#1d1d1f]" />
        <span aria-hidden="true" className="absolute -right-[3px] top-[116px] h-20 w-[3px] rounded-r-sm bg-gradient-to-b from-[#3a3a3c] to-[#1d1d1f]" />

        <div
          className="relative rounded-[42px] p-[10px] shadow-[0_30px_60px_-20px_rgba(12,10,9,0.45),0_0_0_1px_rgba(255,255,255,0.06)_inset]"
          style={{ background: "linear-gradient(155deg, #6b6b70 0%, #1d1d1f 22%, #101012 55%, #2c2c2e 100%)" }}
        >
          {/* Screen Canvas */}
          <div className="relative rounded-[33px] overflow-hidden bg-[#0c1317] flex flex-col h-[490px]">
            {/* Dynamic island, cut out of the screen itself. */}
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-2 z-20 h-[22px] w-[78px] -translate-x-1/2 rounded-full bg-black"
            />
            {/* One soft diagonal reflection across the glass. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-20"
              style={{ background: "linear-gradient(118deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 26%, transparent 46%)" }}
            />
          {/* WhatsApp Header */}
          <div className="bg-[#1f2c34] text-white pt-3 pb-2.5 px-3 flex items-center justify-between border-b border-[#2a3942] shrink-0">
            <div className="flex items-center gap-2">
              <ChevronLeft className="h-4 w-4 text-[#9ca3af]" />
              <div className="h-7 w-7 rounded-full bg-[#00E785] flex items-center justify-center font-bold text-[11px] text-[#1D1D1D]">
                {mode === "marketing" ? "FM" : mode === "hospital" ? "KH" : mode === "tours" ? "OA" : "MP"}
              </div>
              <div>
                <div className="font-semibold text-[12px] text-white flex items-center gap-1">
                  <span>
                    {mode === "marketing"
                      ? isAr ? "بوت Fizmoh" : "Fizmoh Bot"
                      : mode === "hospital"
                      ? isAr ? "مستشفى كوفري" : "Kauvery Care"
                      : mode === "tours"
                      ? isAr ? "مغامرات عمان" : "Oman Tours"
                      : isAr ? "عطور مسقط" : "Muscat Oud"}
                  </span>
                  <span className="h-2.5 w-2.5 rounded-full bg-[#00E785] text-black grid place-items-center text-[7px] font-black">
                    ✓
                  </span>
                </div>
                <div className="text-[9.5px] text-[#00E785] flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00E785] animate-pulse" />
                  <span>{isAr ? "متصل الآن" : "Online · Verified API"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-[#9ca3af]">
              <Video className="h-3.5 w-3.5" />
              <Phone className="h-3 w-3" />
              <button onClick={() => resetDemo(mode)} className="text-[#9ca3af] hover:text-white" title="Reset Demo">
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div
            ref={scrollRef}
            className="flex-1 p-3 space-y-2.5 overflow-y-auto bg-[#0b141a]"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.from === "them" ? "items-end" : "items-start"}`}
              >
                {/* Media Attachment / Image */}
                {m.image && (
                  <div className="max-w-[88%] rounded-xl overflow-hidden mb-1 border border-[#2a3942] bg-[#202c33]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.image}
                      alt={m.imageCaption || "Photo"}
                      className="w-full max-h-48 object-cover"
                      loading="eager"
                    />
                    {m.imageCaption && (
                      <div className="p-2 text-[10.5px] text-[#e9edef] bg-[#202c33] border-t border-[#2a3942]/60">
                        {m.imageCaption}
                      </div>
                    )}
                  </div>
                )}

                {m.text && (
                  <div
                    className={`max-w-[88%] rounded-xl px-3 py-2 text-[11px] leading-relaxed ${
                      m.from === "them"
                        ? "bg-[#005c4b] text-white rounded-tr-xs"
                        : "bg-[#202c33] text-[#e9edef] rounded-tl-xs border border-[#2a3942]"
                    }`}
                  >
                    <div className="whitespace-pre-line">{m.text}</div>
                    <div className="text-[8.5px] text-[#8696a0] text-right mt-1 flex items-center justify-end gap-1">
                      <span>{m.time}</span>
                      <CheckCheck className="h-3 w-3 text-sky-400" />
                    </div>
                  </div>
                )}

                {/* Summary Card */}
                {m.card && (
                  <div className="mt-1.5 max-w-[88%] bg-[#111b21] rounded-xl p-2.5 border border-[#00E785]/30 text-left space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-[#00E785] bg-[#00E785]/10 px-1.5 py-0.5 rounded border border-[#00E785]/20">
                        {m.card.tag || "Verified"}
                      </span>
                      <span className="text-[11px] font-bold text-[#00E785]">{m.card.amount}</span>
                    </div>
                    <div className="text-[11px] font-semibold text-white">{m.card.title}</div>
                    {m.card.subtitle && <div className="text-[9.5px] text-[#9ca3af]">{m.card.subtitle}</div>}
                  </div>
                )}

                {/* Clickable Interactive Buttons */}
                {m.buttons && (
                  <div className="mt-1.5 space-y-1 max-w-[88%] w-full">
                    {m.buttons.map((btn, bi) => (
                      <button
                        key={bi}
                        onClick={() => handleButtonClick(btn)}
                        className="w-full bg-[#202c33] hover:bg-[#2a3942] text-[#00E785] font-medium text-center text-[10.5px] py-1.5 px-2.5 rounded-lg border border-[#2a3942] transition-all cursor-pointer"
                      >
                        <span>{btn}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1 bg-[#202c33] px-2.5 py-2 rounded-xl rounded-tl-xs w-12 border border-[#2a3942]">
                <div className="h-1 w-1 bg-[#00E785] rounded-full animate-bounce" />
                <div className="h-1 w-1 bg-[#00E785] rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="h-1 w-1 bg-[#00E785] rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={handleSendText}
            className="p-2 bg-[#202c33] border-t border-[#2a3942] flex items-center gap-1.5 shrink-0"
          >
            <input
              type="text"
              value={interactiveInput}
              onChange={(e) => setInteractiveInput(e.target.value)}
              placeholder={isAr ? "اكتب رسالة للتجربة..." : "Type test message (e.g. SEO, Book)..."}
              className="flex-1 bg-[#2a3942] text-white placeholder:text-[#8696a0] rounded-full px-3 py-1.5 text-[11px] border-0 focus:outline-none"
            />
            <button
              type="submit"
              className="h-7 w-7 rounded-full bg-[#00E785] hover:bg-[#00B96A] text-[#1D1D1D] flex items-center justify-center cursor-pointer font-bold shrink-0"
            >
              <Send className="h-3 w-3" />
            </button>
          </form>
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] text-[#717680] flex items-center justify-center gap-1 font-medium">
        <MousePointerClick className="h-3.5 w-3.5 text-[#00B96A]" />
        <span>{isAr ? "اضغط على أي خيار داخل المحاكي للتجربة" : "Click any option inside device to test flow"}</span>
      </p>
    </div>
  )
}
