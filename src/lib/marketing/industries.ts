import type { MarketingPage } from "./types"

/**
 * Industry landing pages — one per vertical in the "Industries" nav menu.
 *
 * Route: /solutions/[slug]. Rendered by the shared template in
 * src/app/solutions/[slug]/page.tsx, which checks this list first and falls
 * back to the older SOLUTION_PAGES (comparison pages and a handful of other
 * verticals) for anything not defined here.
 *
 * Slugs are stable and linked from the header, the footer, the sitemap and the
 * product pages. Old /product/* industry slugs redirect here in next.config.ts.
 */

export const INDUSTRY_PAGES: MarketingPage[] = [
  /* ===================================================================== */
  /* 1. Restaurants & Dining                                                */
  /*    Primary:    WhatsApp ordering for restaurants                       */
  /*    Secondary:  QR menu WhatsApp · restaurant table booking WhatsApp ·  */
  /*                WhatsApp restaurant Oman                                */
  /* ===================================================================== */
  {
    slug: "restaurants-dining",
    primaryKeyword: "WhatsApp ordering for restaurants",
    secondaryKeywords: [
      "QR menu WhatsApp",
      "restaurant table booking WhatsApp",
      "WhatsApp restaurant Oman",
    ],
    keywords: [
      "WhatsApp ordering for restaurants", "QR menu WhatsApp", "restaurant table booking WhatsApp",
      "WhatsApp restaurant Oman", "restaurant WhatsApp bot", "WhatsApp reservation system restaurant",
      "kitchen order routing WhatsApp", "restaurant WhatsApp marketing", "no commission restaurant ordering",
      "WhatsApp menu link", "restaurant WhatsApp GCC", "table deposit WhatsApp",
    ],
    metaTitle: {
      en: "WhatsApp Ordering & Table Booking for Restaurants | Fizmoh",
      ar: "طلبات وحجز طاولات عبر واتساب للمطاعم | Fizmoh",
    },
    metaDescription: {
      en: "QR menus that open a WhatsApp chat, table reservations checked against real availability, and orders routed straight to the kitchen, with no delivery-app cut.",
      ar: "منيو باركود يفتح محادثة واتساب، وحجوزات طاولات تُطابَق مع التوفر الحقيقي، وطلبات تُوجَّه مباشرة إلى المطبخ — دون جهاز لكل طاولة أو عمولة تطبيق توصيل.",
    },
    eyebrow: { en: "Restaurants & Dining", ar: "المطاعم والوجبات" },
    h1: {
      en: "Take orders and bookings on WhatsApp, send them straight to the kitchen",
      ar: "استقبل الطلبات والحجوزات على واتساب، وأرسلها مباشرة إلى المطبخ",
    },
    subheadline: {
      en: "QR menus that open a chat, table reservations that check real availability, and orders that print in the kitchen — without a tablet per table or handing a third of every bill to a delivery app.",
      ar: "منيو باركود يفتح محادثة، وحجوزات طاولات تتحقق من التوفر الفعلي، وطلبات تُطبع في المطبخ — دون جهاز لكل طاولة أو تسليم ثلث كل فاتورة لتطبيق توصيل.",
    },
    hero: {
      src: "/marketing/industries/restaurants-dining.jpg",
      alt: {
        en: "Elegant modern Middle Eastern restaurant interior at golden hour with set tables, warm pendant lights and a waiter carrying plates",
        ar: "صالة مطعم شرق أوسطي عصري أنيق وقت الغروب، طاولات مُجهّزة وإضاءة دافئة ونادل يحمل الأطباق",
      },
      width: 1280,
      height: 714,
      placeholder: true,
    },
    heroNote: {
      en: "Your own number · no per-order commission on direct orders · Arabic and English menus",
      ar: "رقمك الخاص · بلا عمولة على الطلبات المباشرة · قوائم بالعربية والإنجليزية",
    },
    problems: [
      {
        title: { en: "The phone rings through the dinner rush", ar: "الهاتف يرنّ طوال ذروة العشاء" },
        body: {
          en: "Someone has to leave the floor to take a booking or a pickup order, right when every table needs attention.",
          ar: "على أحدهم ترك الصالة لأخذ حجز أو طلب استلام، في اللحظة التي تحتاج فيها كل طاولة اهتماماً.",
        },
      },
      {
        title: { en: "Delivery apps take 25–30%", ar: "تطبيقات التوصيل تأخذ 25–30%" },
        body: {
          en: "On a thin-margin plate, a third of the bill to an aggregator is the difference between a good night and a break-even one.",
          ar: "على طبق بهامش ضئيل، ثلث الفاتورة لوسيط هو الفرق بين ليلة جيدة وليلة تعادل.",
        },
      },
      {
        title: { en: "Bookings live in a paper diary", ar: "الحجوزات في دفتر ورقي" },
        body: {
          en: "A double-booked 8pm, a no-show table nobody could refill, a reservation lost because the page was full — all invisible until service.",
          ar: "طاولة الثامنة محجوزة مرتين، وطاولة لم يحضر أصحابها ولم يُعِد أحد ملأها، وحجز ضاع لامتلاء الصفحة — كلها غير مرئية حتى وقت الخدمة.",
        },
      },
    ],
    useCases: [
      {
        icon: "QrCode",
        title: { en: "QR on the table → order to the kitchen", ar: "باركود على الطاولة ← الطلب إلى المطبخ" },
        body: {
          en: "The customer scans, the menu opens in WhatsApp, they order, and it arrives on the kitchen screen typed and timed — not shouted across a pass.",
          ar: "يمسح العميل الرمز، يفتح المنيو في واتساب، يطلب، فيصل إلى شاشة المطبخ مكتوباً ومُوقَّتاً — لا مصروخاً عبر ممرّ التقديم.",
        },
      },
      {
        icon: "CalendarClock",
        title: { en: "Reservations against real availability", ar: "حجوزات مقابل توفر حقيقي" },
        body: {
          en: "The booking flow only offers tables that are actually free for that size and time, and can take a deposit to hold them.",
          ar: "تعرض خطوة الحجز الطاولات المتاحة فعلاً لذلك العدد والوقت فقط، ويمكنها أخذ عربون لحجزها.",
        },
      },
      {
        icon: "ShoppingBag",
        title: { en: "Pickup and delivery on your own number", ar: "استلام وتوصيل على رقمك الخاص" },
        body: {
          en: "Direct orders for collection or your own drivers, paid by card in OMR or on arrival, with no aggregator commission.",
          ar: "طلبات مباشرة للاستلام أو لسائقيك، مدفوعة بالبطاقة بالريال العماني أو عند الوصول، دون عمولة وسيط.",
        },
      },
      {
        icon: "Soup",
        title: { en: "\"Where's my order?\" answered by the bot", ar: "\"أين طلبي؟\" يجيب البوت" },
        body: {
          en: "Status updates — preparing, ready, on the way — go out automatically so the kitchen line is not also a call centre.",
          ar: "تحديثات الحالة — قيد التحضير، جاهز، في الطريق — تُرسل تلقائياً فلا يكون خط المطبخ مركز اتصال أيضاً.",
        },
      },
      {
        icon: "Megaphone",
        title: { en: "Tonight's special to opted-in regulars", ar: "طبق الليلة إلى الزبائن الموافقين" },
        body: {
          en: "A broadcast to people who have dined with you before fills a quiet Tuesday faster than a post that 5% of followers see.",
          ar: "بث إلى من تناولوا الطعام لديك سابقاً يملأ ثلاثاءً هادئاً أسرع من منشور يراه 5% من المتابعين.",
        },
      },
    ],
    how: [
      {
        title: { en: "Put a QR on tables and receipts", ar: "ضع باركود على الطاولات والإيصالات" },
        body: {
          en: "One code per table or a single code for takeaway. Scanning opens WhatsApp — nothing to install.",
          ar: "رمز لكل طاولة أو رمز واحد للسفري. مسحه يفتح واتساب — لا شيء للتثبيت.",
        },
      },
      {
        title: { en: "The customer browses and orders in the chat", ar: "يتصفّح العميل ويطلب في المحادثة" },
        body: {
          en: "Menu with photos, prices and modifiers in Arabic or English, with the table number already attached.",
          ar: "منيو بالصور والأسعار والإضافات بالعربية أو الإنجليزية، ورقم الطاولة مرفق مسبقاً.",
        },
      },
      {
        title: { en: "The order routes to the kitchen", ar: "يُوجَّه الطلب إلى المطبخ" },
        body: {
          en: "It lands on a kitchen screen or printer, grouped by course, with any allergy note the customer added.",
          ar: "يصل إلى شاشة أو طابعة المطبخ، مجمّعاً حسب الطبق، مع أي ملاحظة حساسية أضافها العميل.",
        },
      },
      {
        title: { en: "Payment and follow-up", ar: "الدفع والمتابعة" },
        body: {
          en: "Pay by card in OMR or at the table. After the meal, an automatic message asks for feedback and invites them back.",
          ar: "الدفع بالبطاقة بالريال العماني أو على الطاولة. بعد الوجبة، رسالة تلقائية تطلب رأيهم وتدعوهم للعودة.",
        },
      },
    ],
    features: [
      {
        feature: { en: "Ordering on your own WhatsApp number", ar: "الطلب على رقم واتساب الخاص بك" },
        benefit: { en: "No aggregator commission on direct orders — the margin stays in the restaurant.", ar: "لا عمولة وسيط على الطلبات المباشرة — يبقى الهامش في المطعم." },
      },
      {
        feature: { en: "Kitchen order routing", ar: "توجيه الطلبات للمطبخ" },
        benefit: { en: "Orders arrive typed, timed and grouped, so fewer are misheard and remade.", ar: "تصل الطلبات مكتوبة ومُوقَّتة ومجمّعة، فتقلّ الأخطاء وإعادة التحضير." },
      },
      {
        feature: { en: "Live table availability", ar: "توفر طاولات مباشر" },
        benefit: { en: "No double-booked 8pm and no reservation lost to a full page.", ar: "لا طاولة ثامنة محجوزة مرتين ولا حجز يضيع بسبب صفحة ممتلئة." },
      },
      {
        feature: { en: "Table deposits", ar: "عربون الطاولات" },
        benefit: { en: "A held card or a small prepayment turns most no-show tables into kept ones.", ar: "بطاقة محجوزة أو دفعة صغيرة تحوّل معظم طاولات عدم الحضور إلى طاولات محفوظة." },
      },
      {
        feature: { en: "Regulars segment", ar: "شريحة الزبائن الدائمين" },
        benefit: { en: "The Tuesday-night offer reaches people who actually come back, not a follower feed.", ar: "عرض ليلة الثلاثاء يصل إلى من يعودون فعلاً، لا إلى موجز متابعين." },
      },
      {
        feature: { en: "Bilingual menus and replies", ar: "قوائم وردود ثنائية اللغة" },
        benefit: { en: "Arabic and English diners both get a menu they can read and a bot they can talk to.", ar: "يحصل روّاد العربية والإنجليزية على منيو يقرؤونه وبوت يحادثونه." },
      },
    ],
    stats: [
      { value: { en: "25–30%", ar: "25–30%" }, label: { en: "typical delivery-app commission avoided on direct orders", ar: "متوسط عمولة تطبيق التوصيل المتجنَّبة على الطلبات المباشرة" }, estimate: true },
      { value: { en: "0", ar: "0" }, label: { en: "tablets or apps for customers to install", ar: "أجهزة أو تطبيقات على العملاء تثبيتها" } },
      { value: { en: "OMR", ar: "ر.ع" }, label: { en: "in-chat card payment", ar: "دفع بالبطاقة داخل المحادثة" } },
      { value: { en: "AR + EN", ar: "عربي + إنجليزي" }, label: { en: "menus and bot replies", ar: "قوائم وردود البوت" } },
    ],
    testimonials: [
      {
        quote: {
          en: "TODO: replace with real client quote — a restaurant owner comparing the margin on a WhatsApp direct order against the same order through a delivery app.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — صاحب مطعم يقارن هامش طلب واتساب مباشر بالطلب نفسه عبر تطبيق توصيل.",
        },
        name: "",
        role: { en: "Restaurant Owner", ar: "صاحب مطعم" },
        company: "TODO",
        todo: true,
      },
      {
        quote: {
          en: "TODO: replace with real client quote — a floor manager describing what kitchen order routing did to remakes during a Friday service.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — مدير صالة يصف ما فعله توجيه الطلبات للمطبخ بإعادة التحضير خلال خدمة الجمعة.",
        },
        name: "",
        role: { en: "Floor Manager", ar: "مدير الصالة" },
        company: "TODO",
        todo: true,
      },
    ],
    faqs: [
      {
        q: { en: "Do customers need to install an app to order?", ar: "هل يحتاج العملاء تثبيت تطبيق للطلب؟" },
        a: {
          en: "No. Scanning the QR code opens a normal WhatsApp chat with your restaurant. Everything — menu, order, payment — happens in that conversation.",
          ar: "لا. مسح رمز الباركود يفتح محادثة واتساب عادية مع مطعمك. كل شيء — المنيو، الطلب، الدفع — يحدث في تلك المحادثة.",
        },
      },
      {
        q: { en: "Does this replace my delivery platform?", ar: "هل يحل هذا محل منصة التوصيل لديّ؟" },
        a: {
          en: "For direct orders — pickup and your own drivers — yes, and you keep the commission. You can still list on aggregators for their reach; the two work side by side.",
          ar: "للطلبات المباشرة — الاستلام وسائقوك — نعم، وتحتفظ بالعمولة. يمكنك البقاء على المنصات الوسيطة للوصول؛ يعمل الاثنان جنباً إلى جنب.",
        },
      },
      {
        q: { en: "How do orders reach the kitchen?", ar: "كيف تصل الطلبات إلى المطبخ؟" },
        a: {
          en: "Each order appears on a kitchen display or prints on a ticket, grouped by course, with the table number and any notes the customer added.",
          ar: "يظهر كل طلب على شاشة مطبخ أو يُطبع على تذكرة، مجمّعاً حسب الطبق، مع رقم الطاولة وأي ملاحظات أضافها العميل.",
        },
      },
      {
        q: { en: "Can I take a deposit to hold a table?", ar: "هل أستطيع أخذ عربون لحجز طاولة؟" },
        a: {
          en: "Yes. The reservation flow can require a card deposit in OMR before the table is confirmed, which is the single most effective way to cut no-shows.",
          ar: "نعم. يمكن لخطوة الحجز اشتراط عربون بالبطاقة بالريال العماني قبل تأكيد الطاولة، وهي أكثر طريقة فعّالة لتقليل عدم الحضور.",
        },
      },
      {
        q: { en: "Can it handle Arabic and English menus?", ar: "هل يتعامل مع قوائم بالعربية والإنجليزية؟" },
        a: {
          en: "Yes. The menu and the bot both work in Arabic and English, and the bot replies in whichever language the customer messages in.",
          ar: "نعم. يعمل المنيو والبوت بالعربية والإنجليزية، ويرد البوت باللغة التي يراسل بها العميل.",
        },
      },
      {
        q: { en: "What does it cost per order?", ar: "كم تكلفة الطلب الواحد؟" },
        a: {
          en: "There is no per-order commission. You pay the platform subscription and Meta's per-conversation WhatsApp fee — both are on the pricing page — not a percentage of the bill.",
          ar: "لا توجد عمولة لكل طلب. تدفع اشتراك المنصة ورسوم واتساب لكل محادثة من Meta — وكلاهما على صفحة الأسعار — لا نسبة من الفاتورة.",
        },
      },
    ],
    related: [
      { href: "/product/payments", label: { en: "AmwalPay Online Payments — take the deposit", ar: "مدفوعات أموال باي — خذ العربون" } },
      { href: "/product/broadcast-campaigns", label: { en: "Broadcast & Marketing Campaigns — fill quiet nights", ar: "حملات البث والتسويق — املأ الليالي الهادئة" } },
      { href: "/product/botflow-studio", label: { en: "Visual Botflow Studio — build the order flow", ar: "استوديو مسارات البوت — ابنِ مسار الطلب" } },
      { href: "/solutions/cafes-coffee", label: { en: "Cafes & specialty coffee", ar: "المقاهي والقهوة المختصة" } },
    ],
    schemaType: "Service",
  },

  /* ===================================================================== */
  /* 2. Cafes & Specialty Coffee                                            */
  /*    Primary:    WhatsApp ordering for cafes                             */
  /*    Secondary:  coffee shop loyalty WhatsApp · takeaway pre-order       */
  /*                WhatsApp · cafe WhatsApp Oman                           */
  /* ===================================================================== */
  {
    slug: "cafes-coffee",
    primaryKeyword: "WhatsApp ordering for cafes",
    secondaryKeywords: [
      "coffee shop loyalty WhatsApp",
      "takeaway pre-order WhatsApp",
      "cafe WhatsApp Oman",
    ],
    keywords: [
      "WhatsApp ordering for cafes", "coffee shop loyalty WhatsApp", "takeaway pre-order WhatsApp",
      "cafe WhatsApp Oman", "coffee shop WhatsApp bot", "digital loyalty card WhatsApp",
      "scheduled pickup coffee WhatsApp", "cafe WhatsApp marketing", "specialty coffee Oman ordering",
      "WhatsApp reorder usual", "cafe WhatsApp GCC",
    ],
    metaTitle: {
      en: "WhatsApp Pre-Order & Loyalty for Cafes & Coffee Shops | Fizmoh",
      ar: "طلب مسبق وولاء عبر واتساب للمقاهي ومحلات القهوة | Fizmoh",
    },
    metaDescription: {
      en: "Pre-paid takeaway on WhatsApp, a loyalty stamp that lives in the chat, and same-day offers your regulars actually read. Built for the speed of a coffee bar.",
      ar: "طلب سفري مدفوع مسبقاً عبر واتساب، وختم ولاء داخل المحادثة، وعرض في اليوم نفسه يُقرأ فعلاً — مصمّم لسرعة عمل بار القهوة.",
    },
    eyebrow: { en: "Cafes & Specialty Coffee", ar: "المقاهي والقهوة المختصة" },
    h1: {
      en: "Let regulars order their usual before they reach the counter",
      ar: "دع الزبائن الدائمين يطلبون \"المعتاد\" قبل وصولهم إلى الطاولة",
    },
    subheadline: {
      en: "Pre-paid takeaway orders on WhatsApp, a loyalty stamp that lives in the chat, and a morning offer that gets read — built for the speed a coffee bar runs at.",
      ar: "طلبات سفري مدفوعة مسبقاً على واتساب، وختم ولاء يعيش في المحادثة، وعرض صباحي يُقرأ — مصمّم لسرعة عمل بار القهوة.",
    },
    hero: {
      src: "/marketing/industries/cafes-coffee.jpg",
      alt: {
        en: "A barista pouring latte art into a takeaway cup at a warm-wood specialty coffee bar in soft morning light",
        ar: "باريستا يسكب فن اللاتيه في كوب سفري عند بار قهوة مختصة بخشب دافئ وإضاءة صباحية ناعمة",
      },
      width: 1280,
      height: 714,
      placeholder: true,
    },
    heroNote: {
      en: "One-tap reorder · digital loyalty · same-day offers your regulars actually see",
      ar: "إعادة طلب بنقرة · ولاء رقمي · عروض في اليوم نفسه يراها زبائنك فعلاً",
    },
    problems: [
      {
        title: { en: "The 8am queue costs you sales", ar: "طابور الثامنة صباحاً يكلّفك مبيعات" },
        body: {
          en: "People on a commute see the line, do the maths on being late, and keep walking.",
          ar: "الناس في طريقهم للعمل يرون الطابور، يحسبون احتمال التأخّر، ويواصلون المشي.",
        },
      },
      {
        title: { en: "Loyalty cards are left at home", ar: "بطاقات الولاء تُنسى في المنزل" },
        body: {
          en: "The paper card only works if the customer is carrying it, and the reward is only claimed if they remember they earned it.",
          ar: "البطاقة الورقية تعمل فقط إذا كان العميل يحملها، والمكافأة تُطلب فقط إذا تذكّر أنه استحقها.",
        },
      },
      {
        title: { en: "A slow afternoon needs a nudge you can't send fast", ar: "فترة بعد الظهر الهادئة تحتاج تنبيهاً لا يمكنك إرساله سريعاً" },
        body: {
          en: "By the time a newsletter goes out, the quiet hour is over. Email is the wrong speed for this problem.",
          ar: "بحلول وقت إرسال النشرة، تكون الساعة الهادئة قد انتهت. البريد بسرعة خاطئة لهذه المشكلة.",
        },
      },
    ],
    useCases: [
      {
        icon: "Coffee",
        title: { en: "\"The usual\" in one tap", ar: "\"المعتاد\" بنقرة واحدة" },
        body: {
          en: "The bot recognises a returning customer and offers their last order as a one-tap reorder, paid on the spot.",
          ar: "يتعرّف البوت على العميل العائد ويعرض طلبه الأخير كإعادة طلب بنقرة، مدفوعاً فوراً.",
        },
      },
      {
        icon: "Clock",
        title: { en: "Scheduled pickup", ar: "استلام مجدوَل" },
        body: {
          en: "\"Ready at 8:15\" — the order is made to a time, so the coffee is waiting and the customer never joins the queue.",
          ar: "\"جاهز الساعة 8:15\" — يُحضَّر الطلب لوقت محدد، فتكون القهوة بانتظاره ولا يقف في الطابور أبداً.",
        },
      },
      {
        icon: "Stamp",
        title: { en: "Loyalty that can't be forgotten", ar: "ولاء لا يُنسى" },
        body: {
          en: "A stamp is added per order automatically and the free drink is applied the moment it's earned — nothing to carry, nothing to lose.",
          ar: "يُضاف ختم لكل طلب تلقائياً وتُطبَّق القهوة المجانية لحظة استحقاقها — لا شيء لحمله، لا شيء لفقده.",
        },
      },
      {
        icon: "Zap",
        title: { en: "A same-hour flash offer", ar: "عرض خاطف في الساعة نفسها" },
        body: {
          en: "Send \"buy-one-get-one until 4pm\" to opted-in regulars and watch a dead afternoon pick up within minutes.",
          ar: "أرسل \"اشترِ واحداً واحصل على آخر حتى الرابعة\" للزبائن الموافقين وشاهد فترة ميتة تنتعش خلال دقائق.",
        },
      },
      {
        icon: "Package",
        title: { en: "Catering and bulk orders", ar: "طلبات الضيافة والكميات" },
        body: {
          en: "An office coffee run or an event order is a single guided conversation, quoted and paid without a phone call.",
          ar: "طلب قهوة لمكتب أو طلب فعالية هو محادثة موجَّهة واحدة، تُسعَّر وتُدفع دون مكالمة هاتفية.",
        },
      },
    ],
    how: [
      {
        title: { en: "A regular messages your number", ar: "يراسل زبون دائم رقمك" },
        body: {
          en: "From a sticker on the cup, a QR by the till, or a saved contact — the chat opens with their history known.",
          ar: "من ملصق على الكوب، أو باركود قرب الصندوق، أو جهة اتصال محفوظة — تفتح المحادثة وسجلّه معروف.",
        },
      },
      {
        title: { en: "They confirm the usual and pay", ar: "يؤكّدون المعتاد ويدفعون" },
        body: {
          en: "One tap to reorder, or a quick change, then a card payment in OMR — done before they've parked.",
          ar: "نقرة لإعادة الطلب، أو تعديل سريع، ثم دفع بالبطاقة بالريال العماني — يُنجَز قبل أن يركنوا السيارة.",
        },
      },
      {
        title: { en: "The barista sees it with a pickup time", ar: "يرى الباريستا الطلب مع وقت استلام" },
        body: {
          en: "Orders queue on one screen in time order, so the bar works ahead instead of reacting to a counter line.",
          ar: "تصطف الطلبات على شاشة واحدة بترتيب الوقت، فيعمل البار مسبقاً بدل التفاعل مع طابور الطاولة.",
        },
      },
      {
        title: { en: "Loyalty updates itself", ar: "يتحدّث الولاء تلقائياً" },
        body: {
          en: "The stamp count goes up, the reward triggers automatically, and the customer gets a message when the next drink is free.",
          ar: "يرتفع عدّ الأختام، وتُفعَّل المكافأة تلقائياً، ويصل العميل رسالة عندما تصبح القهوة التالية مجانية.",
        },
      },
    ],
    features: [
      {
        feature: { en: "Saved \"usual\" order", ar: "طلب \"معتاد\" محفوظ" },
        benefit: { en: "A five-second reorder keeps your busiest customers your easiest ones.", ar: "إعادة طلب في خمس ثوانٍ تُبقي أكثر عملائك انشغالاً هم الأسهل." },
      },
      {
        feature: { en: "Timed pickup", ar: "استلام مُوقَّت" },
        benefit: { en: "The coffee is ready when they arrive, so the queue is never the reason they skipped you.", ar: "القهوة جاهزة عند وصولهم، فلا يكون الطابور سبب تجاوزهم لك." },
      },
      {
        feature: { en: "Loyalty in the chat", ar: "ولاء في المحادثة" },
        benefit: { en: "Nothing to print, carry or lose — and the reward is claimed every time because it applies itself.", ar: "لا شيء يُطبع أو يُحمل أو يُفقد — وتُطلب المكافأة في كل مرة لأنها تُطبَّق نفسها." },
      },
      {
        feature: { en: "Same-day broadcast", ar: "بث في اليوم نفسه" },
        benefit: { en: "Fill a quiet 3pm today, not in the next newsletter cycle.", ar: "املأ الثالثة عصراً الهادئة اليوم، لا في دورة النشرة القادمة." },
      },
      {
        feature: { en: "Prepaid orders", ar: "طلبات مدفوعة مسبقاً" },
        benefit: { en: "The morning rush moves because money and choice are already settled.", ar: "تتحرّك ذروة الصباح لأن المال والاختيار محسومان مسبقاً." },
      },
      {
        feature: { en: "Guided catering quotes", ar: "عروض ضيافة موجَّهة" },
        benefit: { en: "Bigger orders are captured and priced without pulling a barista to the phone.", ar: "تُلتقط الطلبات الأكبر وتُسعَّر دون سحب باريستا إلى الهاتف." },
      },
    ],
    stats: [
      { value: { en: "1 tap", ar: "نقرة واحدة" }, label: { en: "to reorder the usual", ar: "لإعادة طلب المعتاد" } },
      { value: { en: "~90%+", ar: "~90%+" }, label: { en: "WhatsApp open rate vs email, for a same-day offer", ar: "معدل فتح واتساب مقابل البريد، لعرض في اليوم نفسه" }, estimate: true },
      { value: { en: "OMR", ar: "ر.ع" }, label: { en: "prepaid in the chat", ar: "مدفوع مسبقاً في المحادثة" } },
      { value: { en: "0", ar: "0" }, label: { en: "plastic loyalty cards to print", ar: "بطاقات ولاء بلاستيكية للطباعة" } },
    ],
    testimonials: [
      {
        quote: {
          en: "TODO: replace with real client quote — a cafe owner describing the morning rush after regulars started pre-ordering the usual.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — صاحب مقهى يصف ذروة الصباح بعد أن بدأ الزبائن الدائمون بطلب المعتاد مسبقاً.",
        },
        name: "",
        role: { en: "Cafe Owner", ar: "صاحب مقهى" },
        company: "TODO",
        todo: true,
      },
      {
        quote: {
          en: "TODO: replace with real client quote — a manager describing what a same-hour WhatsApp offer did to a slow weekday afternoon.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — مدير يصف ما فعله عرض واتساب في الساعة نفسها بفترة بعد ظهر هادئة في يوم عمل.",
        },
        name: "",
        role: { en: "Cafe Manager", ar: "مدير مقهى" },
        company: "TODO",
        todo: true,
      },
    ],
    faqs: [
      {
        q: { en: "How does digital loyalty work on WhatsApp?", ar: "كيف يعمل الولاء الرقمي على واتساب؟" },
        a: {
          en: "Each paid order adds a stamp to the customer's record automatically. When they reach the threshold, the free item is applied to their next order and they get a message telling them.",
          ar: "كل طلب مدفوع يضيف ختماً إلى سجل العميل تلقائياً. عند بلوغهم الحدّ، يُطبَّق الصنف المجاني على طلبهم التالي وتصلهم رسالة بذلك.",
        },
      },
      {
        q: { en: "Can customers choose a pickup time?", ar: "هل يستطيع العملاء اختيار وقت الاستلام؟" },
        a: {
          en: "Yes. The order flow offers the next available slots, and the barista sees each order in time order so it is made to be ready then.",
          ar: "نعم. تعرض خطوة الطلب الفترات المتاحة التالية، ويرى الباريستا كل طلب بترتيب الوقت فيُحضَّر ليكون جاهزاً حينها.",
        },
      },
      {
        q: { en: "Does taking orders on WhatsApp slow the barista down?", ar: "هل يبطئ استقبال الطلبات على واتساب الباريستا؟" },
        a: {
          en: "No. Orders queue on a single screen rather than interrupting like a phone call, and prepaid orders remove the payment step at the bar.",
          ar: "لا. تصطف الطلبات على شاشة واحدة بدل أن تقاطع كمكالمة هاتفية، وتلغي الطلبات المدفوعة مسبقاً خطوة الدفع عند البار.",
        },
      },
      {
        q: { en: "Can I send a same-day offer to regulars?", ar: "هل أستطيع إرسال عرض في اليوم نفسه للزبائن الدائمين؟" },
        a: {
          en: "Yes, to anyone who opted in. A short broadcast reaches phones within minutes, which is why it works for a quiet hour when email would arrive too late.",
          ar: "نعم، لكل من وافق. بث قصير يصل إلى الهواتف خلال دقائق، ولهذا ينجح لساعة هادئة يصل فيها البريد متأخراً.",
        },
      },
      {
        q: { en: "Does it work for catering orders?", ar: "هل يعمل لطلبات الضيافة؟" },
        a: {
          en: "Yes. A guided flow collects the quantity, date and location, gives a quote, and takes payment or a deposit — all in one conversation.",
          ar: "نعم. خطوة موجَّهة تجمع الكمية والتاريخ والموقع، تعطي عرض سعر، وتأخذ الدفع أو عربوناً — كلها في محادثة واحدة.",
        },
      },
      {
        q: { en: "Is it available in Arabic?", ar: "هل هو متاح بالعربية؟" },
        a: {
          en: "Yes. The ordering flow and the bot work in Arabic and English and reply in the language the customer uses.",
          ar: "نعم. تعمل خطوة الطلب والبوت بالعربية والإنجليزية ويردّان باللغة التي يستخدمها العميل.",
        },
      },
    ],
    related: [
      { href: "/product/broadcast-campaigns", label: { en: "Broadcast & Marketing Campaigns — fill the quiet hour", ar: "حملات البث والتسويق — املأ الساعة الهادئة" } },
      { href: "/product/payments", label: { en: "AmwalPay Online Payments — prepaid in the chat", ar: "مدفوعات أموال باي — مدفوع مسبقاً في المحادثة" } },
      { href: "/solutions/restaurants-dining", label: { en: "Restaurants & dining", ar: "المطاعم والوجبات" } },
      { href: "/product/botflow-studio", label: { en: "Visual Botflow Studio", ar: "استوديو مسارات البوت" } },
    ],
    schemaType: "Service",
  },

  /* ===================================================================== */
  /* 3. Ecommerce & Online Stores                                           */
  /*    Primary:    WhatsApp for online stores                              */
  /*    Secondary:  WhatsApp abandoned cart recovery · WooCommerce          */
  /*                WhatsApp integration · WhatsApp order tracking          */
  /* ===================================================================== */
  {
    slug: "ecommerce-online-stores",
    primaryKeyword: "WhatsApp for online stores",
    secondaryKeywords: [
      "WhatsApp abandoned cart recovery",
      "WooCommerce WhatsApp integration",
      "WhatsApp order tracking",
    ],
    keywords: [
      "WhatsApp for online stores", "WhatsApp abandoned cart recovery", "WooCommerce WhatsApp integration",
      "WhatsApp order tracking", "WhatsApp catalog sync", "conversational commerce WhatsApp",
      "WhatsApp store Oman", "sell on WhatsApp GCC", "WhatsApp checkout online store",
      "back in stock alert WhatsApp", "WhatsApp ecommerce automation", "two-way WooCommerce sync",
    ],
    metaTitle: {
      en: "WhatsApp for Online Stores — Cart Recovery & Tracking | Fizmoh",
      ar: "واتساب للمتاجر الإلكترونية — استرجاع السلات والتتبع | Fizmoh",
    },
    metaDescription: {
      en: "Recover abandoned checkouts in the chat, push shipping updates automatically, and keep an in-chat catalogue in two-way sync with WooCommerce.",
      ar: "استرجع السلات المتروكة في المحادثة، وأرسل تحديثات الشحن تلقائياً، وحافظ على كتالوج داخل المحادثة متزامن باتجاهين مع WooCommerce — على القناة التي يفتحها العملاء فعلاً.",
    },
    eyebrow: { en: "Ecommerce & Online Stores", ar: "التجارة الإلكترونية والمتاجر" },
    h1: {
      en: "Recover the carts your email never reaches",
      ar: "استرجع السلات التي لا يصل إليها بريدك",
    },
    subheadline: {
      en: "Abandoned-checkout recovery, automated shipping updates and an in-chat catalogue that stays in sync with WooCommerce — on the channel your customers actually open.",
      ar: "استرجاع السلات المتروكة، وتحديثات شحن تلقائية، وكتالوج داخل المحادثة يبقى متزامناً مع WooCommerce — على القناة التي يفتحها عملاؤك فعلاً.",
    },
    hero: {
      src: "/marketing/industries/ecommerce-online-stores.jpg",
      alt: {
        en: "An online-store owner packing cardboard parcels at a bright home studio with shelves of stacked boxes and a laptop open",
        ar: "صاحب متجر إلكتروني يغلّف طرود كرتون في استوديو منزلي مضيء مع رفوف صناديق مرتّبة وحاسوب محمول مفتوح",
      },
      width: 1280,
      height: 714,
      placeholder: true,
    },
    heroNote: {
      en: "Two-way WooCommerce sync · automatic tracking updates · OMR card checkout",
      ar: "مزامنة WooCommerce باتجاهين · تحديثات تتبع تلقائية · دفع بالبطاقة بالريال العماني",
    },
    problems: [
      {
        title: { en: "Cart-recovery emails go unopened", ar: "رسائل استرجاع السلة لا تُفتح" },
        body: {
          en: "The customer was distracted at checkout, and an email an hour later competes with fifty others they will never read.",
          ar: "تشتّت انتباه العميل عند الدفع، ورسالة بريد بعد ساعة تنافس خمسين أخرى لن يقرأها أبداً.",
        },
      },
      {
        title: { en: "\"Where is my order?\" tickets pile up", ar: "تذاكر \"أين طلبي؟\" تتراكم" },
        body: {
          en: "Every order with no proactive update becomes a support conversation you could have avoided.",
          ar: "كل طلب بلا تحديث استباقي يتحوّل إلى محادثة دعم كان يمكن تفاديها.",
        },
      },
      {
        title: { en: "Staff retype WhatsApp orders into the store", ar: "الموظفون يعيدون إدخال طلبات واتساب في المتجر" },
        body: {
          en: "An order taken in chat is keyed into the store by hand, and a typo there is a wrong shipment and a refund.",
          ar: "طلب يُؤخَذ في المحادثة يُدخَل في المتجر يدوياً، وخطأ مطبعي هناك يعني شحنة خاطئة واسترداداً.",
        },
      },
    ],
    useCases: [
      {
        icon: "ShoppingCart",
        title: { en: "Abandoned checkout → a nudge in the chat", ar: "سلة متروكة ← تنبيه في المحادثة" },
        body: {
          en: "An unfinished checkout triggers a WhatsApp message with a link straight back to the exact cart, and it stops once the order is paid.",
          ar: "سلة غير مكتملة تُطلق رسالة واتساب برابط يعود مباشرة إلى السلة نفسها، وتتوقف عند دفع الطلب.",
        },
      },
      {
        icon: "Truck",
        title: { en: "Shipping status, pushed automatically", ar: "حالة الشحن، تُرسل تلقائياً" },
        body: {
          en: "Confirmed, dispatched, out for delivery, delivered — each update goes out on its own, so the ticket never opens.",
          ar: "مؤكَّد، تم الشحن، خارج للتوصيل، تم التسليم — يُرسل كل تحديث تلقائياً، فلا تُفتح التذكرة أبداً.",
        },
      },
      {
        icon: "BookOpen",
        title: { en: "Browse the catalogue and buy in the chat", ar: "تصفّح الكتالوج واشترِ في المحادثة" },
        body: {
          en: "Products, prices and stock from your store, presented as a catalogue the customer can add to a cart and check out without a browser tab.",
          ar: "منتجات وأسعار ومخزون من متجرك، معروضة ككتالوج يضيفه العميل إلى سلة ويُتمّ الشراء دون تبويب متصفح.",
        },
      },
      {
        icon: "RefreshCw",
        title: { en: "Two-way WooCommerce sync", ar: "مزامنة WooCommerce باتجاهين" },
        body: {
          en: "Products and stock flow in; orders and status flow back. The store stays the single source of truth, with no retyping.",
          ar: "المنتجات والمخزون يدخلان؛ الطلبات والحالة تعودان. يبقى المتجر المصدر الوحيد للحقيقة، دون إعادة إدخال.",
        },
      },
      {
        icon: "BellRing",
        title: { en: "Back-in-stock to the people who asked", ar: "\"عاد للتوفر\" لمن سأل" },
        body: {
          en: "A one-tap \"tell me when it's back\" becomes a targeted message the day it returns — a campaign with a waiting audience.",
          ar: "\"أخبرني عند عودته\" بنقرة تتحوّل إلى رسالة مستهدفة يوم عودته — حملة بجمهور ينتظر.",
        },
      },
    ],
    how: [
      {
        title: { en: "Connect WooCommerce", ar: "اربط WooCommerce" },
        body: {
          en: "Link your store once. Products, variations, prices and stock sync into the in-chat catalogue.",
          ar: "اربط متجرك مرة واحدة. تتزامن المنتجات والخيارات والأسعار والمخزون إلى الكتالوج داخل المحادثة.",
        },
      },
      {
        title: { en: "Customers browse, buy and ask in the chat", ar: "يتصفّح العملاء ويشترون ويسألون في المحادثة" },
        body: {
          en: "The whole path — question, catalogue, cart, payment — happens in one WhatsApp conversation.",
          ar: "المسار كله — سؤال، كتالوج، سلة، دفع — يحدث في محادثة واتساب واحدة.",
        },
      },
      {
        title: { en: "Orders and status sync back", ar: "تعود الطلبات والحالة" },
        body: {
          en: "An order placed in chat appears in WooCommerce like any other, and a status change there sends the customer an update.",
          ar: "طلب يُنشأ في المحادثة يظهر في WooCommerce كأي طلب آخر، وتغيير الحالة هناك يرسل للعميل تحديثاً.",
        },
      },
      {
        title: { en: "Recovery and tracking fire on their own", ar: "الاسترجاع والتتبع يعملان تلقائياً" },
        body: {
          en: "Abandoned-cart nudges and shipping updates are automated, so the work is set up once and then runs.",
          ar: "تنبيهات السلة المتروكة وتحديثات الشحن مؤتمتة، فيُعدّ العمل مرة واحدة ثم يعمل.",
        },
      },
    ],
    features: [
      {
        feature: { en: "In-chat cart recovery", ar: "استرجاع السلة داخل المحادثة" },
        benefit: { en: "The reminder is opened where an email is not, so more unfinished carts turn into orders.", ar: "يُفتح التذكير حيث لا يُفتح البريد، فتتحوّل سلال غير مكتملة أكثر إلى طلبات." },
      },
      {
        feature: { en: "Automatic tracking updates", ar: "تحديثات تتبع تلقائية" },
        benefit: { en: "The \"where is it\" ticket never opens because the answer arrived first.", ar: "لا تُفتح تذكرة \"أين هو\" لأن الجواب وصل أولاً." },
      },
      {
        feature: { en: "Two-way WooCommerce sync", ar: "مزامنة WooCommerce باتجاهين" },
        benefit: { en: "No retyping and no overselling — the store and the chat always agree.", ar: "لا إعادة إدخال ولا بيع زائد — المتجر والمحادثة متفقان دائماً." },
      },
      {
        feature: { en: "Purchase history on the contact", ar: "سجل الشراء على جهة الاتصال" },
        benefit: { en: "Restock alerts and offers go to people who actually bought the thing, not the whole list.", ar: "تنبيهات إعادة التوفر والعروض تذهب لمن اشترى الصنف فعلاً، لا للقائمة كاملة." },
      },
      {
        feature: { en: "Catalogue inside WhatsApp", ar: "كتالوج داخل واتساب" },
        benefit: { en: "The path to buy is one conversation, not a redirect the customer might not follow.", ar: "مسار الشراء محادثة واحدة، لا إعادة توجيه قد لا يتبعها العميل." },
      },
      {
        feature: { en: "OMR card checkout and bank transfer", ar: "دفع بالبطاقة بالريال العماني وتحويل بنكي" },
        benefit: { en: "Local customers pay the way they expect, and card payments reconcile themselves.", ar: "يدفع العملاء المحليون بالطريقة التي يتوقعونها، وتُسوّى مدفوعات البطاقة نفسها." },
      },
    ],
    stats: [
      { value: { en: "~45–60%", ar: "~45–60%" }, label: { en: "of abandoned carts recoverable via chat vs single-digit for email", ar: "من السلات المتروكة قابلة للاسترجاع عبر المحادثة مقابل نسبة أحادية للبريد" }, estimate: true },
      { value: { en: "2-way", ar: "باتجاهين" }, label: { en: "WooCommerce product and order sync", ar: "مزامنة منتجات وطلبات WooCommerce" } },
      { value: { en: "Auto", ar: "تلقائي" }, label: { en: "shipping status updates", ar: "تحديثات حالة الشحن" } },
      { value: { en: "OMR", ar: "ر.ع" }, label: { en: "card checkout in the chat", ar: "دفع بالبطاقة في المحادثة" } },
    ],
    testimonials: [
      {
        quote: {
          en: "TODO: replace with real client quote — a store owner comparing WhatsApp cart recovery conversion against their previous email flow.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — صاحب متجر يقارن تحويل استرجاع السلة عبر واتساب بتدفق البريد السابق لديه.",
        },
        name: "",
        role: { en: "Ecommerce Owner", ar: "صاحب متجر إلكتروني" },
        company: "TODO",
        todo: true,
      },
      {
        quote: {
          en: "TODO: replace with real client quote — a support lead describing the drop in 'where is my order' messages after automatic tracking was switched on.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — مسؤول دعم يصف انخفاض رسائل \"أين طلبي\" بعد تفعيل التتبع التلقائي.",
        },
        name: "",
        role: { en: "Support Lead", ar: "مسؤول الدعم" },
        company: "TODO",
        todo: true,
      },
    ],
    faqs: [
      {
        q: { en: "Does it work with WooCommerce?", ar: "هل يعمل مع WooCommerce؟" },
        a: {
          en: "Yes, with two-way sync. Products and stock flow into the in-chat catalogue, and orders placed in the chat plus status changes flow back to the store.",
          ar: "نعم، بمزامنة باتجاهين. المنتجات والمخزون يدخلان إلى الكتالوج داخل المحادثة، والطلبات المُنشأة في المحادثة وتغييرات الحالة تعود إلى المتجر.",
        },
      },
      {
        q: { en: "Which platforms other than WooCommerce are supported?", ar: "ما المنصات الأخرى المدعومة غير WooCommerce؟" },
        a: {
          en: "WooCommerce has native two-way sync today. For other platforms, ask us — a catalogue can be maintained directly in the workspace, and custom integrations are possible through the API.",
          ar: "لدى WooCommerce مزامنة أصلية باتجاهين اليوم. للمنصات الأخرى، اسألنا — يمكن الاحتفاظ بكتالوج مباشرة في مساحة العمل، والتكاملات المخصصة ممكنة عبر الـ API.",
        },
      },
      {
        q: { en: "How does WhatsApp cart recovery work?", ar: "كيف يعمل استرجاع السلة عبر واتساب؟" },
        a: {
          en: "When a checkout is started and not completed, a message is sent to the customer with a link back to that exact cart. It stops automatically once the order is paid.",
          ar: "عند بدء عملية دفع دون إكمالها، تُرسل رسالة إلى العميل برابط يعود إلى تلك السلة بالضبط. تتوقف تلقائياً عند دفع الطلب.",
        },
      },
      {
        q: { en: "Will my stock stay accurate?", ar: "هل يبقى مخزوني دقيقاً؟" },
        a: {
          en: "Yes. Stock syncs from WooCommerce, and an order placed through WhatsApp decrements it in the store like any other sale, so the two never drift.",
          ar: "نعم. يتزامن المخزون من WooCommerce، وطلب يُنشأ عبر واتساب يخصمه في المتجر كأي بيع آخر، فلا يتباعد الاثنان.",
        },
      },
      {
        q: { en: "Can customers pay inside the chat?", ar: "هل يستطيع العملاء الدفع داخل المحادثة؟" },
        a: {
          en: "Yes — an AmwalPay card checkout in OMR, or bank transfer with a receipt uploaded in the conversation for your staff to verify.",
          ar: "نعم — دفع بالبطاقة من أموال باي بالريال العماني، أو تحويل بنكي مع رفع إيصال في المحادثة ليتحقق منه موظفوك.",
        },
      },
      {
        q: { en: "Does it send tracking updates automatically?", ar: "هل يرسل تحديثات التتبع تلقائياً؟" },
        a: {
          en: "Yes. Each status change on the order — dispatched, out for delivery, delivered — sends the customer a message without anyone doing it by hand.",
          ar: "نعم. كل تغيير حالة على الطلب — تم الشحن، خارج للتوصيل، تم التسليم — يرسل للعميل رسالة دون أن يفعلها أحد يدوياً.",
        },
      },
    ],
    related: [
      { href: "/product/payments", label: { en: "AmwalPay Online Payments — checkout in the chat", ar: "مدفوعات أموال باي — الدفع في المحادثة" } },
      { href: "/product/broadcast-campaigns", label: { en: "Broadcast & Marketing Campaigns — back-in-stock", ar: "حملات البث والتسويق — عاد للتوفر" } },
      { href: "/solutions/fashion-perfumes-retail", label: { en: "Fashion, perfumes & retail", ar: "الأزياء والعطور والتجزئة" } },
      { href: "/solutions/supermarkets-marts", label: { en: "Supermarkets & marts", ar: "الأسواق والتموينات" } },
    ],
    schemaType: "Service",
  },

  /* ===================================================================== */
  /* 4. Fashion, Perfumes & Retail                                          */
  /*    Primary:    WhatsApp for fashion and retail                         */
  /*    Secondary:  product drop WhatsApp broadcast · size guide WhatsApp · */
  /*                boutique WhatsApp checkout                              */
  /* ===================================================================== */
  {
    slug: "fashion-perfumes-retail",
    primaryKeyword: "WhatsApp for fashion and retail",
    secondaryKeywords: [
      "product drop WhatsApp broadcast",
      "size guide WhatsApp",
      "boutique WhatsApp checkout",
    ],
    keywords: [
      "WhatsApp for fashion and retail", "product drop WhatsApp broadcast", "size guide WhatsApp",
      "boutique WhatsApp checkout", "perfume shop WhatsApp Oman", "WhatsApp personal shopper",
      "fashion brand WhatsApp marketing", "reserve item WhatsApp", "VIP early access WhatsApp",
      "retail WhatsApp GCC", "oud perfume WhatsApp ordering",
    ],
    metaTitle: {
      en: "WhatsApp for Fashion, Perfume & Retail Brands | Fizmoh",
      ar: "واتساب لعلامات الأزياء والعطور والتجزئة | Fizmoh",
    },
    metaDescription: {
      en: "Product-drop broadcasts to your opted-in list, size and fit answered instantly, and a card checkout in the chat, for boutiques and perfume houses in the GCC.",
      ar: "أعلن الإطلاق لقائمتك الموافِقة، أجب عن المقاس والملاءمة فوراً، وخذ الدفع بالبطاقة في المحادثة — للبوتيكات ودور العطور وعلامات التجزئة في عمان والخليج.",
    },
    eyebrow: { en: "Fashion, Perfumes & Retail", ar: "الأزياء والعطور والتجزئة" },
    h1: {
      en: "Announce the drop, answer the size question, close the sale — in one chat",
      ar: "أعلن الإطلاق، أجب عن سؤال المقاس، أتمم البيع — في محادثة واحدة",
    },
    subheadline: {
      en: "Product-drop broadcasts to your list, size and fit questions handled instantly, and a card checkout in the conversation — for boutiques, perfume houses and retail brands across Oman and the GCC.",
      ar: "حملات إطلاق منتجات إلى قائمتك، وأسئلة المقاس والملاءمة تُعالَج فوراً، ودفع بالبطاقة في المحادثة — للبوتيكات ودور العطور وعلامات التجزئة في عمان والخليج.",
    },
    hero: {
      src: "/marketing/industries/fashion-perfumes-retail.jpg",
      alt: {
        en: "A warm-lit luxury boutique display of faceted oud perfume bottles and neatly folded garments on shelves",
        ar: "عرض بوتيك فاخر بإضاءة دافئة لزجاجات عطر عود مُصقّلة وملابس مطويّة بعناية على الرفوف",
      },
      width: 1280,
      height: 714,
      placeholder: true,
    },
    heroNote: {
      en: "Broadcasts with photos and video · reserve-with-deposit · named personal-shopper threads",
      ar: "بث بالصور والفيديو · حجز بعربون · محادثات مساعد تسوّق شخصي باسم",
    },
    problems: [
      {
        title: { en: "A drop announced by Story that most people miss", ar: "إطلاق يُعلَن عبر ستوري ويفوته معظم الناس" },
        body: {
          en: "The people most likely to buy follow you — and see a fraction of what you post. The channel is working against you.",
          ar: "من يرجّح أن يشتروا يتابعونك — ويرون جزءاً بسيطاً مما تنشره. القناة تعمل ضدّك.",
        },
      },
      {
        title: { en: "\"Is this true to size?\" forty times a day", ar: "\"هل هذا مطابق للمقاس؟\" أربعين مرة يومياً" },
        body: {
          en: "The same fit questions arrive on every product, and answering them by hand is most of a salesperson's day.",
          ar: "تصل أسئلة الملاءمة نفسها على كل منتج، والرد عليها يدوياً هو معظم يوم البائع.",
        },
      },
      {
        title: { en: "The customer is sent to a website and lost", ar: "يُرسَل العميل إلى موقع ويُفقد" },
        body: {
          en: "A warm conversation ends at \"here's the link\", and the sale depends on them finding their way through a checkout alone.",
          ar: "تنتهي محادثة دافئة عند \"هذا الرابط\"، ويعتمد البيع على إيجادهم طريقهم عبر صفحة دفع بمفردهم.",
        },
      },
    ],
    useCases: [
      {
        icon: "Sparkles",
        title: { en: "Drop and restock broadcasts with photos", ar: "بث الإطلاق وإعادة التوفر بالصور" },
        body: {
          en: "Send the new collection — images, short video, price — to an opted-in list that opens almost every message.",
          ar: "أرسل المجموعة الجديدة — صور، فيديو قصير، سعر — إلى قائمة موافِقة تفتح كل رسالة تقريباً.",
        },
      },
      {
        icon: "Ruler",
        title: { en: "A size and fit guide as a bot flow", ar: "دليل مقاس وملاءمة كخطوة بوت" },
        body: {
          en: "The bot walks the customer through measurements or a fit comparison, answering the forty daily questions without a person.",
          ar: "يرشد البوت العميل عبر القياسات أو مقارنة ملاءمة، ويجيب عن الأسئلة الأربعين اليومية دون شخص.",
        },
      },
      {
        icon: "BookmarkCheck",
        title: { en: "\"Reserve my size\" with a deposit", ar: "\"احجز مقاسي\" بعربون" },
        body: {
          en: "A customer holds a specific size with a small payment, so the piece is kept and the sale is committed.",
          ar: "يحجز العميل مقاساً محدداً بدفعة صغيرة، فتُحفَظ القطعة ويُلتزم البيع.",
        },
      },
      {
        icon: "UserRound",
        title: { en: "A personal-shopper thread with a named agent", ar: "محادثة مساعد تسوّق مع موظف باسم" },
        body: {
          en: "A returning client keeps a private conversation with the same stylist, so the boutique relationship survives the move online.",
          ar: "يحتفظ عميل عائد بمحادثة خاصة مع المصمم نفسه، فتبقى علاقة البوتيك بعد الانتقال إلى الإنترنت.",
        },
      },
      {
        icon: "Crown",
        title: { en: "VIP early access", ar: "وصول مبكر لكبار العملاء" },
        body: {
          en: "A segment of top customers gets the drop a day early — a message, not a spreadsheet someone maintains by hand.",
          ar: "شريحة من كبار العملاء تحصل على الإطلاق قبل يوم — رسالة، لا جدول يحدّثه أحد يدوياً.",
        },
      },
    ],
    how: [
      {
        title: { en: "Build the segment", ar: "ابنِ الشريحة" },
        body: {
          en: "Group customers by what they've bought, how much they spend, or a VIP tag, so the right message reaches the right list.",
          ar: "جمّع العملاء حسب ما اشتروه، أو حجم إنفاقهم، أو وسم كبار العملاء، فتصل الرسالة الصحيحة للقائمة الصحيحة.",
        },
      },
      {
        title: { en: "Broadcast the drop", ar: "ابثّ الإطلاق" },
        body: {
          en: "Photos, a short video and the price go out individually. Replies open a conversation, and the sale starts there.",
          ar: "الصور وفيديو قصير والسعر تُرسل فردياً. تفتح الردود محادثة، ويبدأ البيع هناك.",
        },
      },
      {
        title: { en: "The bot handles sizing and availability", ar: "يتولّى البوت المقاس والتوفر" },
        body: {
          en: "Common fit and stock questions are answered instantly; anything bespoke goes to a stylist.",
          ar: "تُجاب أسئلة الملاءمة والمخزون الشائعة فوراً؛ وأي شيء مخصص يذهب إلى مصمم.",
        },
      },
      {
        title: { en: "Reserve and pay in the chat", ar: "احجز وادفع في المحادثة" },
        body: {
          en: "The customer holds a size with a deposit or pays in full by card in OMR — without ever leaving the conversation.",
          ar: "يحجز العميل مقاساً بعربون أو يدفع كامل المبلغ بالبطاقة بالريال العماني — دون مغادرة المحادثة إطلاقاً.",
        },
      },
    ],
    features: [
      {
        feature: { en: "Opted-in broadcast list", ar: "قائمة بث موافِقة" },
        benefit: { en: "The drop reaches buyers directly instead of competing with a feed algorithm.", ar: "يصل الإطلاق إلى المشترين مباشرة بدل منافسة خوارزمية موجز." },
      },
      {
        feature: { en: "Size-guide bot flow", ar: "خطوة بوت لدليل المقاسات" },
        benefit: { en: "The same forty fit questions are answered without occupying a salesperson.", ar: "تُجاب أسئلة الملاءمة الأربعون نفسها دون شغل بائع." },
      },
      {
        feature: { en: "Reserve with a deposit", ar: "حجز بعربون" },
        benefit: { en: "The piece is held and the customer is committed, which cuts held-then-abandoned items.", ar: "تُحفَظ القطعة ويُلتزم العميل، فتقلّ الأصناف المحجوزة ثم المتروكة." },
      },
      {
        feature: { en: "Named personal-shopper threads", ar: "محادثات مساعد تسوّق باسم" },
        benefit: { en: "The relationship a boutique is built on continues in a private, ongoing conversation.", ar: "العلاقة التي يُبنى عليها البوتيك تستمر في محادثة خاصة ومتواصلة." },
      },
      {
        feature: { en: "VIP segment", ar: "شريحة كبار العملاء" },
        benefit: { en: "Early access is a single message, not a manual list someone forgets to update.", ar: "الوصول المبكر رسالة واحدة، لا قائمة يدوية ينسى أحدهم تحديثها." },
      },
      {
        feature: { en: "Bilingual, image-rich messaging", ar: "رسائل ثنائية اللغة غنية بالصور" },
        benefit: { en: "Arabic and English customers both get product they can see and a bot they can talk to.", ar: "يحصل عملاء العربية والإنجليزية على منتج يرونه وبوت يحادثونه." },
      },
    ],
    stats: [
      { value: { en: "~90%+", ar: "~90%+" }, label: { en: "WhatsApp open rate for a drop vs a Story's typical reach", ar: "معدل فتح واتساب للإطلاق مقابل الوصول المعتاد للستوري" }, estimate: true },
      { value: { en: "OMR", ar: "ر.ع" }, label: { en: "in-chat card checkout", ar: "دفع بالبطاقة في المحادثة" } },
      { value: { en: "1:1", ar: "1:1" }, label: { en: "personal-shopper conversations", ar: "محادثات مساعد تسوّق فردية" } },
      { value: { en: "Deposit", ar: "عربون" }, label: { en: "holds cut held-then-abandoned pieces", ar: "الحجوزات تقلّل القطع المحجوزة ثم المتروكة" } },
    ],
    testimonials: [
      {
        quote: {
          en: "TODO: replace with real client quote — a boutique owner comparing sales from a WhatsApp drop broadcast to an Instagram launch post.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — صاحب بوتيك يقارن مبيعات بث إطلاق على واتساب بمنشور إطلاق على إنستغرام.",
        },
        name: "",
        role: { en: "Boutique Owner", ar: "صاحب بوتيك" },
        company: "TODO",
        todo: true,
      },
      {
        quote: {
          en: "TODO: replace with real client quote — a perfume retailer describing what the size/scent guide bot did to repetitive enquiry volume.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — بائع عطور يصف ما فعله بوت دليل المقاس/الرائحة بحجم الاستفسارات المتكررة.",
        },
        name: "",
        role: { en: "Retail Manager", ar: "مدير التجزئة" },
        company: "TODO",
        todo: true,
      },
    ],
    faqs: [
      {
        q: { en: "Can I send photos and videos in a WhatsApp broadcast?", ar: "هل أستطيع إرسال صور وفيديو في بث واتساب؟" },
        a: {
          en: "Yes. A drop campaign can include images and a short video alongside the price and a call to action, sent to each recipient individually.",
          ar: "نعم. يمكن أن تتضمّن حملة الإطلاق صوراً وفيديو قصيراً إلى جانب السعر ودعوة لاتخاذ إجراء، مُرسلة لكل مستلم فردياً.",
        },
      },
      {
        q: { en: "How do customers reserve an item?", ar: "كيف يحجز العملاء صنفاً؟" },
        a: {
          en: "The bot offers a \"reserve my size\" step that takes a deposit in OMR and holds that specific size for an agreed window.",
          ar: "يعرض البوت خطوة \"احجز مقاسي\" تأخذ عربوناً بالريال العماني وتحجز ذلك المقاس المحدد لمدة متفق عليها.",
        },
      },
      {
        q: { en: "Can I give VIPs early access to a drop?", ar: "هل أستطيع منح كبار العملاء وصولاً مبكراً للإطلاق؟" },
        a: {
          en: "Yes. Tag a segment of top customers and send them the drop a day before the wider list — the timing is just a scheduled send.",
          ar: "نعم. ضع وسماً على شريحة من كبار العملاء وأرسل لهم الإطلاق قبل القائمة الأوسع بيوم — التوقيت مجرد إرسال مجدوَل.",
        },
      },
      {
        q: { en: "Does it handle Arabic and English?", ar: "هل يتعامل مع العربية والإنجليزية؟" },
        a: {
          en: "Yes. Campaigns, the size-guide flow and the bot all work in both, and the bot replies in the customer's language.",
          ar: "نعم. الحملات وخطوة دليل المقاسات والبوت كلها تعمل بالاثنتين، ويرد البوت بلغة العميل.",
        },
      },
      {
        q: { en: "Can a stylist keep a private thread with a client?", ar: "هل يستطيع مصمم الاحتفاظ بمحادثة خاصة مع عميل؟" },
        a: {
          en: "Yes. A personal-shopper conversation stays assigned to one agent, with the full history and private notes, so the client always deals with the same person.",
          ar: "نعم. تبقى محادثة مساعد التسوّق مُسندة لموظف واحد، مع كامل السجل والملاحظات الخاصة، فيتعامل العميل دائماً مع الشخص نفسه.",
        },
      },
      {
        q: { en: "How are payments taken?", ar: "كيف تُستلم المدفوعات؟" },
        a: {
          en: "By AmwalPay card checkout in OMR inside the chat, or bank transfer with a receipt for staff to verify. Deposits use the same checkout.",
          ar: "بدفع بالبطاقة من أموال باي بالريال العماني داخل المحادثة، أو تحويل بنكي مع إيصال ليتحقق منه الموظفون. يستخدم العربون الدفع نفسه.",
        },
      },
    ],
    related: [
      { href: "/product/broadcast-campaigns", label: { en: "Broadcast & Marketing Campaigns — announce the drop", ar: "حملات البث والتسويق — أعلن الإطلاق" } },
      { href: "/product/payments", label: { en: "AmwalPay Online Payments — reserve and pay", ar: "مدفوعات أموال باي — احجز وادفع" } },
      { href: "/solutions/ecommerce-online-stores", label: { en: "Ecommerce & online stores", ar: "التجارة الإلكترونية والمتاجر" } },
      { href: "/product/team-inbox", label: { en: "Multi-Agent Team Inbox", ar: "صندوق الفريق متعدد الموظفين" } },
    ],
    schemaType: "Service",
  },

  /* ===================================================================== */
  /* 5. Salons, Beauty & Spas                                               */
  /*    Primary:    WhatsApp booking for salons                             */
  /*    Secondary:  salon appointment WhatsApp · spa deposit link           */
  /*                WhatsApp · beauty booking Oman                          */
  /* ===================================================================== */
  {
    slug: "salons-beauty-spas",
    primaryKeyword: "WhatsApp booking for salons",
    secondaryKeywords: [
      "salon appointment WhatsApp",
      "spa deposit link WhatsApp",
      "beauty booking Oman",
    ],
    keywords: [
      "WhatsApp booking for salons", "salon appointment WhatsApp", "spa deposit link WhatsApp",
      "beauty booking Oman", "salon no-show reduction", "stylist calendar sync WhatsApp",
      "WhatsApp appointment reminders salon", "beauty salon WhatsApp bot", "spa WhatsApp GCC",
      "rebook prompt WhatsApp", "salon waitlist WhatsApp",
    ],
    metaTitle: {
      en: "WhatsApp Booking & Deposits for Salons, Beauty & Spas | Fizmoh",
      ar: "حجز وعربون عبر واتساب للصالونات ومراكز التجميل والسبا | Fizmoh",
    },
    metaDescription: {
      en: "Booking synced to each stylist's calendar, deposit links that cut no-shows, and reminders that send themselves, so the chair stays full and the phone stays quiet.",
      ar: "حجز مواعيد متزامن مع تقويم كل مصفّف، وروابط عربون تقلّل عدم الحضور، وتذكيرات تُرسل نفسها — فيكون الكرسي ممتلئاً والاستقبال غير مشغول بالهاتف.",
    },
    eyebrow: { en: "Salons, Beauty & Spas", ar: "الصالونات والتجميل والسبا" },
    h1: {
      en: "Stop losing bookings to DMs you answer at midnight",
      ar: "توقّف عن خسارة الحجوزات في رسائل تردّ عليها منتصف الليل",
    },
    subheadline: {
      en: "Appointment booking that syncs to each stylist's calendar, deposit links that cut no-shows, and reminders that go out on their own — so the chair is full and the front desk isn't on the phone.",
      ar: "حجز مواعيد يتزامن مع تقويم كل مصفّف، وروابط عربون تقلّل عدم الحضور، وتذكيرات تُرسل من تلقاء نفسها — فيكون الكرسي ممتلئاً والاستقبال غير مشغول بالهاتف.",
    },
    hero: {
      src: "/marketing/industries/salons-beauty-spas.jpg",
      alt: {
        en: "A serene modern beauty salon interior with styling chairs facing backlit mirrors, plants and soft natural daylight",
        ar: "صالة صالون تجميل عصري هادئ بكراسي تصفيف أمام مرايا مُضاءة من الخلف، ونباتات وضوء نهار ناعم",
      },
      width: 1280,
      height: 714,
      placeholder: true,
    },
    heroNote: {
      en: "Per-stylist calendar sync · deposit to confirm · automatic 24h and 2h reminders",
      ar: "مزامنة تقويم لكل مصفّف · عربون للتأكيد · تذكيرات تلقائية قبل 24 و2 ساعة",
    },
    problems: [
      {
        title: { en: "Booking requests scattered across channels", ar: "طلبات الحجز مبعثرة بين القنوات" },
        body: {
          en: "Instagram DMs, WhatsApp, phone calls and walk-ins, none of them in one place, and the front desk is the bottleneck.",
          ar: "رسائل إنستغرام وواتساب ومكالمات هاتفية وزيارات مباشرة، لا شيء منها في مكان واحد، والاستقبال هو عنق الزجاجة.",
        },
      },
      {
        title: { en: "No-shows with nothing to lose", ar: "عدم حضور بلا شيء يُخسر" },
        body: {
          en: "A booking with no deposit costs the customer nothing to skip, and costs you an empty chair at your busiest hour.",
          ar: "حجز بلا عربون لا يكلّف العميل شيئاً لتجاوزه، ويكلّفك كرسياً فارغاً في أكثر ساعاتك انشغالاً.",
        },
      },
      {
        title: { en: "Reminders sent by hand, or not at all", ar: "تذكيرات تُرسل يدوياً، أو لا تُرسل" },
        body: {
          en: "Someone has to remember to message every client the day before — and on a busy day, that is the first thing that slips.",
          ar: "على أحدهم تذكّر مراسلة كل عميل في اليوم السابق — وفي يوم مزدحم، هذا أول ما يُنسى.",
        },
      },
    ],
    useCases: [
      {
        icon: "CalendarClock",
        title: { en: "Book by service and stylist", ar: "احجز حسب الخدمة والمصفّف" },
        body: {
          en: "The customer picks a treatment and a specific stylist, and only genuinely open slots on that stylist's calendar are offered.",
          ar: "يختار العميل خدمة ومصفّفاً محدداً، وتُعرَض فقط الفترات المفتوحة فعلاً في تقويم ذلك المصفّف.",
        },
      },
      {
        icon: "CreditCard",
        title: { en: "A deposit link to confirm the slot", ar: "رابط عربون لتأكيد الموعد" },
        body: {
          en: "The booking is only held once a deposit is paid in OMR, which turns most would-be no-shows into kept appointments.",
          ar: "لا يُحجَز الموعد إلا بعد دفع عربون بالريال العماني، ما يحوّل معظم حالات عدم الحضور المحتملة إلى مواعيد محفوظة.",
        },
      },
      {
        icon: "BellRing",
        title: { en: "Automatic reminders, 24h and 2h before", ar: "تذكيرات تلقائية، قبل 24 و2 ساعة" },
        body: {
          en: "Two reminders go out on their own, each with a one-tap option to reschedule if the client can't make it.",
          ar: "يُرسل تذكيران تلقائياً، لكل منهما خيار بنقرة واحدة لإعادة الجدولة إن تعذّر على العميل الحضور.",
        },
      },
      {
        icon: "Repeat",
        title: { en: "Rebook prompt at the right interval", ar: "تنبيه إعادة حجز في الفترة المناسبة" },
        body: {
          en: "Six weeks after a colour, a message invites the client to book the next one — so the calendar fills forward, not by luck.",
          ar: "بعد ستة أسابيع من الصبغة، رسالة تدعو العميل لحجز التالية — فيمتلئ التقويم مستقبلاً، لا بالحظ.",
        },
      },
      {
        icon: "ListPlus",
        title: { en: "A waitlist that fills cancellations", ar: "قائمة انتظار تملأ الإلغاءات" },
        body: {
          en: "When a slot opens, the next person on the waitlist is offered it automatically before it goes cold.",
          ar: "عندما يُفتح موعد، يُعرَض على التالي في قائمة الانتظار تلقائياً قبل أن يبرد.",
        },
      },
    ],
    how: [
      {
        title: { en: "Set services, staff and hours", ar: "حدّد الخدمات والموظفين والساعات" },
        body: {
          en: "Each stylist has their own services, durations and working hours, connected to their calendar.",
          ar: "لكل مصفّف خدماته ومدده وساعات عمله، مرتبطة بتقويمه.",
        },
      },
      {
        title: { en: "The client picks a slot in the chat", ar: "يختار العميل موعداً في المحادثة" },
        body: {
          en: "They choose a service, a stylist and a time from live availability — no back-and-forth to find one that works.",
          ar: "يختارون خدمة ومصفّفاً ووقتاً من التوفر المباشر — دون تبادل رسائل لإيجاد وقت مناسب.",
        },
      },
      {
        title: { en: "Deposit paid, calendar blocked", ar: "يُدفَع العربون، ويُحجَز التقويم" },
        body: {
          en: "The slot is confirmed the moment the deposit clears, and the time is blocked on the stylist's calendar so it can't be double-booked.",
          ar: "يُؤكَّد الموعد لحظة تحصيل العربون، ويُحجَز الوقت في تقويم المصفّف فلا يمكن حجزه مرتين.",
        },
      },
      {
        title: { en: "Reminders, then a rebook nudge", ar: "تذكيرات، ثم تنبيه إعادة حجز" },
        body: {
          en: "The 24h and 2h reminders send themselves, and after the visit a message invites the next booking at the right time.",
          ar: "تُرسل تذكيرات 24 و2 ساعة نفسها، وبعد الزيارة رسالة تدعو للحجز التالي في الوقت المناسب.",
        },
      },
    ],
    features: [
      {
        feature: { en: "Per-stylist calendar sync", ar: "مزامنة تقويم لكل مصفّف" },
        benefit: { en: "No double-booking, because the bot only ever offers time the calendar says is free.", ar: "لا حجز مزدوج، لأن البوت لا يعرض إلا وقتاً يقول التقويم إنه متاح." },
      },
      {
        feature: { en: "Deposit to confirm", ar: "عربون للتأكيد" },
        benefit: { en: "The no-show rate drops sharply once a booking costs something to abandon.", ar: "ينخفض معدل عدم الحضور بحدّة عندما يكلّف ترك الحجز شيئاً." },
      },
      {
        feature: { en: "Automatic reminders", ar: "تذكيرات تلقائية" },
        benefit: { en: "Fewer forgotten appointments, and no front-desk time spent making reminder calls.", ar: "مواعيد منسيّة أقل، ولا وقت استقبال يُصرَف على مكالمات تذكير." },
      },
      {
        feature: { en: "Waitlist auto-fill", ar: "ملء قائمة الانتظار تلقائياً" },
        benefit: { en: "A cancellation refills itself instead of becoming a gap in the day.", ar: "الإلغاء يملأ نفسه بدل أن يصبح فجوة في اليوم." },
      },
      {
        feature: { en: "Rebook prompts", ar: "تنبيهات إعادة الحجز" },
        benefit: { en: "The next appointment is often booked before the client has left the chair.", ar: "غالباً ما يُحجَز الموعد التالي قبل أن يغادر العميل الكرسي." },
      },
      {
        feature: { en: "Quiet-day offers", ar: "عروض الأيام الهادئة" },
        benefit: { en: "A Tuesday-afternoon promotion to opted-in clients fills time that would otherwise be lost.", ar: "عرض بعد ظهر الثلاثاء للعملاء الموافقين يملأ وقتاً كان سيضيع." },
      },
    ],
    stats: [
      { value: { en: "~20–40%", ar: "~20–40%" }, label: { en: "typical no-show reduction with required deposits", ar: "متوسط انخفاض عدم الحضور مع اشتراط العربون" }, estimate: true },
      { value: { en: "24h + 2h", ar: "24 + 2 ساعة" }, label: { en: "automatic reminder cadence", ar: "إيقاع التذكير التلقائي" } },
      { value: { en: "OMR", ar: "ر.ع" }, label: { en: "deposits taken in the chat", ar: "عربون يُؤخَذ في المحادثة" } },
      { value: { en: "0", ar: "0" }, label: { en: "double-bookings from synced calendars", ar: "حجوزات مزدوجة من التقاويم المتزامنة" } },
    ],
    testimonials: [
      {
        quote: {
          en: "TODO: replace with real client quote — a salon owner describing the change in the no-show rate after deposits became required to book.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — صاحب صالون يصف التغيّر في معدل عدم الحضور بعد اشتراط العربون للحجز.",
        },
        name: "",
        role: { en: "Salon Owner", ar: "صاحب صالون" },
        company: "TODO",
        todo: true,
      },
      {
        quote: {
          en: "TODO: replace with real client quote — a front-desk manager describing how much phone time automatic reminders and rebooking removed.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — مدير استقبال يصف كم من وقت الهاتف وفّرته التذكيرات التلقائية وإعادة الحجز.",
        },
        name: "",
        role: { en: "Front Desk Manager", ar: "مدير الاستقبال" },
        company: "TODO",
        todo: true,
      },
    ],
    faqs: [
      {
        q: { en: "Does it sync with each stylist's calendar?", ar: "هل يتزامن مع تقويم كل مصفّف؟" },
        a: {
          en: "Yes. Each staff member has their own connected calendar, and the booking bot only offers slots that calendar shows as free, so double-booking is not possible.",
          ar: "نعم. لكل موظف تقويمه المتصل، ولا يعرض بوت الحجز إلا الفترات التي يُظهرها ذلك التقويم متاحة، فالحجز المزدوج غير ممكن.",
        },
      },
      {
        q: { en: "How do deposits work?", ar: "كيف يعمل العربون؟" },
        a: {
          en: "The booking flow can require a card deposit in OMR before the slot is confirmed. It is recorded against the appointment and can be deducted from the final bill.",
          ar: "يمكن لخطوة الحجز اشتراط عربون بالبطاقة بالريال العماني قبل تأكيد الموعد. يُسجَّل مقابل الموعد ويمكن خصمه من الفاتورة النهائية.",
        },
      },
      {
        q: { en: "Can clients reschedule themselves?", ar: "هل يستطيع العملاء إعادة الجدولة بأنفسهم؟" },
        a: {
          en: "Yes. Every reminder includes a one-tap reschedule option that shows the next available slots, so a change does not need a phone call.",
          ar: "نعم. يتضمّن كل تذكير خيار إعادة جدولة بنقرة واحدة يعرض الفترات المتاحة التالية، فلا يحتاج التغيير مكالمة هاتفية.",
        },
      },
      {
        q: { en: "What calendars are supported?", ar: "ما التقاويم المدعومة؟" },
        a: {
          en: "Google Calendar today. If your team uses something else, ask us before you sign so we can confirm the fit.",
          ar: "تقويم Google اليوم. إذا كان فريقك يستخدم غير ذلك، اسألنا قبل التسجيل لنؤكّد الملاءمة.",
        },
      },
      {
        q: { en: "Does it send reminders automatically?", ar: "هل يرسل التذكيرات تلقائياً؟" },
        a: {
          en: "Yes. Two reminders — 24 hours and 2 hours before — send on their own, with no one having to remember or trigger them.",
          ar: "نعم. تذكيران — قبل 24 ساعة وقبل ساعتين — يُرسلان تلقائياً، دون أن يضطر أحد لتذكّرهما أو تشغيلهما.",
        },
      },
      {
        q: { en: "Can I fill last-minute cancellations?", ar: "هل أستطيع ملء الإلغاءات في اللحظة الأخيرة؟" },
        a: {
          en: "Yes. When a slot opens, the next client on the waitlist is offered it automatically, so a cancellation has a chance to refill before the time passes.",
          ar: "نعم. عندما يُفتح موعد، يُعرَض على العميل التالي في قائمة الانتظار تلقائياً، فتتاح للإلغاء فرصة إعادة الملء قبل فوات الوقت.",
        },
      },
    ],
    related: [
      { href: "/product/payments", label: { en: "AmwalPay Online Payments — take the deposit", ar: "مدفوعات أموال باي — خذ العربون" } },
      { href: "/product/broadcast-campaigns", label: { en: "Broadcast & Marketing Campaigns — fill quiet days", ar: "حملات البث والتسويق — املأ الأيام الهادئة" } },
      { href: "/solutions/clinics-hospitals-health", label: { en: "Clinics & healthcare", ar: "العيادات والرعاية الصحية" } },
      { href: "/product/botflow-studio", label: { en: "Visual Botflow Studio — build the booking flow", ar: "استوديو مسارات البوت — ابنِ مسار الحجز" } },
    ],
    schemaType: "Service",
  },

  /* ===================================================================== */
  /* 6. Supermarkets & Marts                                                */
  /*    Primary:    WhatsApp ordering for supermarkets                      */
  /*    Secondary:  grocery reorder WhatsApp · WhatsApp shopping list       */
  /*                order · mart delivery WhatsApp Oman                     */
  /* ===================================================================== */
  {
    slug: "supermarkets-marts",
    primaryKeyword: "WhatsApp ordering for supermarkets",
    secondaryKeywords: [
      "grocery reorder WhatsApp",
      "WhatsApp shopping list order",
      "mart delivery WhatsApp Oman",
    ],
    keywords: [
      "WhatsApp ordering for supermarkets", "grocery reorder WhatsApp", "WhatsApp shopping list order",
      "mart delivery WhatsApp Oman", "supermarket WhatsApp bot", "recurring grocery order WhatsApp",
      "saved basket WhatsApp", "voice note grocery order", "neighbourhood mart WhatsApp GCC",
      "grocery pickup WhatsApp", "supermarket WhatsApp marketing",
    ],
    metaTitle: {
      en: "WhatsApp Ordering for Supermarkets, Marts & Grocery | Fizmoh",
      ar: "طلبات عبر واتساب للأسواق والتموينات والبقالة | Fizmoh",
    },
    metaDescription: {
      en: "Quick order lists, saved baskets that reorder in one tap, and recurring weekly orders, so a neighbourhood mart runs delivery and pickup from WhatsApp.",
      ar: "قوائم طلب سريعة، وسلال محفوظة تُعاد بنقرة واحدة، وطلبات أسبوعية متكررة — فيدير السوبرماركت القريب التوصيل والاستلام من واتساب، لا من مركز اتصال.",
    },
    eyebrow: { en: "Supermarkets & Marts", ar: "الأسواق والتموينات" },
    h1: {
      en: "Let customers send a shopping list and pick up a packed order",
      ar: "دع العملاء يرسلون قائمة تسوّق ويستلمون طلباً مُجهّزاً",
    },
    subheadline: {
      en: "Quick order lists, saved baskets that reorder in one tap, and recurring weekly orders — so a neighbourhood mart runs a delivery and pickup operation from WhatsApp, not a call centre.",
      ar: "قوائم طلب سريعة، وسلال محفوظة تُعاد بنقرة واحدة، وطلبات أسبوعية متكررة — فيدير السوبرماركت القريب عملية توصيل واستلام من واتساب، لا من مركز اتصال.",
    },
    hero: {
      src: "/marketing/industries/supermarkets-marts.jpg",
      alt: {
        en: "A bright neighbourhood supermarket produce aisle with colourful fresh fruit and vegetables and a shopping basket",
        ar: "ممر خضار في سوبرماركت حيّ مضيء بفواكه وخضار طازجة ملوّنة وسلة تسوّق",
      },
      width: 1280,
      height: 714,
      placeholder: true,
    },
    heroNote: {
      en: "Text or voice-note lists · one-tap weekly reorder · card or pay-on-delivery",
      ar: "قوائم نصية أو برسائل صوتية · إعادة طلب أسبوعي بنقرة · بطاقة أو دفع عند التسليم",
    },
    problems: [
      {
        title: { en: "Phone orders taken by hand, item by item", ar: "طلبات هاتفية تُؤخَذ يدوياً، صنفاً صنفاً" },
        body: {
          en: "A staff member writes down a whole grocery list over a crackling line, then reads it back to check. It does not scale past a few orders an hour.",
          ar: "يكتب موظف قائمة بقالة كاملة عبر خط متقطّع، ثم يعيد قراءتها للتحقق. لا يتوسّع ذلك بعد بضعة طلبات في الساعة.",
        },
      },
      {
        title: { en: "Regulars re-dictate the same list weekly", ar: "الزبائن الدائمون يُملون القائمة نفسها أسبوعياً" },
        body: {
          en: "The same household orders the same forty items every week and has to say them all again every time.",
          ar: "يطلب المنزل نفسه الأصناف الأربعين نفسها كل أسبوع وعليه ذكرها كلها من جديد كل مرة.",
        },
      },
      {
        title: { en: "No record of what a household buys", ar: "لا سجل لما يشتريه المنزل" },
        body: {
          en: "Without purchase history, every order starts from zero and there is no way to prompt a reorder or suggest a staple.",
          ar: "بلا سجل شراء، يبدأ كل طلب من الصفر ولا سبيل لتنبيه إعادة طلب أو اقتراح صنف أساسي.",
        },
      },
    ],
    useCases: [
      {
        icon: "ListChecks",
        title: { en: "Send a list, get a packed order", ar: "أرسل قائمة، واحصل على طلب مُجهّز" },
        body: {
          en: "The customer types or sends a voice note; staff see it on a packing screen, pack it, and confirm a pickup or delivery time.",
          ar: "يكتب العميل أو يرسل رسالة صوتية؛ يراها الموظفون على شاشة تجهيز، يجهّزونها، ويؤكّدون وقت استلام أو توصيل.",
        },
      },
      {
        icon: "ShoppingBasket",
        title: { en: "A saved basket, reordered in one tap", ar: "سلة محفوظة، تُعاد بنقرة واحدة" },
        body: {
          en: "The weekly shop becomes a single confirmation, with room to add or drop a few items before it's sent.",
          ar: "يصبح التسوّق الأسبوعي تأكيداً واحداً، مع مجال لإضافة أو حذف بضعة أصناف قبل إرساله.",
        },
      },
      {
        icon: "CalendarSync",
        title: { en: "A standing weekly order", ar: "طلب أسبوعي دائم" },
        body: {
          en: "A recurring order is packed on a schedule, so the household's essentials arrive without anyone placing an order at all.",
          ar: "يُجهَّز طلب متكرر وفق جدول، فتصل أساسيات المنزل دون أن يقدّم أحد طلباً إطلاقاً.",
        },
      },
      {
        icon: "PackageSearch",
        title: { en: "Substitutions approved in the chat", ar: "البدائل تُعتمَد في المحادثة" },
        body: {
          en: "When something is out of stock, the packer proposes a swap and the customer approves it before the order goes out — fewer refunds, fewer complaints.",
          ar: "عند نفاد صنف، يقترح المُجهِّز بديلاً ويعتمده العميل قبل خروج الطلب — استرداد أقل وشكاوى أقل.",
        },
      },
      {
        icon: "Megaphone",
        title: { en: "An offer on a staple to opted-in customers", ar: "عرض على صنف أساسي للعملاء الموافقين" },
        body: {
          en: "Promote rice, oil or milk to households who buy them, and the basket comes back bigger.",
          ar: "روّج للأرز أو الزيت أو الحليب للمنازل التي تشتريها، فتعود السلة أكبر.",
        },
      },
    ],
    how: [
      {
        title: { en: "The customer sends a list or picks a basket", ar: "يرسل العميل قائمة أو يختار سلة" },
        body: {
          en: "Typed, or a voice note in Arabic or English, or a one-tap reorder of a saved basket.",
          ar: "مكتوبة، أو رسالة صوتية بالعربية أو الإنجليزية، أو إعادة طلب بنقرة لسلة محفوظة.",
        },
      },
      {
        title: { en: "The order lands on the packing screen", ar: "يصل الطلب إلى شاشة التجهيز" },
        body: {
          en: "Staff work through it as a checklist, marking items packed and flagging anything out of stock.",
          ar: "يعمل الموظفون عليه كقائمة تحقق، يعلّمون الأصناف المُجهَّزة ويشيرون إلى أي نفاد مخزون.",
        },
      },
      {
        title: { en: "Out-of-stock items are confirmed in the chat", ar: "تُؤكَّد أصناف نفاد المخزون في المحادثة" },
        body: {
          en: "The customer approves a substitution or removes the item, so the final order matches what they actually want.",
          ar: "يعتمد العميل بديلاً أو يزيل الصنف، فيطابق الطلب النهائي ما يريده فعلاً.",
        },
      },
      {
        title: { en: "They pay and pick a slot", ar: "يدفعون ويختارون فترة" },
        body: {
          en: "Card in OMR or cash on delivery, and a pickup or delivery time from what's available.",
          ar: "بطاقة بالريال العماني أو نقداً عند التسليم، ووقت استلام أو توصيل من المتاح.",
        },
      },
    ],
    features: [
      {
        feature: { en: "List-based ordering", ar: "طلب قائم على القوائم" },
        benefit: { en: "A whole shop is one message, not a fifteen-minute phone call read back twice.", ar: "تسوّق كامل رسالة واحدة، لا مكالمة هاتفية بخمس عشرة دقيقة تُقرأ مرتين." },
      },
      {
        feature: { en: "Saved baskets", ar: "سلال محفوظة" },
        benefit: { en: "The weekly shop is one tap, which keeps regular customers regular.", ar: "التسوّق الأسبوعي نقرة واحدة، ما يُبقي العملاء الدائمين دائمين." },
      },
      {
        feature: { en: "Recurring orders", ar: "طلبات متكررة" },
        benefit: { en: "Predictable weekly volume you can pack ahead of the rush.", ar: "حجم أسبوعي متوقَّع يمكنك تجهيزه قبل الذروة." },
      },
      {
        feature: { en: "In-chat substitutions", ar: "بدائل داخل المحادثة" },
        benefit: { en: "Fewer refunds and complaints because the customer approved every swap.", ar: "استرداد وشكاوى أقل لأن العميل اعتمد كل بديل." },
      },
      {
        feature: { en: "Slot booking", ar: "حجز الفترات" },
        benefit: { en: "The delivery run is planned against real capacity instead of improvised.", ar: "تُخطَّط جولة التوصيل مقابل سعة حقيقية بدل الارتجال." },
      },
      {
        feature: { en: "Voice-note and Arabic support", ar: "دعم الرسائل الصوتية والعربية" },
        benefit: { en: "Customers order the way they already talk, which widens who will use it.", ar: "يطلب العملاء بالطريقة التي يتحدثون بها أصلاً، ما يوسّع من سيستخدمه." },
      },
    ],
    stats: [
      { value: { en: "1 tap", ar: "نقرة واحدة" }, label: { en: "to reorder a saved weekly basket", ar: "لإعادة طلب سلة أسبوعية محفوظة" } },
      { value: { en: "Voice or text", ar: "صوت أو نص" }, label: { en: "shopping lists accepted", ar: "قوائم تسوّق مقبولة" } },
      { value: { en: "OMR", ar: "ر.ع" }, label: { en: "card or pay-on-delivery", ar: "بطاقة أو دفع عند التسليم" } },
      { value: { en: "Recurring", ar: "متكرر" }, label: { en: "standing orders on a schedule", ar: "طلبات دائمة وفق جدول" } },
    ],
    testimonials: [
      {
        quote: {
          en: "TODO: replace with real client quote — a mart owner describing how many more orders per hour staff could handle after lists replaced phone calls.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — صاحب سوبرماركت يصف كم طلباً إضافياً في الساعة استطاع الموظفون معالجته بعد أن حلّت القوائم محل المكالمات.",
        },
        name: "",
        role: { en: "Mart Owner", ar: "صاحب سوبرماركت" },
        company: "TODO",
        todo: true,
      },
      {
        quote: {
          en: "TODO: replace with real client quote — an operations lead describing what in-chat substitution approval did to refund and complaint volume.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — مسؤول عمليات يصف ما فعله اعتماد البدائل في المحادثة بحجم الاسترداد والشكاوى.",
        },
        name: "",
        role: { en: "Operations Lead", ar: "مسؤول العمليات" },
        company: "TODO",
        todo: true,
      },
    ],
    faqs: [
      {
        q: { en: "Can customers send a voice note instead of typing a list?", ar: "هل يستطيع العملاء إرسال رسالة صوتية بدل كتابة قائمة؟" },
        a: {
          en: "Yes. A voice note in Arabic or English is transcribed into an order list your staff can check and pack.",
          ar: "نعم. تُفرَّغ رسالة صوتية بالعربية أو الإنجليزية إلى قائمة طلب يستطيع موظفوك مراجعتها وتجهيزها.",
        },
      },
      {
        q: { en: "How do saved baskets work?", ar: "كيف تعمل السلال المحفوظة؟" },
        a: {
          en: "After a customer's first order, that list is saved to their contact. Next time, they reorder it in one tap and adjust a few items before confirming.",
          ar: "بعد أول طلب للعميل، تُحفَظ تلك القائمة في جهة اتصاله. في المرة التالية، يعيد طلبها بنقرة واحدة ويعدّل بضعة أصناف قبل التأكيد.",
        },
      },
      {
        q: { en: "What happens when an item is out of stock?", ar: "ماذا يحدث عند نفاد صنف؟" },
        a: {
          en: "The packer proposes a substitution in the chat. The customer approves it or drops the item, and only then does the order finalise.",
          ar: "يقترح المُجهِّز بديلاً في المحادثة. يعتمده العميل أو يحذف الصنف، وعندها فقط يُنهى الطلب.",
        },
      },
      {
        q: { en: "Can customers set up a weekly recurring order?", ar: "هل يستطيع العملاء إعداد طلب أسبوعي متكرر؟" },
        a: {
          en: "Yes. A standing order is packed on a set schedule, with a message before each one so the customer can pause or change it.",
          ar: "نعم. يُجهَّز طلب دائم وفق جدول محدد، مع رسالة قبل كل طلب ليتمكّن العميل من إيقافه مؤقتاً أو تغييره.",
        },
      },
      {
        q: { en: "How is payment handled?", ar: "كيف يُدار الدفع؟" },
        a: {
          en: "Card in OMR through an AmwalPay link, or cash on delivery. Card payments reconcile against the order automatically.",
          ar: "بطاقة بالريال العماني عبر رابط أموال باي، أو نقداً عند التسليم. تُسوّى مدفوعات البطاقة مقابل الطلب تلقائياً.",
        },
      },
      {
        q: { en: "Does it support Arabic?", ar: "هل يدعم العربية؟" },
        a: {
          en: "Yes, in text and voice notes, and the bot replies in the language the customer used.",
          ar: "نعم، في النص والرسائل الصوتية، ويرد البوت باللغة التي استخدمها العميل.",
        },
      },
    ],
    related: [
      { href: "/product/payments", label: { en: "AmwalPay Online Payments", ar: "مدفوعات أموال باي" } },
      { href: "/product/broadcast-campaigns", label: { en: "Broadcast & Marketing Campaigns", ar: "حملات البث والتسويق" } },
      { href: "/solutions/ecommerce-online-stores", label: { en: "Ecommerce & online stores", ar: "التجارة الإلكترونية والمتاجر" } },
      { href: "/product/botflow-studio", label: { en: "Visual Botflow Studio", ar: "استوديو مسارات البوت" } },
    ],
    schemaType: "Service",
  },

  /* ===================================================================== */
  /* 7. Tours, Safari & Musandam                                            */
  /*    Primary:    WhatsApp booking for tour operators                     */
  /*    Secondary:  Musandam dhow cruise booking · desert safari booking    */
  /*                WhatsApp · tour operator WhatsApp Oman                   */
  /* ===================================================================== */
  {
    slug: "tours-safari-musandam",
    primaryKeyword: "WhatsApp booking for tour operators",
    secondaryKeywords: [
      "Musandam dhow cruise booking",
      "desert safari booking WhatsApp",
      "tour operator WhatsApp Oman",
    ],
    keywords: [
      "WhatsApp booking for tour operators", "Musandam dhow cruise booking", "desert safari booking WhatsApp",
      "tour operator WhatsApp Oman", "live seat availability WhatsApp", "tour PDF voucher WhatsApp",
      "wadi trip booking Oman", "Musandam tours WhatsApp", "safari camp booking WhatsApp",
      "direct tour booking no OTA", "tour deposit link WhatsApp",
    ],
    metaTitle: {
      en: "WhatsApp Booking for Tours, Safari & Musandam Operators | Fizmoh",
      ar: "حجز عبر واتساب لمشغّلي الجولات والسفاري ومسندم | Fizmoh",
    },
    metaDescription: {
      en: "Live seat availability, deposits and automatic PDF vouchers on WhatsApp, for Musandam dhow cruises, desert camps and wadi trips, in the traveller's language.",
      ar: "توفر مقاعد مباشر، وعربون، وقسائم PDF على واتساب — لرحلات مسندم بالداو، ومخيمات الصحراء، ورحلات الوديان، وجولات المدينة، بلغة المسافر التي يراسل بها.",
    },
    eyebrow: { en: "Tours, Safari & Musandam", ar: "الجولات والسفاري ومسندم" },
    h1: {
      en: "Sell the last three seats on tomorrow's dhow while the enquiry is still warm",
      ar: "بِع المقاعد الثلاثة الأخيرة في رحلة الداو غداً والاستفسار ما زال ساخناً",
    },
    subheadline: {
      en: "Live seat availability, deposits and automatic PDF vouchers on WhatsApp, for Musandam dhow cruises, desert camps and wadi trips, in the traveller's language.",
      ar: "توفر مقاعد مباشر، وعربون، وقسائم PDF على واتساب — لرحلات مسندم بالداو، ومخيمات الصحراء، ورحلات الوديان، وجولات المدينة، بلغة المسافر التي يراسل بها.",
    },
    hero: {
      src: "/marketing/industries/tours-safari-musandam.jpg",
      alt: {
        en: "A traditional wooden Musandam dhow cruising past dramatic fjord cliffs on turquoise water in the Strait of Hormuz, Oman",
        ar: "قارب داو خشبي تقليدي في مسندم يبحر بمحاذاة منحدرات الأخوار على مياه فيروزية في مضيق هرمز، عمان",
      },
      width: 1280,
      height: 714,
      placeholder: true,
    },
    heroNote: {
      en: "Direct bookings, no OTA commission · deposits in the chat · vouchers issued automatically",
      ar: "حجوزات مباشرة بلا عمولة وسيط · عربون في المحادثة · قسائم تُصدَر تلقائياً",
    },
    problems: [
      {
        title: { en: "Enquiries at 11pm go cold by morning", ar: "استفسارات الحادية عشرة ليلاً تبرد بحلول الصباح" },
        body: {
          en: "A traveller in another timezone asks about tomorrow's trip, and by the time your office opens they have booked with someone who replied.",
          ar: "مسافر في منطقة زمنية أخرى يسأل عن رحلة الغد، وبحلول فتح مكتبك يكون قد حجز مع من رد عليه.",
        },
      },
      {
        title: { en: "Seats oversold or benches left empty", ar: "مقاعد تُباع أكثر من اللازم أو مقاعد تبقى فارغة" },
        body: {
          en: "Without a live count, two staff sell the same seats, or a boat leaves half full because nobody knew there was room.",
          ar: "بلا عدّ مباشر، يبيع موظفان المقاعد نفسها، أو يغادر قارب نصف ممتلئ لأن لا أحد علم بوجود متسع.",
        },
      },
      {
        title: { en: "OTAs take 20–25% of the fare", ar: "الوسطاء يأخذون 20–25% من السعر" },
        body: {
          en: "The booking sites bring reach, but on a direct enquiry that a chat could close, their commission is pure margin lost.",
          ar: "مواقع الحجز تجلب وصولاً، لكن على استفسار مباشر تستطيع محادثة إغلاقه، عمولتها هامش صافٍ ضائع.",
        },
      },
    ],
    useCases: [
      {
        icon: "Ship",
        title: { en: "Enquiry → live seats → deposit → confirmed", ar: "استفسار ← مقاعد مباشرة ← عربون ← مؤكَّد" },
        body: {
          en: "The bot offers real availability for a date, holds the seats while the traveller decides, and confirms once the deposit is paid.",
          ar: "يعرض البوت التوفر الحقيقي لتاريخ، يحجز المقاعد ريثما يقرّر المسافر، ويؤكّد بعد دفع العربون.",
        },
      },
      {
        icon: "FileText",
        title: { en: "A PDF voucher with pickup point and time", ar: "قسيمة PDF بنقطة ووقت الاستلام" },
        body: {
          en: "The moment a booking is confirmed, the traveller gets a voucher — reference, pickup, what to bring — with nothing typed by hand.",
          ar: "لحظة تأكيد الحجز، يحصل المسافر على قسيمة — المرجع، الاستلام، ما يجب إحضاره — دون كتابة يدوية.",
        },
      },
      {
        icon: "Users",
        title: { en: "Group and private-charter quotes", ar: "عروض المجموعات والحجز الخاص" },
        body: {
          en: "A guided thread collects group size, date and preferences and returns a quote, with a named agent for anything complex.",
          ar: "محادثة موجَّهة تجمع حجم المجموعة والتاريخ والتفضيلات وتعيد عرض سعر، مع موظف باسم لأي أمر معقّد.",
        },
      },
      {
        icon: "CloudSun",
        title: { en: "A weather or itinerary change to today's guests", ar: "تغيير طقس أو برنامج لضيوف اليوم" },
        body: {
          en: "One broadcast reaches everyone booked on tomorrow's tour — individually — when the plan has to shift.",
          ar: "بث واحد يصل إلى كل من حجز في رحلة الغد — فردياً — عندما يجب تغيير الخطة.",
        },
      },
      {
        icon: "Plus",
        title: { en: "Upsell a transfer or a second tour", ar: "بيع نقل إضافي أو جولة ثانية" },
        body: {
          en: "After a booking, the bot offers an airport transfer or a wadi day, and takes payment for it in the same chat.",
          ar: "بعد الحجز، يعرض البوت نقلاً من المطار أو يوماً في وادٍ، ويأخذ الدفع في المحادثة نفسها.",
        },
      },
    ],
    how: [
      {
        title: { en: "The traveller messages your number", ar: "يراسل المسافر رقمك" },
        body: {
          en: "From a Click-to-WhatsApp ad, a QR at the hotel desk or your website — in Arabic, English or another language.",
          ar: "من إعلان انقر-للمحادثة، أو رمز في مكتب الفندق، أو موقعك — بالعربية أو الإنجليزية أو لغة أخرى.",
        },
      },
      {
        title: { en: "The bot offers dates and live seats", ar: "يعرض البوت التواريخ والمقاعد المباشرة" },
        body: {
          en: "Availability comes from your real seat counts, so nothing is offered that cannot actually be booked.",
          ar: "يأتي التوفر من أعداد مقاعدك الحقيقية، فلا يُعرَض ما لا يمكن حجزه فعلاً.",
        },
      },
      {
        title: { en: "A deposit holds the seats", ar: "عربون يحجز المقاعد" },
        body: {
          en: "The traveller pays a deposit in OMR by card; the balance is a link for later or paid on the day.",
          ar: "يدفع المسافر عربوناً بالريال العماني بالبطاقة؛ والرصيد رابط لاحقاً أو يُدفع في اليوم.",
        },
      },
      {
        title: { en: "Voucher sent, reminder the night before", ar: "تُرسل القسيمة، وتذكير في الليلة السابقة" },
        body: {
          en: "The PDF voucher goes out on confirmation, and an automatic reminder with the pickup details lands the evening before.",
          ar: "تُرسل قسيمة PDF عند التأكيد، ويصل تذكير تلقائي بتفاصيل الاستلام مساء اليوم السابق.",
        },
      },
    ],
    features: [
      {
        feature: { en: "Live seat availability", ar: "توفر مقاعد مباشر" },
        benefit: { en: "No overselling the dhow and no benches leaving empty because the count was guessed.", ar: "لا بيع زائد للداو ولا مقاعد تغادر فارغة لأن العدّ كان تخميناً." },
      },
      {
        feature: { en: "Deposit in the chat", ar: "عربون في المحادثة" },
        benefit: { en: "The booking is real money before you commit a boat and a guide to it.", ar: "الحجز مال حقيقي قبل أن تخصّص له قارباً ومرشداً." },
      },
      {
        feature: { en: "Automatic PDF vouchers", ar: "قسائم PDF تلقائية" },
        benefit: { en: "No manual document and no \"what time is pickup?\" the night before.", ar: "لا مستند يدوي ولا سؤال \"متى الاستلام؟\" في الليلة السابقة." },
      },
      {
        feature: { en: "Direct booking on your number", ar: "حجز مباشر على رقمك" },
        benefit: { en: "The 20–25% an OTA would have taken stays with the operator.", ar: "الـ 20–25% التي كان سيأخذها الوسيط تبقى مع المشغّل." },
      },
      {
        feature: { en: "Multilingual conversations", ar: "محادثات متعددة اللغات" },
        benefit: { en: "A traveller books in their own language, which is often the difference between a booking and a bounce.", ar: "يحجز المسافر بلغته، وهو غالباً الفرق بين حجز وارتداد." },
      },
      {
        feature: { en: "Day-of broadcast to booked guests", ar: "بث في اليوم نفسه للضيوف المحجوزين" },
        benefit: { en: "A weather change reaches everyone on the trip at once, individually, without a call list.", ar: "تغيير الطقس يصل إلى كل من في الرحلة دفعة واحدة، فردياً، دون قائمة مكالمات." },
      },
    ],
    stats: [
      { value: { en: "20–25%", ar: "20–25%" }, label: { en: "typical OTA commission avoided on direct bookings", ar: "متوسط عمولة الوسيط المتجنَّبة على الحجوزات المباشرة" }, estimate: true },
      { value: { en: "Live", ar: "مباشر" }, label: { en: "seat counts per departure", ar: "أعداد مقاعد لكل رحلة" } },
      { value: { en: "PDF", ar: "PDF" }, label: { en: "vouchers issued automatically on confirmation", ar: "قسائم تُصدَر تلقائياً عند التأكيد" } },
      { value: { en: "AR + EN", ar: "عربي + إنجليزي" }, label: { en: "and more languages on request", ar: "ولغات أخرى عند الطلب" } },
    ],
    testimonials: [
      {
        quote: {
          en: "TODO: replace with real client quote — a Musandam operator describing filling last-minute dhow seats from evening WhatsApp enquiries.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — مشغّل في مسندم يصف ملء مقاعد الداو في اللحظة الأخيرة من استفسارات واتساب المسائية.",
        },
        name: "",
        role: { en: "Tour Operator", ar: "مشغّل جولات" },
        company: "TODO",
        todo: true,
      },
      {
        quote: {
          en: "TODO: replace with real client quote — a reservations manager describing the drop in pre-trip 'what time is pickup' messages after automatic vouchers.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — مدير حجوزات يصف انخفاض رسائل \"متى الاستلام\" قبل الرحلة بعد القسائم التلقائية.",
        },
        name: "",
        role: { en: "Reservations Manager", ar: "مدير الحجوزات" },
        company: "TODO",
        todo: true,
      },
    ],
    faqs: [
      {
        q: { en: "Does it show real-time seat availability?", ar: "هل يعرض توفر المقاعد في الوقت الحقيقي؟" },
        a: {
          en: "Yes. The bot reads your live seat counts per departure, so a traveller is only ever offered a date and a seat that can actually be booked.",
          ar: "نعم. يقرأ البوت أعداد مقاعدك المباشرة لكل رحلة، فلا يُعرَض على المسافر إلا تاريخ ومقعد يمكن حجزه فعلاً.",
        },
      },
      {
        q: { en: "How are deposits and balances handled?", ar: "كيف يُدار العربون والأرصدة؟" },
        a: {
          en: "A deposit is taken by card in OMR to confirm the booking. The balance can be a payment link sent later or collected on the day.",
          ar: "يُؤخَذ عربون بالبطاقة بالريال العماني لتأكيد الحجز. يمكن أن يكون الرصيد رابط دفع يُرسَل لاحقاً أو يُحصَّل في اليوم.",
        },
      },
      {
        q: { en: "Are vouchers sent automatically?", ar: "هل تُرسَل القسائم تلقائياً؟" },
        a: {
          en: "Yes. On confirmation the traveller receives a PDF voucher with the booking reference, pickup point and time, and what to bring — generated without staff involvement.",
          ar: "نعم. عند التأكيد يتلقى المسافر قسيمة PDF بمرجع الحجز ونقطة ووقت الاستلام وما يجب إحضاره — تُنشأ دون تدخل موظف.",
        },
      },
      {
        q: { en: "Can it handle private charters and group quotes?", ar: "هل يتعامل مع الحجوزات الخاصة وعروض المجموعات؟" },
        a: {
          en: "Yes. A guided thread collects the details and returns a quote, and a named agent can take over for a complex itinerary or a large group.",
          ar: "نعم. محادثة موجَّهة تجمع التفاصيل وتعيد عرض سعر، ويمكن لموظف باسم أن يتولّى برنامجاً معقّداً أو مجموعة كبيرة.",
        },
      },
      {
        q: { en: "What languages does it support?", ar: "ما اللغات التي يدعمها؟" },
        a: {
          en: "Arabic and English out of the box, and the bot replies in the language the traveller writes in. Ask us about adding others for your key source markets.",
          ar: "العربية والإنجليزية جاهزتان، ويرد البوت بلغة كتابة المسافر. اسألنا عن إضافة لغات أخرى لأسواقك المصدرة الرئيسية.",
        },
      },
      {
        q: { en: "Can I message everyone on tomorrow's tour at once?", ar: "هل أستطيع مراسلة كل من في رحلة الغد دفعة واحدة؟" },
        a: {
          en: "Yes. A broadcast to that day's confirmed guests is sent individually, so a weather change or a pickup adjustment reaches everyone without a phone list.",
          ar: "نعم. يُرسَل بث لضيوف ذلك اليوم المؤكَّدين فردياً، فيصل تغيير الطقس أو تعديل الاستلام إلى الجميع دون قائمة هاتفية.",
        },
      },
    ],
    related: [
      { href: "/product/payments", label: { en: "AmwalPay Online Payments — deposits and balances", ar: "مدفوعات أموال باي — العربون والأرصدة" } },
      { href: "/product/broadcast-campaigns", label: { en: "Broadcast & Marketing Campaigns — reach today's guests", ar: "حملات البث والتسويق — تواصل مع ضيوف اليوم" } },
      { href: "/product/team-inbox", label: { en: "Multi-Agent Team Inbox — answer after hours", ar: "صندوق الفريق متعدد الموظفين — رد بعد ساعات العمل" } },
      { href: "/product/botflow-studio", label: { en: "Visual Botflow Studio — build the booking flow", ar: "استوديو مسارات البوت — ابنِ مسار الحجز" } },
    ],
    schemaType: "Service",
  },

  /* ===================================================================== */
  /* 8. Clinics, Hospitals & Health                                         */
  /*    Primary:    WhatsApp appointment booking for clinics                */
  /*    Secondary:  reduce no-shows clinic WhatsApp · hospital WhatsApp     */
  /*                booking Oman · doctor appointment WhatsApp              */
  /* ===================================================================== */
  {
    slug: "clinics-hospitals-health",
    primaryKeyword: "WhatsApp appointment booking for clinics",
    secondaryKeywords: [
      "reduce no-shows clinic WhatsApp",
      "hospital WhatsApp booking Oman",
      "doctor appointment WhatsApp",
    ],
    keywords: [
      "WhatsApp appointment booking for clinics", "reduce no-shows clinic WhatsApp", "hospital WhatsApp booking Oman",
      "doctor appointment WhatsApp", "clinic WhatsApp bot", "patient reminder WhatsApp",
      "hospital bed management", "oncology ward scheduling", "healthcare WhatsApp GCC",
      "recall follow-up WhatsApp", "clinic reschedule WhatsApp",
    ],
    metaTitle: {
      en: "WhatsApp Appointment Booking for Clinics & Hospitals | Fizmoh",
      ar: "حجز مواعيد عبر واتساب للعيادات والمستشفيات | Fizmoh",
    },
    metaDescription: {
      en: "Doctor appointment booking against live schedules, reminders that cut no-shows, and a hospital bed and oncology-ward view, on the number patients already use.",
      ar: "حجز مواعيد الأطباء مقابل جداول مباشرة، وتذكيرات تقلّل عدم الحضور، و — للمستشفيات — عرض للأسرّة وجناح الأورام، كلها على الرقم الذي يراسله المرضى أصلاً.",
    },
    eyebrow: { en: "Clinics, Hospitals & Health", ar: "العيادات والمستشفيات والصحة" },
    h1: {
      en: "Stop losing patients to no-shows and phone-tag booking",
      ar: "توقّف عن خسارة المرضى بسبب عدم الحضور والحجز بتبادل المكالمات",
    },
    subheadline: {
      en: "Doctor appointment booking against live schedules, reminders that cut no-shows, and a hospital bed and oncology-ward view, on the number patients already use.",
      ar: "حجز مواعيد الأطباء مقابل جداول مباشرة، وتذكيرات تقلّل عدم الحضور، و — للمستشفيات — عرض للأسرّة وجناح الأورام، كلها على الرقم الذي يراسله المرضى أصلاً.",
    },
    hero: {
      src: "/marketing/industries/clinics-hospitals-health.jpg",
      alt: {
        en: "A calm modern clinic reception with warm wood accents, plants and soft daylight, and a receptionist assisting at a curved desk",
        ar: "استقبال عيادة عصري هادئ بلمسات خشب دافئة ونباتات وضوء نهار ناعم، وموظفة استقبال تساعد عند مكتب منحنٍ",
      },
      width: 1280,
      height: 714,
      placeholder: true,
    },
    heroNote: {
      en: "Live doctor schedules · 24h and same-day reminders · hospital bed & oncology-ward view",
      ar: "جداول أطباء مباشرة · تذكيرات قبل 24 ساعة وفي اليوم نفسه · عرض أسرّة المستشفى وجناح الأورام",
    },
    problems: [
      {
        title: { en: "The reception line is always busy", ar: "خط الاستقبال مشغول دائماً" },
        body: {
          en: "Patients call to book, reschedule or ask a simple question, and the ones who can't get through go elsewhere.",
          ar: "يتصل المرضى للحجز أو إعادة الجدولة أو سؤال بسيط، ومن لا يستطيعون الوصول يذهبون لغيركم.",
        },
      },
      {
        title: { en: "A no-show is a slot nobody could rebook", ar: "عدم الحضور موعد لم يستطع أحد إعادة حجزه" },
        body: {
          en: "The patient forgot, and by the time the clinic notices the gap, it is too late to fill it.",
          ar: "نسي المريض، وبحلول ملاحظة العيادة للفجوة، يكون قد فات وقت ملئها.",
        },
      },
      {
        title: { en: "Beds and chemo chairs tracked on a whiteboard", ar: "الأسرّة وكراسي العلاج الكيميائي تُتابَع على لوح" },
        body: {
          en: "Admissions and ward capacity live on a board that only the people standing in front of it can read.",
          ar: "القبول وسعة الجناح على لوح لا يقرؤه إلا الواقفون أمامه.",
        },
      },
    ],
    useCases: [
      {
        icon: "Stethoscope",
        title: { en: "Book by department and doctor", ar: "احجز حسب القسم والطبيب" },
        body: {
          en: "The patient chooses a department, then a doctor, then a time from that doctor's live schedule — no call, no waiting on hold.",
          ar: "يختار المريض قسماً، ثم طبيباً، ثم وقتاً من جدول ذلك الطبيب المباشر — دون مكالمة ولا انتظار على الخط.",
        },
      },
      {
        icon: "BellRing",
        title: { en: "Reminders 24 hours and on the day", ar: "تذكيرات قبل 24 ساعة وفي اليوم نفسه" },
        body: {
          en: "Two reminders go out automatically, each with a one-tap reschedule so a slot that can't be kept is freed in time to reuse.",
          ar: "يُرسَل تذكيران تلقائياً، لكل منهما إعادة جدولة بنقرة واحدة، فيُحرَّر الموعد الذي لا يمكن الالتزام به في وقت يتيح إعادة استخدامه.",
        },
      },
      {
        icon: "ClipboardList",
        title: { en: "Pre-visit instructions and document checklist", ar: "تعليمات ما قبل الزيارة وقائمة المستندات" },
        body: {
          en: "Fasting instructions, what to bring, insurance documents — sent automatically so fewer visits are wasted on missing paperwork.",
          ar: "تعليمات الصيام، وما يجب إحضاره، ومستندات التأمين — تُرسَل تلقائياً فتقلّ الزيارات المهدورة بسبب أوراق ناقصة.",
        },
      },
      {
        icon: "Bed",
        title: { en: "Hospital bed and oncology-ward view", ar: "عرض أسرّة المستشفى وجناح الأورام" },
        body: {
          en: "A live map of a 30-bed oncology ward and chemo-chair scheduling, so admissions and treatment planning are not a whiteboard.",
          ar: "خريطة مباشرة لجناح أورام من 30 سريراً وجدولة كراسي العلاج الكيميائي، فلا يكون القبول وتخطيط العلاج لوحاً.",
        },
      },
      {
        icon: "Repeat",
        title: { en: "Recall and follow-up prompts", ar: "تنبيهات الاستدعاء والمتابعة" },
        body: {
          en: "A message at the right interval brings a patient back for a review or a repeat screening, so follow-ups actually happen.",
          ar: "رسالة في الفترة المناسبة تُعيد المريض لمراجعة أو فحص متكرر، فتحدث المتابعات فعلاً.",
        },
      },
    ],
    how: [
      {
        title: { en: "The patient messages your number", ar: "يراسل المريض رقمك" },
        body: {
          en: "The same number on your card and your signage. A bot handles the routine part in Arabic or English.",
          ar: "الرقم نفسه على بطاقتك ولافتاتك. يتولّى بوت الجزء الروتيني بالعربية أو الإنجليزية.",
        },
      },
      {
        title: { en: "They pick a department, doctor and slot", ar: "يختارون قسماً وطبيباً وموعداً" },
        body: {
          en: "Only genuinely open times on that doctor's live schedule are offered, so there is no double-booked clinic.",
          ar: "تُعرَض فقط الأوقات المفتوحة فعلاً في جدول ذلك الطبيب المباشر، فلا عيادة محجوزة مرتين.",
        },
      },
      {
        title: { en: "Confirmation and preparation instructions", ar: "تأكيد وتعليمات التحضير" },
        body: {
          en: "The appointment is confirmed in the chat with everything the patient needs to bring or do beforehand.",
          ar: "يُؤكَّد الموعد في المحادثة مع كل ما يحتاج المريض إحضاره أو فعله مسبقاً.",
        },
      },
      {
        title: { en: "Reminders, reschedules and recalls", ar: "تذكيرات وإعادة جدولة واستدعاءات" },
        body: {
          en: "Reminders send themselves, a reschedule is one tap, and a recall prompt brings the patient back at the right time.",
          ar: "تُرسَل التذكيرات نفسها، وإعادة الجدولة نقرة واحدة، وتنبيه الاستدعاء يُعيد المريض في الوقت المناسب.",
        },
      },
    ],
    features: [
      {
        feature: { en: "Live schedule booking", ar: "حجز من الجدول المباشر" },
        benefit: { en: "No double-booked clinic, because only real open slots are ever offered.", ar: "لا عيادة محجوزة مرتين، لأنه لا يُعرَض إلا الفترات المفتوحة الحقيقية." },
      },
      {
        feature: { en: "Deposit or card-on-file option", ar: "خيار العربون أو بطاقة محفوظة" },
        benefit: { en: "A small commitment at booking is the most effective lever against no-shows.", ar: "التزام صغير عند الحجز هو أكثر أداة فعّالة ضد عدم الحضور." },
      },
      {
        feature: { en: "Automatic reminders", ar: "تذكيرات تلقائية" },
        benefit: { en: "The slot is either used or freed early enough for the clinic to rebook it.", ar: "الموعد إمّا يُستخدَم أو يُحرَّر مبكراً بما يكفي لتعيد العيادة حجزه." },
      },
      {
        feature: { en: "Pre-visit instructions", ar: "تعليمات ما قبل الزيارة" },
        benefit: { en: "Fewer appointments wasted because the patient arrived unprepared or without documents.", ar: "مواعيد مهدورة أقل بسبب وصول المريض غير مستعد أو دون مستندات." },
      },
      {
        feature: { en: "Bed and oncology-ward view", ar: "عرض الأسرّة وجناح الأورام" },
        benefit: { en: "Admissions and chemo scheduling in one shared, live picture instead of a whiteboard.", ar: "القبول وجدولة العلاج الكيميائي في صورة واحدة مشتركة ومباشرة بدل لوح." },
      },
      {
        feature: { en: "Recall prompts", ar: "تنبيهات الاستدعاء" },
        benefit: { en: "Follow-up care is prompted on schedule rather than depending on the patient to remember.", ar: "تُنبَّه رعاية المتابعة وفق الجدول بدل الاعتماد على تذكّر المريض." },
      },
    ],
    stats: [
      { value: { en: "up to ~30–40%", ar: "حتى ~30–40%" }, label: { en: "typical no-show reduction with reminders and a booking commitment", ar: "متوسط انخفاض عدم الحضور مع التذكيرات والتزام الحجز" }, estimate: true },
      { value: { en: "24h + same-day", ar: "24 ساعة + نفس اليوم" }, label: { en: "automatic reminder cadence", ar: "إيقاع التذكير التلقائي" } },
      { value: { en: "30-bed", ar: "30 سريراً" }, label: { en: "oncology ward mapping and chemo-chair scheduling", ar: "خريطة جناح أورام وجدولة كراسي علاج كيميائي" } },
      { value: { en: "Live", ar: "مباشر" }, label: { en: "doctor schedules drive every offered slot", ar: "جداول الأطباء المباشرة تحدّد كل موعد مُتاح" } },
    ],
    testimonials: [
      {
        quote: {
          en: "TODO: replace with real client quote — a clinic manager describing the no-show rate before and after automatic WhatsApp reminders with one-tap reschedule.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — مدير عيادة يصف معدل عدم الحضور قبل وبعد تذكيرات واتساب التلقائية مع إعادة جدولة بنقرة.",
        },
        name: "",
        role: { en: "Clinic Manager", ar: "مدير عيادة" },
        company: "TODO",
        todo: true,
      },
      {
        quote: {
          en: "TODO: replace with real client quote — a hospital administrator describing moving oncology-ward and bed tracking off a whiteboard.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — مدير مستشفى يصف نقل متابعة جناح الأورام والأسرّة من لوح.",
        },
        name: "",
        role: { en: "Hospital Administrator", ar: "مدير مستشفى" },
        company: "TODO",
        todo: true,
      },
    ],
    faqs: [
      {
        q: { en: "How does WhatsApp appointment booking work?", ar: "كيف يعمل حجز المواعيد عبر واتساب؟" },
        a: {
          en: "The patient messages your number, chooses a department, doctor and time from the doctor's live schedule, and gets a confirmation with preparation instructions — without calling reception.",
          ar: "يراسل المريض رقمك، يختار قسماً وطبيباً ووقتاً من جدول الطبيب المباشر، ويحصل على تأكيد مع تعليمات التحضير — دون الاتصال بالاستقبال.",
        },
      },
      {
        q: { en: "Can it reduce no-shows?", ar: "هل يمكن أن يقلّل عدم الحضور؟" },
        a: {
          en: "Yes. Automatic 24-hour and same-day reminders, a one-tap reschedule and an optional booking deposit together reduce no-shows substantially — commonly by around a third, though the exact figure depends on your patient mix.",
          ar: "نعم. التذكيرات التلقائية قبل 24 ساعة وفي اليوم نفسه، وإعادة الجدولة بنقرة، وعربون حجز اختياري، تقلّل عدم الحضور بشكل كبير — عادة نحو الثلث، وإن كان الرقم الدقيق يعتمد على تركيبة مرضاك.",
        },
      },
      {
        q: { en: "Is patient data handled safely?", ar: "هل تُدار بيانات المرضى بأمان؟" },
        a: {
          en: "Access is role-based and staff actions are logged. Data residency and deployment options depend on your setup — ask us about them before you sign, because we would rather answer precisely than generally.",
          ar: "الوصول قائم على الأدوار وتُسجَّل إجراءات الموظفين. يعتمد مكان حفظ البيانات وخيارات النشر على إعدادك — اسألنا عنها قبل التسجيل، لأننا نفضّل إجابة دقيقة على إجابة عامة.",
        },
      },
      {
        q: { en: "Does it work for a hospital, not just a clinic?", ar: "هل يعمل لمستشفى، وليس عيادة فقط؟" },
        a: {
          en: "Yes. Alongside appointment booking, hospitals get a live view of a 30-bed oncology ward and chemo-chair scheduling, so admissions and treatment planning are managed in the same system.",
          ar: "نعم. إلى جانب حجز المواعيد، تحصل المستشفيات على عرض مباشر لجناح أورام من 30 سريراً وجدولة كراسي العلاج الكيميائي، فيُدار القبول وتخطيط العلاج في النظام نفسه.",
        },
      },
      {
        q: { en: "Are reminders and reschedules automatic?", ar: "هل التذكيرات وإعادة الجدولة تلقائية؟" },
        a: {
          en: "Yes. Reminders send themselves on a set cadence, and the patient can reschedule from the reminder itself, which frees the slot early enough to be reused.",
          ar: "نعم. تُرسَل التذكيرات نفسها وفق إيقاع محدد، ويستطيع المريض إعادة الجدولة من التذكير نفسه، ما يحرّر الموعد مبكراً بما يكفي لإعادة استخدامه.",
        },
      },
      {
        q: { en: "Does it send test results over WhatsApp?", ar: "هل يرسل نتائج الفحوصات عبر واتساب؟" },
        a: {
          en: "No. It can send a notification that results are ready and ask the patient to collect them through the proper channel — the results themselves are never put in the message.",
          ar: "لا. يمكنه إرسال إشعار بأن النتائج جاهزة وطلب استلامها عبر القناة المناسبة — أمّا النتائج نفسها فلا تُوضَع في الرسالة أبداً.",
        },
      },
    ],
    related: [
      { href: "/product/team-inbox", label: { en: "Multi-Agent Team Inbox — the reception queue", ar: "صندوق الفريق متعدد الموظفين — طابور الاستقبال" } },
      { href: "/product/payments", label: { en: "AmwalPay Online Payments — booking deposits", ar: "مدفوعات أموال باي — عربون الحجز" } },
      { href: "/solutions/salons-beauty-spas", label: { en: "Salons, beauty & spas", ar: "الصالونات والتجميل والسبا" } },
      { href: "/product/botflow-studio", label: { en: "Visual Botflow Studio — build the triage flow", ar: "استوديو مسارات البوت — ابنِ مسار الفرز" } },
    ],
    schemaType: "Service",
  },
]

export function industryBySlug(slug: string): MarketingPage | undefined {
  return INDUSTRY_PAGES.find(p => p.slug === slug.toLowerCase())
}

export const INDUSTRY_SLUGS = INDUSTRY_PAGES.map(p => p.slug)
