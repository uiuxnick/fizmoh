import type { MarketingPage } from "./types"

/**
 * Product landing pages — one per capability in the "Products" nav menu.
 *
 * Route: /product/[slug]. Rendered by the shared template in
 * src/app/product/[slug]/page.tsx. Slugs are stable: they are linked from the
 * header, the footer, the sitemap and each other, and old slugs are redirected
 * in next.config.ts.
 */

export const PRODUCT_PAGES: MarketingPage[] = [
  /* ===================================================================== */
  /* 1. Multi-Agent Team Inbox                                              */
  /*    Primary keyword:  WhatsApp shared team inbox                        */
  /*    Secondary:        WhatsApp multi-agent inbox · WhatsApp CRM for     */
  /*                      teams · WhatsApp Business API shared inbox Oman    */
  /* ===================================================================== */
  {
    slug: "team-inbox",
    primaryKeyword: "WhatsApp shared team inbox",
    secondaryKeywords: [
      "WhatsApp multi-agent inbox",
      "WhatsApp CRM for teams",
      "WhatsApp Business API shared inbox Oman",
    ],
    keywords: [
      "WhatsApp shared team inbox", "WhatsApp multi-agent inbox", "WhatsApp CRM for teams",
      "WhatsApp Business API shared inbox", "WhatsApp team inbox Oman", "WhatsApp shared inbox GCC",
      "WhatsApp helpdesk", "WhatsApp customer support software", "WhatsApp conversation assignment",
      "WhatsApp 24 hour window", "WhatsApp agent handover", "WhatsApp internal notes",
    ],
    metaTitle: {
      en: "WhatsApp Shared Team Inbox — Multi-Agent CRM | Fizmoh",
      ar: "صندوق وارد واتساب مشترك للفريق — CRM متعدد الموظفين",
    },
    metaDescription: {
      en: "One official WhatsApp Business number as a shared team inbox: assign chats, leave private notes, hand over to a human, and beat the 24-hour reply window.",
      ar: "شغّل رقم واتساب بزنس رسمي واحد كصندوق وارد مشترك: توزيع المحادثات، ملاحظات داخلية، تحويل لموظف، والالتزام بنافذة الرد 24 ساعة. عمان والخليج.",
    },
    eyebrow: { en: "Multi-Agent Team Inbox", ar: "صندوق الوارد متعدد الموظفين" },
    h1: {
      en: "One WhatsApp number, your whole team answering",
      ar: "رقم واتساب واحد، وفريقك بالكامل يرد عليه",
    },
    subheadline: {
      en: "A shared inbox for WhatsApp Business where every conversation is assigned, handed over and tracked against a 24-hour reply clock — so no customer message sits unseen on someone's personal phone.",
      ar: "صندوق وارد مشترك لواتساب بزنس، حيث تُوزَّع كل محادثة وتُحوَّل وتُتابَع أمام مؤقّت رد مدته 24 ساعة — فلا تبقى رسالة عميل دون قراءة على هاتف موظف شخصي.",
    },
    hero: {
      src: "/marketing/products/team-inbox.jpg",
      alt: {
        en: "A small customer support team in a bright Muscat office answering WhatsApp messages together on laptops",
        ar: "فريق دعم عملاء صغير في مكتب مضيء بمسقط يرد على رسائل واتساب معاً عبر الحواسيب المحمولة",
      },
      width: 1280,
      height: 714,
      placeholder: true,
    },
    heroNote: {
      en: "Free for 14 days · no credit card · connect your number in about a minute",
      ar: "مجاناً 14 يوماً · بدون بطاقة ائتمان · اربط رقمك في دقيقة تقريباً",
    },
    problems: [
      {
        title: { en: "Chats scattered across personal phones", ar: "محادثات مبعثرة على الهواتف الشخصية" },
        body: {
          en: "Each agent answers from their own WhatsApp, so nobody sees the full picture — and when that agent leaves, their conversations and customers leave with them.",
          ar: "كل موظف يرد من واتساب الخاص به، فلا أحد يرى الصورة كاملة — وعندما يترك الموظف العمل، تذهب محادثاته وعملاؤه معه.",
        },
      },
      {
        title: { en: "Nobody knows who replied", ar: "لا أحد يعرف من الذي رد" },
        body: {
          en: "Two people answer the same customer, or each assumes the other did and nobody does. There is no record of who said what.",
          ar: "شخصان يردّان على العميل نفسه، أو يظن كل منهما أن الآخر رد فلا يرد أحد. ولا يوجد سجل لمن قال ماذا.",
        },
      },
      {
        title: { en: "The 24-hour window closes unnoticed", ar: "نافذة 24 ساعة تُغلق دون انتباه" },
        body: {
          en: "WhatsApp only lets you reply freely for 24 hours after the customer's last message. Miss it and the next message costs a template — or never gets sent.",
          ar: "يسمح واتساب بالرد بحرية لمدة 24 ساعة فقط بعد آخر رسالة من العميل. تفويتها يعني أن الرسالة التالية تحتاج قالباً مدفوعاً — أو لا تُرسل أبداً.",
        },
      },
    ],
    useCases: [
      {
        icon: "UserCheck",
        title: { en: "Assign and reassign every chat", ar: "توزيع وإعادة توزيع كل محادثة" },
        body: {
          en: "Route an incoming conversation to the right person or team, reassign it when someone is off, and see at a glance which chats have no owner.",
          ar: "وجّه المحادثة الواردة إلى الشخص أو الفريق المناسب، وأعد توزيعها عند غياب أحدهم، واعرف فوراً أي محادثات بلا مسؤول.",
        },
      },
      {
        icon: "StickyNote",
        title: { en: "Private notes the customer never sees", ar: "ملاحظات خاصة لا يراها العميل" },
        body: {
          en: "Leave context for the next agent — the quote sent, the objection raised, the promise made — inside the conversation, not in a separate document.",
          ar: "اترك سياقاً للموظف التالي — العرض المُرسل، الاعتراض المطروح، الوعد المقطوع — داخل المحادثة نفسها، لا في مستند منفصل.",
        },
      },
      {
        icon: "Timer",
        title: { en: "A visible 24-hour reply timer", ar: "مؤقّت رد ظاهر مدته 24 ساعة" },
        body: {
          en: "Each open chat shows how long is left in the free-reply window, and warns before it closes so a customer is never left on read by accident.",
          ar: "تُظهر كل محادثة مفتوحة الوقت المتبقي في نافذة الرد المجاني، وتنبّه قبل إغلاقها فلا يُترك العميل دون رد عن طريق الخطأ.",
        },
      },
      {
        icon: "Bot",
        title: { en: "Clean handover from bot to human", ar: "تحويل سلس من البوت إلى الموظف" },
        body: {
          en: "When the bot reaches its limit, the conversation lands in the inbox with the full history attached, assigned to whoever should take it.",
          ar: "عندما يصل البوت إلى حدّه، تنتقل المحادثة إلى الصندوق مع كامل سجلّها، مُسندة إلى من يجب أن يتولّاها.",
        },
      },
      {
        icon: "ShieldCheck",
        title: { en: "A supervisor view of everything open", ar: "عرض إشرافي لكل ما هو مفتوح" },
        body: {
          en: "Managers see every unresolved conversation, how long it has waited and who holds it — without opening ten phones.",
          ar: "يرى المديرون كل محادثة غير محلولة، وكم انتظرت، ومن يتولّاها — دون فتح عشرة هواتف.",
        },
      },
    ],
    how: [
      {
        title: { en: "Connect your official number", ar: "اربط رقمك الرسمي" },
        body: {
          en: "Use Meta's embedded signup to connect an existing WhatsApp Business number, or start a new one. It takes about a minute.",
          ar: "استخدم تسجيل Meta المدمج لربط رقم واتساب بزنس حالي، أو ابدأ رقماً جديداً. يستغرق ذلك دقيقة تقريباً.",
        },
      },
      {
        title: { en: "Invite your team and set roles", ar: "ادعُ فريقك وحدّد الأدوار" },
        body: {
          en: "Add agents, supervisors and admins. Roles decide who can reply, who can reassign and who can send a broadcast.",
          ar: "أضف موظفين ومشرفين ومسؤولين. تحدّد الأدوار من يستطيع الرد، ومن يعيد التوزيع، ومن يرسل حملة بث.",
        },
      },
      {
        title: { en: "Set routing rules", ar: "اضبط قواعد التوجيه" },
        body: {
          en: "Send sales enquiries to one team, support to another, or round-robin to whoever is free. Anything a rule doesn't catch stays visible as unassigned.",
          ar: "وجّه استفسارات المبيعات إلى فريق، والدعم إلى آخر، أو وزّع بالتناوب على المتاح. ما لا تلتقطه القاعدة يبقى ظاهراً كغير مُسند.",
        },
      },
      {
        title: { en: "Reply, note, resolve", ar: "رد، دوّن، أغلِق" },
        body: {
          en: "Agents work the queue, add notes, and close conversations. The timer warns before the 24-hour window ends; nothing falls through.",
          ar: "يعمل الموظفون على قائمة الانتظار، ويضيفون ملاحظات، ويغلقون المحادثات. ينبّه المؤقّت قبل انتهاء نافذة 24 ساعة؛ ولا شيء يضيع.",
        },
      },
    ],
    features: [
      {
        feature: { en: "Shared conversation queue", ar: "قائمة محادثات مشتركة" },
        benefit: { en: "Two agents never reply to the same customer, and no message is left for someone else to notice.", ar: "لا يرد موظفان على العميل نفسه، ولا تُترك رسالة لينتبه إليها غيرهم." },
      },
      {
        feature: { en: "Assignment and ownership", ar: "الإسناد والملكية" },
        benefit: { en: "Every open chat has one clear owner, so accountability is obvious in the daily stand-up.", ar: "لكل محادثة مفتوحة مالك واحد واضح، فتكون المساءلة بديهية في الاجتماع اليومي." },
      },
      {
        feature: { en: "Internal notes and mentions", ar: "ملاحظات داخلية وإشارات" },
        benefit: { en: "Context travels with the conversation instead of living in a spreadsheet nobody updates.", ar: "ينتقل السياق مع المحادثة بدل أن يعيش في جدول لا يحدّثه أحد." },
      },
      {
        feature: { en: "24-hour window timer", ar: "مؤقّت نافذة 24 ساعة" },
        benefit: { en: "The free-reply window is used or the chat is flagged — you stop paying for template messages you could have avoided.", ar: "تُستغل نافذة الرد المجاني أو تُعلَّم المحادثة — فتتوقف عن دفع تكلفة رسائل قوالب كان يمكن تفاديها." },
      },
      {
        feature: { en: "Roles and permissions", ar: "الأدوار والصلاحيات" },
        benefit: { en: "A new hire can answer customers on day one without being able to message your whole list.", ar: "يستطيع الموظف الجديد الرد على العملاء من أول يوم دون القدرة على مراسلة قائمتك بالكامل." },
      },
      {
        feature: { en: "Workspace-owned history", ar: "سجلّ مملوك لمساحة العمل" },
        benefit: { en: "When an agent leaves, their conversations, notes and contacts stay with the business.", ar: "عندما يترك موظف العمل، تبقى محادثاته وملاحظاته وجهات اتصاله مع الشركة." },
      },
    ],
    stats: [
      { value: { en: "24h", ar: "24 ساعة" }, label: { en: "reply window tracked on every open chat", ar: "نافذة رد مُتابَعة على كل محادثة مفتوحة" } },
      { value: { en: "< 1 min", ar: "أقل من دقيقة" }, label: { en: "typical bot-to-human handover", ar: "متوسط التحويل من البوت إلى الموظف" }, estimate: true },
      { value: { en: "100%", ar: "100%" }, label: { en: "of conversations owned by the workspace, not a device", ar: "من المحادثات مملوكة لمساحة العمل، لا لجهاز" } },
      { value: { en: "6", ar: "6" }, label: { en: "built-in roles from agent to admin", ar: "أدوار جاهزة من موظف إلى مسؤول" } },
    ],
    testimonials: [
      {
        quote: {
          en: "TODO: replace with real client quote — a support lead describing what changed when chats moved off personal phones into one assigned queue.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — مسؤول دعم يصف ما تغيّر عندما انتقلت المحادثات من الهواتف الشخصية إلى قائمة مُسندة واحدة.",
        },
        name: "",
        role: { en: "Customer Support Lead", ar: "مسؤول دعم العملاء" },
        company: "TODO",
        todo: true,
      },
      {
        quote: {
          en: "TODO: replace with real client quote — an owner describing keeping the customer relationship after a key agent resigned.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — صاحب عمل يصف احتفاظه بعلاقة العميل بعد استقالة موظف رئيسي.",
        },
        name: "",
        role: { en: "Founder", ar: "المؤسس" },
        company: "TODO",
        todo: true,
      },
    ],
    faqs: [
      {
        q: { en: "Can several agents use one WhatsApp number at the same time?", ar: "هل يستطيع عدة موظفين استخدام رقم واتساب واحد في الوقت نفسه؟" },
        a: {
          en: "Yes. One official WhatsApp Business number feeds a shared inbox where conversations are assigned, reassigned and handed over, with internal notes the customer never sees.",
          ar: "نعم. يغذّي رقم واتساب بزنس رسمي واحد صندوقاً مشتركاً تُوزَّع فيه المحادثات وتُعاد وتُحوَّل، مع ملاحظات داخلية لا يراها العميل.",
        },
      },
      {
        q: { en: "What happens to conversations when an agent leaves?", ar: "ماذا يحدث للمحادثات عندما يترك موظف العمل؟" },
        a: {
          en: "They stay. Conversations, contact records and notes belong to the workspace, not to the agent's phone, so a departing agent's pipeline stays with you.",
          ar: "تبقى. المحادثات وسجلات جهات الاتصال والملاحظات تخص مساحة العمل، لا هاتف الموظف، فيبقى خط عمل الموظف المغادر لديك.",
        },
      },
      {
        q: { en: "Does the customer see internal notes?", ar: "هل يرى العميل الملاحظات الداخلية؟" },
        a: {
          en: "No. Notes and @mentions are visible only to your team inside the conversation. The customer sees only the messages you send them.",
          ar: "لا. الملاحظات والإشارات مرئية لفريقك فقط داخل المحادثة. يرى العميل الرسائل التي ترسلها إليه فقط.",
        },
      },
      {
        q: { en: "How does the 24-hour WhatsApp window work?", ar: "كيف تعمل نافذة واتساب لمدة 24 ساعة؟" },
        a: {
          en: "After a customer messages you, you can reply freely for 24 hours. The inbox shows a countdown on each chat and warns before it closes; after that, reaching them again needs a Meta-approved template message.",
          ar: "بعد أن يراسلك العميل، يمكنك الرد بحرية لمدة 24 ساعة. يُظهر الصندوق عدّاً تنازلياً على كل محادثة وينبّه قبل الإغلاق؛ بعدها يحتاج الوصول إليه رسالة قالب معتمدة من Meta.",
        },
      },
      {
        q: { en: "Can I stop junior staff from sending broadcasts?", ar: "هل أستطيع منع الموظفين المبتدئين من إرسال حملات البث؟" },
        a: {
          en: "Yes. Broadcasting is a permission. You can give an agent full replying access while keeping campaign sending with supervisors or admins only.",
          ar: "نعم. البث صلاحية. يمكنك منح الموظف صلاحية رد كاملة مع إبقاء إرسال الحملات للمشرفين أو المسؤولين فقط.",
        },
      },
    ],
    related: [
      { href: "/product/botflow-studio", label: { en: "Visual Botflow Studio — automate before the handover", ar: "استوديو مسارات البوت — الأتمتة قبل التحويل" } },
      { href: "/product/broadcast-campaigns", label: { en: "Broadcast & Marketing Campaigns", ar: "حملات البث والتسويق" } },
      { href: "/solutions/clinics-hospitals-health", label: { en: "For clinics & hospitals", ar: "للعيادات والمستشفيات" } },
      { href: "/solutions/tours-safari-musandam", label: { en: "For tour operators", ar: "لمشغّلي الجولات السياحية" } },
    ],
    schemaType: "Product",
  },

  /* ===================================================================== */
  /* 2. Visual Botflow Studio                                               */
  /*    Primary keyword:  WhatsApp chatbot builder                          */
  /*    Secondary:        no-code WhatsApp bot builder · visual WhatsApp    */
  /*                      flow builder · WhatsApp automation Arabic         */
  /* ===================================================================== */
  {
    slug: "botflow-studio",
    primaryKeyword: "WhatsApp chatbot builder",
    secondaryKeywords: [
      "no-code WhatsApp bot builder",
      "visual WhatsApp flow builder",
      "WhatsApp automation Arabic",
    ],
    keywords: [
      "WhatsApp chatbot builder", "no-code WhatsApp bot builder", "visual WhatsApp flow builder",
      "WhatsApp automation Arabic", "drag and drop WhatsApp bot", "WhatsApp conversation flow",
      "WhatsApp bot Oman", "Arabic WhatsApp chatbot", "WhatsApp lead qualification bot",
      "WhatsApp FAQ bot", "WhatsApp bot handover", "conversational AI WhatsApp",
    ],
    metaTitle: {
      en: "Visual WhatsApp Chatbot Builder — No Code | Fizmoh",
      ar: "منشئ شات بوت واتساب المرئي — بدون برمجة | Fizmoh",
    },
    metaDescription: {
      en: "Build WhatsApp bot flows by dragging boxes: buttons, questions, conditions, catalogue steps and guaranteed human handover. Understands Gulf Arabic.",
      ar: "ابنِ مسارات بوت واتساب بالسحب والإفلات: أزرار، أسئلة، شروط، خطوات كتالوج، وتحويل مضمون لموظف. يفهم العربية الخليجية والإنجليزية.",
    },
    eyebrow: { en: "Visual Botflow Studio", ar: "استوديو مسارات البوت المرئي" },
    h1: {
      en: "Build the WhatsApp bot by dragging boxes, not writing code",
      ar: "ابنِ بوت واتساب بسحب الصناديق، لا بكتابة الكود",
    },
    subheadline: {
      en: "A visual builder for WhatsApp conversation flows — buttons, questions, conditions, catalogue steps and handover — that understands Arabic and Gulf dialects and passes the customer to a human the moment it should.",
      ar: "منشئ مرئي لمسارات محادثة واتساب — أزرار، أسئلة، شروط، خطوات كتالوج، وتحويل — يفهم العربية واللهجات الخليجية ويحوّل العميل إلى موظف في اللحظة المناسبة.",
    },
    hero: {
      src: "/marketing/products/botflow-studio.jpg",
      alt: {
        en: "Hands arranging connected flow-node cards on a bright glass wall, lit with a soft green accent",
        ar: "أيادٍ ترتّب بطاقات عُقد مسار متصلة على جدار زجاجي مضيء بإضاءة خضراء ناعمة",
      },
      width: 1280,
      height: 714,
      placeholder: true,
    },
    heroNote: {
      en: "No developer needed · test in the simulator before you publish",
      ar: "لا حاجة لمطوّر · اختبر في المحاكي قبل النشر",
    },
    problems: [
      {
        title: { en: "Every flow change needs a developer", ar: "كل تعديل على المسار يحتاج مطوّراً" },
        body: {
          en: "Marketing wants to add a question or reword a button, and it becomes a ticket, a sprint and a deploy.",
          ar: "يريد التسويق إضافة سؤال أو إعادة صياغة زر، فيتحوّل ذلك إلى تذكرة ومهمة ونشر.",
        },
      },
      {
        title: { en: "Keyword bots that miss the point", ar: "بوتات كلمات مفتاحية تُخطئ المقصود" },
        body: {
          en: "A bot that only matches exact words fails the moment a customer writes the way people actually write — especially in dialect.",
          ar: "البوت الذي يطابق الكلمات حرفياً يفشل لحظة يكتب العميل بالطريقة التي يكتب بها الناس فعلاً — خصوصاً باللهجة.",
        },
      },
      {
        title: { en: "Bots that trap the customer", ar: "بوتات تحبس العميل" },
        body: {
          en: "The worst outcome is a customer stuck in a loop with no way to reach a person. It costs you the sale and the goodwill.",
          ar: "أسوأ نتيجة هي عميل عالق في حلقة مفرغة دون وسيلة للوصول إلى شخص. يكلّفك ذلك البيع وحُسن النية.",
        },
      },
    ],
    useCases: [
      {
        icon: "MessageCircleQuestion",
        title: { en: "Deflect the repeat questions", ar: "تصريف الأسئلة المتكررة" },
        body: {
          en: "Hours, location, prices, delivery areas, booking policy — answered instantly, in Arabic or English, freeing staff for the conversations that need them.",
          ar: "المواعيد، الموقع، الأسعار، مناطق التوصيل، سياسة الحجز — إجابات فورية بالعربية أو الإنجليزية، تحرّر الموظفين للمحادثات التي تحتاجهم.",
        },
      },
      {
        icon: "ListChecks",
        title: { en: "Qualify a lead before a human sees it", ar: "تأهيل العميل المحتمل قبل أن يراه موظف" },
        body: {
          en: "Ask budget, area, size and timeline, write the answers onto the contact record, and route the qualified enquiry to the right team.",
          ar: "اسأل عن الميزانية والمنطقة والحجم والإطار الزمني، ودوّن الإجابات في سجل جهة الاتصال، ووجّه الاستفسار المؤهَّل إلى الفريق المناسب.",
        },
      },
      {
        icon: "CalendarClock",
        title: { en: "Book into live availability", ar: "احجز ضمن التوافر المباشر" },
        body: {
          en: "A booking step offers real open slots, holds one while the customer confirms, and writes it to the calendar.",
          ar: "تعرض خطوة الحجز فترات متاحة حقيقية، وتحجز واحدة ريثما يؤكّد العميل، وتدوّنها في التقويم.",
        },
      },
      {
        icon: "ShoppingCart",
        title: { en: "Show a catalogue and take the order", ar: "اعرض كتالوجاً وخُذ الطلب" },
        body: {
          en: "Drop in a catalogue step so customers browse products, add to a cart and check out without leaving the chat.",
          ar: "أضِف خطوة كتالوج ليتصفح العملاء المنتجات ويضيفوها إلى السلة ويُتمّوا الشراء دون مغادرة المحادثة.",
        },
      },
      {
        icon: "Hand",
        title: { en: "Hand over on demand", ar: "التحويل عند الطلب" },
        body: {
          en: "\"Talk to a person\" is always one tap away, and the conversation reaches the team inbox with everything the bot already collected.",
          ar: "\"التحدث إلى شخص\" على بُعد نقرة دائماً، وتصل المحادثة إلى صندوق الفريق مع كل ما جمعه البوت.",
        },
      },
    ],
    how: [
      {
        title: { en: "Open the canvas", ar: "افتح لوحة العمل" },
        body: {
          en: "Start from a blank flow or one of the industry templates — dining, retail, clinics, tours, agencies.",
          ar: "ابدأ من مسار فارغ أو من أحد قوالب القطاعات — مطاعم، تجزئة، عيادات، جولات، وكالات.",
        },
      },
      {
        title: { en: "Drag in the steps", ar: "اسحب الخطوات" },
        body: {
          en: "Message, buttons, ask-a-question, condition, catalogue, booking, handover. Connect them into the path the conversation should take.",
          ar: "رسالة، أزرار، اطرح سؤالاً، شرط، كتالوج، حجز، تحويل. اربطها في المسار الذي يجب أن تسلكه المحادثة.",
        },
      },
      {
        title: { en: "Test it in the simulator", ar: "اختبره في المحاكي" },
        body: {
          en: "Walk every branch in the interactive simulator — no number connected, no messages sent — and fix the dead ends before a customer finds them.",
          ar: "اسلك كل فرع في المحاكي التفاعلي — دون ربط رقم أو إرسال رسائل — وأصلح الطرق المسدودة قبل أن يجدها عميل.",
        },
      },
      {
        title: { en: "Publish — and keep editing", ar: "انشر — وواصل التعديل" },
        body: {
          en: "Changes go live in seconds, with no redeploy. Every version is kept, so a bad edit is one click to undo.",
          ar: "تُنشر التغييرات خلال ثوانٍ دون إعادة نشر. كل نسخة محفوظة، فالتعديل السيّئ يُتراجع عنه بنقرة.",
        },
      },
    ],
    features: [
      {
        feature: { en: "Drag-and-drop canvas", ar: "لوحة سحب وإفلات" },
        benefit: { en: "The person who owns the customer conversation can change it, without waiting on engineering.", ar: "من يملك محادثة العميل يستطيع تغييرها، دون انتظار قسم الهندسة." },
      },
      {
        feature: { en: "Arabic & Gulf-dialect understanding", ar: "فهم العربية واللهجة الخليجية" },
        benefit: { en: "The bot replies in the language the customer wrote in and understands how people phrase things here.", ar: "يرد البوت بلغة العميل التي كتب بها ويفهم كيف يصوغ الناس كلامهم هنا." },
      },
      {
        feature: { en: "Conditions and branching", ar: "شروط وتفرّعات" },
        benefit: { en: "One flow covers new vs returning, Arabic vs English, in-stock vs waitlist — instead of five near-copies.", ar: "مسار واحد يغطي الجديد مقابل العائد، العربية مقابل الإنجليزية، المتوفر مقابل قائمة الانتظار — بدل خمس نسخ متقاربة." },
      },
      {
        feature: { en: "Built-in simulator preview", ar: "معاينة بمحاكٍ مدمج" },
        benefit: { en: "Dead ends and wrong turns are caught in testing, not in production by a paying customer.", ar: "تُكتشف الطرق المسدودة والمنعطفات الخاطئة في الاختبار، لا في الإنتاج على يد عميل يدفع." },
      },
      {
        feature: { en: "Guaranteed human handover", ar: "تحويل مضمون لموظف" },
        benefit: { en: "No customer is ever trapped, which protects both the sale and your number's quality rating.", ar: "لا يُحبس أي عميل، وهذا يحمي البيع وتقييم جودة رقمك معاً." },
      },
      {
        feature: { en: "Versioned flows", ar: "مسارات ذات إصدارات" },
        benefit: { en: "Experiment freely — every change is reversible and you can see what the flow looked like last week.", ar: "جرّب بحرية — كل تغيير قابل للتراجع ويمكنك رؤية شكل المسار الأسبوع الماضي." },
      },
    ],
    stats: [
      { value: { en: "0", ar: "0" }, label: { en: "lines of code to build a flow", ar: "أسطر برمجية لبناء مسار" } },
      { value: { en: "6+", ar: "+6" }, label: { en: "step types: message, buttons, ask, condition, catalogue, handover", ar: "أنواع خطوات: رسالة، أزرار، سؤال، شرط، كتالوج، تحويل" } },
      { value: { en: "AR + EN", ar: "عربي + إنجليزي" }, label: { en: "understood, including Gulf dialects", ar: "مفهومة، بما في ذلك اللهجات الخليجية" } },
      { value: { en: "Seconds", ar: "ثوانٍ" }, label: { en: "to publish a change — no redeploy", ar: "لنشر تغيير — دون إعادة نشر" } },
    ],
    testimonials: [
      {
        quote: {
          en: "TODO: replace with real client quote — a marketer describing changing a live flow themselves during a campaign, without filing a developer ticket.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — مسوّق يصف تعديله لمسار مباشر بنفسه أثناء حملة، دون فتح تذكرة لمطوّر.",
        },
        name: "",
        role: { en: "Marketing Manager", ar: "مدير التسويق" },
        company: "TODO",
        todo: true,
      },
      {
        quote: {
          en: "TODO: replace with real client quote — an operator describing what the guaranteed handover step changed about customer complaints.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — مشغّل يصف ما غيّرته خطوة التحويل المضمون في شكاوى العملاء.",
        },
        name: "",
        role: { en: "Operations Lead", ar: "مسؤول العمليات" },
        company: "TODO",
        todo: true,
      },
    ],
    faqs: [
      {
        q: { en: "Do I need a developer to build a WhatsApp bot?", ar: "هل أحتاج مطوّراً لبناء بوت واتساب؟" },
        a: {
          en: "No. The whole flow is built by dragging and connecting steps on a canvas. A developer is only needed if you want to connect the bot to an external system through the API.",
          ar: "لا. يُبنى المسار كاملاً بسحب الخطوات وربطها على لوحة عمل. لا تحتاج مطوّراً إلا إذا أردت ربط البوت بنظام خارجي عبر الـ API.",
        },
      },
      {
        q: { en: "Does the bot understand Omani and Gulf Arabic?", ar: "هل يفهم البوت العربية العُمانية والخليجية؟" },
        a: {
          en: "Yes. It is built for Gulf dialects and Modern Standard Arabic as well as English, and it answers in whichever language the customer used.",
          ar: "نعم. مبنيّ للّهجات الخليجية والعربية الفصحى إضافة إلى الإنجليزية، ويرد باللغة التي استخدمها العميل.",
        },
      },
      {
        q: { en: "Can a customer always reach a human?", ar: "هل يستطيع العميل دائماً الوصول إلى موظف؟" },
        a: {
          en: "Yes. A handover step is available at any point in the flow, and \"talk to a person\" moves the conversation straight to your team inbox with the full history.",
          ar: "نعم. خطوة التحويل متاحة في أي نقطة من المسار، و\"التحدث إلى شخص\" تنقل المحادثة مباشرة إلى صندوق فريقك مع كامل السجل.",
        },
      },
      {
        q: { en: "Can I test a flow before customers see it?", ar: "هل أستطيع اختبار مسار قبل أن يراه العملاء؟" },
        a: {
          en: "Yes — the Interactive WhatsApp Simulator runs your actual flow with no number connected and no messages sent, so you can walk every branch first.",
          ar: "نعم — يشغّل محاكي واتساب التفاعلي مسارك الفعلي دون ربط رقم أو إرسال رسائل، فتسلك كل فرع أولاً.",
        },
      },
      {
        q: { en: "What happens when I edit a flow that is already live?", ar: "ماذا يحدث عندما أعدّل مساراً مباشراً بالفعل؟" },
        a: {
          en: "The new version takes effect within seconds for conversations that start after you publish. Conversations already in progress finish on the version they started.",
          ar: "تسري النسخة الجديدة خلال ثوانٍ على المحادثات التي تبدأ بعد النشر. تُكمل المحادثات الجارية على النسخة التي بدأت بها.",
        },
      },
    ],
    related: [
      { href: "/product/simulator", label: { en: "Interactive WhatsApp Simulator — test every branch", ar: "محاكي واتساب التفاعلي — اختبر كل فرع" } },
      { href: "/product/team-inbox", label: { en: "Multi-Agent Team Inbox — where handovers land", ar: "صندوق الفريق متعدد الموظفين — حيث تصل التحويلات" } },
      { href: "/solutions/restaurants-dining", label: { en: "For restaurants & dining", ar: "للمطاعم والمقاهي" } },
      { href: "/solutions/ecommerce-online-stores", label: { en: "For ecommerce & online stores", ar: "للتجارة الإلكترونية والمتاجر" } },
    ],
    schemaType: "Product",
  },

  /* ===================================================================== */
  /* 3. Broadcast & Marketing Campaigns                                     */
  /*    Primary keyword:  WhatsApp broadcast campaigns                      */
  /*    Secondary:        WhatsApp bulk messaging · Meta-approved WhatsApp  */
  /*                      templates · WhatsApp marketing Oman               */
  /* ===================================================================== */
  {
    slug: "broadcast-campaigns",
    primaryKeyword: "WhatsApp broadcast campaigns",
    secondaryKeywords: [
      "WhatsApp bulk messaging",
      "Meta-approved WhatsApp templates",
      "WhatsApp marketing Oman",
    ],
    keywords: [
      "WhatsApp broadcast campaigns", "WhatsApp bulk messaging", "Meta-approved WhatsApp templates",
      "WhatsApp marketing Oman", "WhatsApp promotional messages", "WhatsApp broadcast without group",
      "WhatsApp campaign software", "WhatsApp open rate", "WhatsApp opt-in marketing",
      "WhatsApp segments", "WhatsApp template messages", "WhatsApp marketing GCC",
    ],
    metaTitle: {
      en: "WhatsApp Broadcast Campaigns — Bulk, Not a Group | Fizmoh",
      ar: "حملات بث واتساب — إرسال جماعي وليس مجموعة | Fizmoh",
    },
    metaDescription: {
      en: "Send Meta-approved WhatsApp campaigns to your opted-in list, individually and never a group, with delivery and read receipts, segments and opt-out handling.",
      ar: "أرسل حملات واتساب معتمدة من Meta إلى قائمتك الموافِقة — فردياً، وليس كمجموعة — مع إيصالات التسليم والقراءة، وشرائح، ومعالجة تلقائية لإلغاء الاشتراك.",
    },
    eyebrow: { en: "Broadcast & Marketing Campaigns", ar: "حملات البث والتسويق" },
    h1: {
      en: "Send one message to thousands — and see who read it",
      ar: "أرسل رسالة واحدة للآلاف — واعرف من قرأها",
    },
    subheadline: {
      en: "Meta-approved template campaigns to your opted-in WhatsApp audience, sent individually and never as a group, with delivery and read receipts, segments and opt-out handling built in.",
      ar: "حملات قوالب معتمدة من Meta إلى جمهورك الموافِق على واتساب، تُرسل فردياً لا كمجموعة، مع إيصالات التسليم والقراءة، وشرائح، ومعالجة إلغاء الاشتراك مدمجة.",
    },
    hero: {
      src: "/marketing/products/broadcast-campaigns.jpg",
      alt: {
        en: "Overhead view of a phone, Arabic coffee and a notebook with a hand-sketched marketing funnel on a warm desk",
        ar: "منظر علوي لهاتف وقهوة عربية ودفتر عليه رسم يدوي لقمع تسويقي على مكتب بلون دافئ",
      },
      width: 1280,
      height: 714,
      placeholder: true,
    },
    heroNote: {
      en: "Consent tracked automatically · opt-outs honoured on their own",
      ar: "تُتابَع الموافقة تلقائياً · تُحترم طلبات إلغاء الاشتراك من تلقاء نفسها",
    },
    problems: [
      {
        title: { en: "Email open rates keep falling", ar: "معدلات فتح البريد تستمر بالانخفاض" },
        body: {
          en: "A promotion sent by email is filtered, buried or ignored, and you rarely find out which.",
          ar: "العرض المُرسل بالبريد يُفلتر أو يُدفن أو يُتجاهل، ونادراً ما تعرف أيّها حصل.",
        },
      },
      {
        title: { en: "Broadcast groups leak every number", ar: "مجموعات البث تكشف كل رقم" },
        body: {
          en: "A WhatsApp group shows every customer's number to every other customer, and anyone can reply to the whole list. It is not a marketing channel.",
          ar: "تُظهر مجموعة واتساب رقم كل عميل لبقية العملاء، ويستطيع أيّ أحد الرد على القائمة كاملة. إنها ليست قناة تسويق.",
        },
      },
      {
        title: { en: "No record of who agreed to be messaged", ar: "لا سجل لمن وافق على المراسلة" },
        body: {
          en: "Campaigns go out with no log of who opted in, when or through what — which is the first thing anyone asks when a complaint is made.",
          ar: "تُرسل الحملات دون سجل لمن وافق ومتى وعبر ماذا — وهو أول ما يُسأل عنه عند تقديم شكوى.",
        },
      },
    ],
    useCases: [
      {
        icon: "Megaphone",
        title: { en: "A promotion to the right segment", ar: "عرض ترويجي للشريحة المناسبة" },
        body: {
          en: "Send a new-arrival or offer campaign to a segment — past buyers of a category, a city, a tier — not the whole list.",
          ar: "أرسل حملة وصول جديد أو عرض إلى شريحة — مشترون سابقون لفئة، مدينة، مستوى — لا إلى القائمة كاملة.",
        },
      },
      {
        icon: "PackageCheck",
        title: { en: "Back-in-stock to people who asked", ar: "\"عاد للتوفر\" لمن سأل" },
        body: {
          en: "When an item returns, message only the customers who registered interest — a campaign that converts because it was wanted.",
          ar: "عندما يعود صنف، راسل فقط العملاء الذين سجّلوا اهتمامهم — حملة تحوّل لأنها كانت مطلوبة.",
        },
      },
      {
        icon: "BellRing",
        title: { en: "Booking and appointment reminders", ar: "تذكيرات الحجوزات والمواعيد" },
        body: {
          en: "Utility templates deliver reminders on a channel people actually read, cutting no-shows without a phone call.",
          ar: "تُسلّم قوالب الخدمة التذكيرات على قناة يقرؤها الناس فعلاً، فتقلّل عدم الحضور دون مكالمة هاتفية.",
        },
      },
      {
        icon: "Repeat",
        title: { en: "Win back a quiet segment", ar: "استعادة شريحة هادئة" },
        body: {
          en: "Target customers who have not ordered in 90 days with a single, honest re-engagement message.",
          ar: "استهدف العملاء الذين لم يطلبوا منذ 90 يوماً برسالة إعادة تفاعل واحدة وصادقة.",
        },
      },
      {
        icon: "FileCheck2",
        title: { en: "A library of pre-approved templates", ar: "مكتبة قوالب معتمدة مسبقاً" },
        body: {
          en: "Keep your reminders, receipts and offers as Meta-approved templates so a campaign is not held up waiting for review.",
          ar: "احتفظ بتذكيراتك وإيصالاتك وعروضك كقوالب معتمدة من Meta، فلا تتعطّل الحملة بانتظار المراجعة.",
        },
      },
    ],
    how: [
      {
        title: { en: "Build the audience", ar: "ابنِ الجمهور" },
        body: {
          en: "Filter your contacts by tags, purchase history, city or loyalty tier into a segment. Only opted-in contacts are eligible.",
          ar: "صفِّ جهات اتصالك بالوسوم أو سجل الشراء أو المدينة أو مستوى الولاء إلى شريحة. المؤهَّلون هم الموافقون فقط.",
        },
      },
      {
        title: { en: "Choose or submit a template", ar: "اختر قالباً أو قدّمه" },
        body: {
          en: "Pick an approved template or submit a new one to Meta. The manager flags issues that cause rejection before you send.",
          ar: "اختر قالباً معتمداً أو قدّم جديداً إلى Meta. يشير المدير إلى المشكلات التي تسبّب الرفض قبل الإرسال.",
        },
      },
      {
        title: { en: "Send individually", ar: "أرسل فردياً" },
        body: {
          en: "Every recipient gets a one-to-one message. No group, no shared thread, no exposed numbers.",
          ar: "يتلقى كل مستلم رسالة فردية. لا مجموعة، ولا محادثة مشتركة، ولا أرقام مكشوفة.",
        },
      },
      {
        title: { en: "Watch it land", ar: "راقب وصولها" },
        body: {
          en: "See delivered and read counts as they come in. Replies open a 24-hour window; opt-outs are removed automatically.",
          ar: "شاهد أعداد المُسلَّم والمقروء وهي تَرِد. تفتح الردود نافذة 24 ساعة؛ وتُزال طلبات إلغاء الاشتراك تلقائياً.",
        },
      },
    ],
    features: [
      {
        feature: { en: "One-to-one delivery", ar: "تسليم فردي" },
        benefit: { en: "No customer sees another's number, and nobody can reply-all to your list.", ar: "لا يرى أي عميل رقم غيره، ولا يستطيع أحد الرد على القائمة كاملة." },
      },
      {
        feature: { en: "Segments and audience filters", ar: "شرائح ومرشّحات جمهور" },
        benefit: { en: "The offer reaches the people likely to want it, so your mute and block rates stay low.", ar: "يصل العرض إلى من يرجّح أن يريده، فتبقى معدلات الكتم والحظر منخفضة." },
      },
      {
        feature: { en: "Delivery and read receipts", ar: "إيصالات التسليم والقراءة" },
        benefit: { en: "You know what actually landed and what was read — numbers email cannot give you.", ar: "تعرف ما وصل فعلاً وما قُرئ — أرقام لا يمنحها البريد." },
      },
      {
        feature: { en: "Consent log", ar: "سجل الموافقة" },
        benefit: { en: "Every opt-in and opt-out is recorded with its source and time, answerable in one screen.", ar: "تُسجَّل كل موافقة وإلغاء بمصدرها ووقتها، ويمكن عرضها في شاشة واحدة." },
      },
      {
        feature: { en: "Template manager", ar: "مدير القوالب" },
        benefit: { en: "Rejections are caught in draft, not at send time when the campaign is already scheduled.", ar: "تُكتشف حالات الرفض في المسودة، لا وقت الإرسال بعد جدولة الحملة." },
      },
      {
        feature: { en: "Automatic opt-out handling", ar: "معالجة تلقائية لإلغاء الاشتراك" },
        benefit: { en: "\"Stop\" is honoured instantly and permanently, which protects your number's quality rating.", ar: "تُحترم كلمة \"إيقاف\" فوراً ونهائياً، وهذا يحمي تقييم جودة رقمك." },
      },
    ],
    stats: [
      { value: { en: "~90–98%", ar: "~90–98%" }, label: { en: "typical WhatsApp message open rate", ar: "متوسط معدل فتح رسائل واتساب" }, estimate: true },
      { value: { en: "~20%", ar: "~20%" }, label: { en: "typical marketing email open rate, for comparison", ar: "متوسط معدل فتح بريد التسويق، للمقارنة" }, estimate: true },
      { value: { en: "1:1", ar: "1:1" }, label: { en: "every broadcast sent individually", ar: "كل حملة بث تُرسل فردياً" } },
      { value: { en: "24h", ar: "24 ساعة" }, label: { en: "free reply window opened by every reply", ar: "نافذة رد مجانية يفتحها كل رد" } },
    ],
    testimonials: [
      {
        quote: {
          en: "TODO: replace with real client quote — a retailer comparing a WhatsApp drop campaign against the same message sent by email or Instagram Story.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — تاجر تجزئة يقارن حملة إطلاق على واتساب بالرسالة نفسها عبر البريد أو ستوري إنستغرام.",
        },
        name: "",
        role: { en: "Retail Marketing Lead", ar: "مسؤول تسويق التجزئة" },
        company: "TODO",
        todo: true,
      },
      {
        quote: {
          en: "TODO: replace with real client quote — an operator describing how the consent log helped when a customer complaint was raised.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — مشغّل يصف كيف ساعد سجل الموافقة عند تقديم شكوى من عميل.",
        },
        name: "",
        role: { en: "Founder", ar: "المؤسس" },
        company: "TODO",
        todo: true,
      },
    ],
    faqs: [
      {
        q: { en: "How is this different from a WhatsApp broadcast group?", ar: "كيف يختلف هذا عن مجموعة بث واتساب؟" },
        a: {
          en: "A group exposes every member's number and lets anyone reply to everyone. Campaigns here are sent as individual one-to-one messages, and every send is recorded against consent.",
          ar: "المجموعة تكشف رقم كل عضو وتتيح لأي أحد الرد على الجميع. الحملات هنا تُرسل كرسائل فردية، وكل إرسال مُسجَّل مقابل الموافقة.",
        },
      },
      {
        q: { en: "Is the 98% WhatsApp open rate real?", ar: "هل معدل فتح واتساب 98% حقيقي؟" },
        a: {
          en: "It is an industry-cited figure, not a number we measured for your account. WhatsApp is consistently opened far more than marketing email — commonly quoted between 90% and 98% — but treat the exact percentage as an estimate.",
          ar: "إنه رقم متداول في القطاع، وليس رقماً قِسناه لحسابك. يُفتح واتساب باستمرار أكثر بكثير من بريد التسويق — يُذكر عادة بين 90% و98% — لكن اعتبر النسبة الدقيقة تقديراً.",
        },
      },
      {
        q: { en: "Do I need opt-in to send WhatsApp campaigns?", ar: "هل أحتاج موافقة لإرسال حملات واتساب؟" },
        a: {
          en: "Yes, and it is enforced more strictly than for SMS or email. Sending to people who did not opt in lowers your number's quality rating and can get it restricted.",
          ar: "نعم، ويُطبَّق ذلك بصرامة أكبر من الرسائل القصيرة أو البريد. الإرسال لمن لم يوافق يخفض تقييم جودة رقمك وقد يُقيّده.",
        },
      },
      {
        q: { en: "What is a Meta-approved template message?", ar: "ما هي رسالة القالب المعتمدة من Meta؟" },
        a: {
          en: "Any message you send outside the 24-hour window must use a template that Meta has reviewed and approved for a category — marketing, utility or authentication. The template manager handles submission and tracks status.",
          ar: "أي رسالة تُرسلها خارج نافذة 24 ساعة يجب أن تستخدم قالباً راجعته Meta واعتمدته لفئة — تسويق أو خدمة أو مصادقة. يتولّى مدير القوالب التقديم ومتابعة الحالة.",
        },
      },
      {
        q: { en: "What happens if someone replies to a campaign?", ar: "ماذا يحدث إذا رد أحدهم على حملة؟" },
        a: {
          en: "The reply opens a 24-hour window and lands in your team inbox as a normal conversation, assigned by your routing rules.",
          ar: "يفتح الرد نافذة 24 ساعة ويصل إلى صندوق فريقك كمحادثة عادية، مُسندة حسب قواعد التوجيه.",
        },
      },
      {
        q: { en: "Can I schedule campaigns in advance?", ar: "هل أستطيع جدولة الحملات مسبقاً؟" },
        a: {
          en: "Yes. Build the audience and template, then set a send time. You can also stagger sends to manage inbound reply volume.",
          ar: "نعم. ابنِ الجمهور والقالب، ثم حدّد وقت الإرسال. يمكنك أيضاً توزيع الإرسال على دفعات لإدارة حجم الردود الواردة.",
        },
      },
    ],
    related: [
      { href: "/product/team-inbox", label: { en: "Multi-Agent Team Inbox — handle the replies", ar: "صندوق الفريق متعدد الموظفين — تعامل مع الردود" } },
      { href: "/product/payments", label: { en: "AmwalPay Online Payments — close in the reply", ar: "مدفوعات أموال باي — أتمم البيع في الرد" } },
      { href: "/solutions/fashion-perfumes-retail", label: { en: "For fashion, perfumes & retail", ar: "للأزياء والعطور والتجزئة" } },
      { href: "/solutions/supermarkets-marts", label: { en: "For supermarkets & marts", ar: "للأسواق والتموينات" } },
    ],
    schemaType: "Product",
  },

  /* ===================================================================== */
  /* 4. AmwalPay Online Payments                                            */
  /*    Primary keyword:  WhatsApp payment link                             */
  /*    Secondary:        accept card payments on WhatsApp · AmwalPay       */
  /*                      integration · WhatsApp invoicing Oman             */
  /*                                                                        */
  /*    TODO(ops): AmwalPay currently runs on a shared sandbox merchant.    */
  /*    Confirm per-workspace merchant go-live and settlement status        */
  /*    before promoting live pricing/among production claims.              */
  /* ===================================================================== */
  {
    slug: "payments",
    primaryKeyword: "WhatsApp payment link",
    secondaryKeywords: [
      "accept card payments on WhatsApp",
      "AmwalPay integration",
      "WhatsApp invoicing Oman",
    ],
    keywords: [
      "WhatsApp payment link", "accept card payments on WhatsApp", "AmwalPay integration",
      "WhatsApp invoicing Oman", "WhatsApp checkout OMR", "in-chat payment WhatsApp",
      "WhatsApp payment gateway GCC", "WhatsApp automated invoices", "AmwalPay WhatsApp",
      "pay by card WhatsApp Oman", "WhatsApp deposit link", "WhatsApp payment reconciliation",
    ],
    metaTitle: {
      en: "WhatsApp Payment Links — AmwalPay Card Checkout (OMR) | Fizmoh",
      ar: "روابط دفع واتساب — دفع بالبطاقة عبر أموال باي (ر.ع) | Fizmoh",
    },
    metaDescription: {
      en: "Send an AmwalPay card checkout link inside the WhatsApp chat and get paid in Omani Rial. Automated invoices and signed-callback verification, no screenshots.",
      ar: "أرسل رابط دفع بالبطاقة من أموال باي داخل محادثة واتساب واستلم بالريال العماني. فواتير تلقائية، تحقق بردّ موقّع، وتسوية آلية.",
    },
    eyebrow: { en: "AmwalPay Online Payments", ar: "مدفوعات أموال باي" },
    h1: {
      en: "Send a card checkout link inside the chat, get paid in Omani Rial",
      ar: "أرسل رابط دفع بالبطاقة داخل المحادثة، واستلم بالريال العماني",
    },
    subheadline: {
      en: "Native AmwalPay card checkout and automated invoices in WhatsApp — the customer pays without leaving the conversation, and the payment is confirmed by a signed callback, not a screenshot.",
      ar: "دفع بالبطاقة من أموال باي وفواتير تلقائية داخل واتساب — يدفع العميل دون مغادرة المحادثة، ويُؤكَّد الدفع بردّ موقّع لا بلقطة شاشة.",
    },
    hero: {
      src: "/marketing/products/payments.jpg",
      alt: {
        en: "A customer's hands holding a bank card and a phone to complete a payment at a small Omani boutique counter",
        ar: "يدا عميل تحملان بطاقة بنكية وهاتفاً لإتمام دفعة عند طاولة متجر صغير في عمان",
      },
      width: 1280,
      height: 714,
      placeholder: true,
    },
    heroNote: {
      en: "Payments in OMR · card and bank transfer · no screenshot forensics",
      ar: "مدفوعات بالريال العماني · بطاقة وتحويل بنكي · بلا تدقيق لقطات الشاشة",
    },
    problems: [
      {
        title: { en: "Verifying transfers by screenshot", ar: "التحقق من التحويلات بلقطة شاشة" },
        body: {
          en: "Staff squint at a blurry receipt image, check it against the bank app, and hope it is not edited. It does not scale and it is not safe.",
          ar: "يحدّق الموظفون في صورة إيصال ضبابية، ويطابقونها مع تطبيق البنك، ويأملون ألا تكون معدّلة. لا يتوسّع ذلك وليس آمناً.",
        },
      },
      {
        title: { en: "Customers drop off at the redirect", ar: "يتسرّب العملاء عند إعادة التوجيه" },
        body: {
          en: "Send someone from a warm WhatsApp chat to a separate payment website and a share of them never come back.",
          ar: "أرسِل أحداً من محادثة واتساب دافئة إلى موقع دفع منفصل، ولن يعود جزء منهم أبداً.",
        },
      },
      {
        title: { en: "The payment is disconnected from the order", ar: "الدفعة منفصلة عن الطلب" },
        body: {
          en: "Money lands in the bank, the order sits in another system, and someone reconciles the two by hand at the end of the day.",
          ar: "يصل المال إلى البنك، ويبقى الطلب في نظام آخر، ويطابق أحدهم الاثنين يدوياً نهاية اليوم.",
        },
      },
    ],
    useCases: [
      {
        icon: "CreditCard",
        title: { en: "A pay-now link for an order", ar: "رابط ادفع الآن لطلب" },
        body: {
          en: "Turn a confirmed order into a card checkout link the customer taps and completes inside WhatsApp, in OMR.",
          ar: "حوّل طلباً مؤكَّداً إلى رابط دفع بالبطاقة ينقر عليه العميل ويُتمّه داخل واتساب، بالريال العماني.",
        },
      },
      {
        icon: "CalendarCheck",
        title: { en: "A deposit link to hold a booking", ar: "رابط عربون لحجز" },
        body: {
          en: "Take a partial payment to confirm an appointment, a table or a tour seat, and record it against the booking.",
          ar: "خذ دفعة جزئية لتأكيد موعد أو طاولة أو مقعد جولة، وسجّلها مقابل الحجز.",
        },
      },
      {
        icon: "FileText",
        title: { en: "Automated invoices with a due date", ar: "فواتير تلقائية بتاريخ استحقاق" },
        body: {
          en: "Issue an invoice in the conversation, with the balance and due date, and a reminder before it lapses.",
          ar: "أصدر فاتورة في المحادثة، مع الرصيد وتاريخ الاستحقاق، وتذكيراً قبل انتهائه.",
        },
      },
      {
        icon: "RefreshCcw",
        title: { en: "Reconciliation that happens itself", ar: "تسوية تحدث من تلقاء نفسها" },
        body: {
          en: "When AmwalPay's signed callback confirms the payment, the order is marked paid automatically — no manual matching.",
          ar: "عندما يؤكّد ردّ أموال باي الموقّع الدفعة، يُعلَّم الطلب مدفوعاً تلقائياً — دون مطابقة يدوية.",
        },
      },
      {
        icon: "Landmark",
        title: { en: "Bank transfer as a fallback", ar: "التحويل البنكي كخيار بديل" },
        body: {
          en: "Customers without a card can still pay: they upload a receipt in the chat and your staff verify it against the order.",
          ar: "يستطيع العملاء بلا بطاقة الدفع أيضاً: يرفعون إيصالاً في المحادثة ويتحقق موظفوك منه مقابل الطلب.",
        },
      },
    ],
    how: [
      {
        title: { en: "Create the order or invoice in the chat", ar: "أنشئ الطلب أو الفاتورة في المحادثة" },
        body: {
          en: "Build it from the conversation — items, amount, due date — so the payment request and the order are the same record.",
          ar: "أنشئها من المحادثة — الأصناف، المبلغ، تاريخ الاستحقاق — فيكون طلب الدفع والطلب سجلاً واحداً.",
        },
      },
      {
        title: { en: "The customer taps the AmwalPay link", ar: "ينقر العميل رابط أموال باي" },
        body: {
          en: "A hosted card checkout opens in OMR. They pay without installing anything or leaving the conversation for long.",
          ar: "تُفتح صفحة دفع مستضافة بالريال العماني. يدفع العميل دون تثبيت شيء أو مغادرة المحادثة طويلاً.",
        },
      },
      {
        title: { en: "A signed callback confirms it", ar: "يؤكّده ردّ موقّع" },
        body: {
          en: "AmwalPay sends back a cryptographically signed result. That — not a screenshot — is what marks the payment received.",
          ar: "يرسل أموال باي نتيجة موقّعة تشفيرياً. هذا — لا لقطة الشاشة — هو ما يُعلّم استلام الدفعة.",
        },
      },
      {
        title: { en: "The order updates and a receipt is sent", ar: "يُحدَّث الطلب ويُرسل إيصال" },
        body: {
          en: "The order status changes to paid on its own, and the customer gets a receipt in the same conversation.",
          ar: "تتغيّر حالة الطلب إلى مدفوع تلقائياً، ويحصل العميل على إيصال في المحادثة نفسها.",
        },
      },
    ],
    features: [
      {
        feature: { en: "In-chat card checkout", ar: "دفع بالبطاقة داخل المحادثة" },
        benefit: { en: "Fewer drop-offs than sending the customer to a separate site and hoping they return.", ar: "تسرّب أقل من إرسال العميل إلى موقع منفصل وأمل عودته." },
      },
      {
        feature: { en: "Signed-callback verification", ar: "تحقق بردّ موقّع" },
        benefit: { en: "No staff time spent inspecting receipt images, and no edited screenshot gets through.", ar: "لا وقت موظفين يُهدر في فحص صور الإيصالات، ولا تمرّ لقطة شاشة معدّلة." },
      },
      {
        feature: { en: "Automatic reconciliation", ar: "تسوية تلقائية" },
        benefit: { en: "The order marks itself paid, so the end-of-day matching job disappears.", ar: "يُعلّم الطلب نفسه مدفوعاً، فتختفي مهمة المطابقة نهاية اليوم." },
      },
      {
        feature: { en: "OMR-native pricing", ar: "تسعير بالريال العماني" },
        benefit: { en: "Customers see the amount in the currency they think in, with no conversion surprise.", ar: "يرى العملاء المبلغ بالعملة التي يفكّرون بها، دون مفاجأة تحويل." },
      },
      {
        feature: { en: "Invoice automation", ar: "أتمتة الفواتير" },
        benefit: { en: "Deposits and balances are chased by the system, not by a person on the phone.", ar: "يتابع النظام العربون والأرصدة، لا شخص على الهاتف." },
      },
      {
        feature: { en: "Bank-transfer path with receipt upload", ar: "مسار تحويل بنكي مع رفع إيصال" },
        benefit: { en: "Customers who do not use cards are still served, with a verification step your staff control.", ar: "يُخدم العملاء الذين لا يستخدمون البطاقات أيضاً، بخطوة تحقق يتحكم بها موظفوك." },
      },
    ],
    stats: [
      { value: { en: "OMR", ar: "ر.ع" }, label: { en: "native checkout currency", ar: "عملة الدفع الأصلية" } },
      { value: { en: "0", ar: "0" }, label: { en: "screenshots needed to verify a card payment", ar: "لقطات شاشة مطلوبة للتحقق من دفعة بطاقة" } },
      { value: { en: "Signed", ar: "موقّع" }, label: { en: "cryptographic callback on every card payment", ar: "ردّ تشفيري على كل دفعة بطاقة" } },
      { value: { en: "2", ar: "2" }, label: { en: "payment methods: card and bank transfer", ar: "طريقتا دفع: بطاقة وتحويل بنكي" } },
    ],
    testimonials: [
      {
        quote: {
          en: "TODO: replace with real client quote — an owner describing the change from verifying transfer screenshots to automatic confirmation.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — صاحب عمل يصف التحوّل من التحقق من لقطات التحويل إلى التأكيد التلقائي.",
        },
        name: "",
        role: { en: "Owner", ar: "المالك" },
        company: "TODO",
        todo: true,
      },
      {
        quote: {
          en: "TODO: replace with real client quote — a finance lead describing what auto-reconciliation did to the end-of-day close.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — مسؤول مالية يصف ما فعلته التسوية التلقائية بإقفال نهاية اليوم.",
        },
        name: "",
        role: { en: "Finance Lead", ar: "مسؤول المالية" },
        company: "TODO",
        todo: true,
      },
    ],
    faqs: [
      {
        q: { en: "What currency are payments taken in?", ar: "بأي عملة تُستلم المدفوعات؟" },
        a: {
          en: "Omani Rial. The AmwalPay hosted checkout shows the amount in OMR, so there is no conversion for a local customer to second-guess.",
          ar: "الريال العماني. تعرض صفحة أموال باي المستضافة المبلغ بالريال العماني، فلا يوجد تحويل يشكّ فيه العميل المحلي.",
        },
      },
      {
        q: { en: "How is a card payment confirmed?", ar: "كيف تُؤكَّد دفعة البطاقة؟" },
        a: {
          en: "By a cryptographically signed callback from AmwalPay. The order is marked paid from that signal, not from a customer sending a screenshot.",
          ar: "بردّ موقّع تشفيرياً من أموال باي. يُعلَّم الطلب مدفوعاً من تلك الإشارة، لا من إرسال العميل لقطة شاشة.",
        },
      },
      {
        q: { en: "Can customers pay without leaving WhatsApp?", ar: "هل يستطيع العملاء الدفع دون مغادرة واتساب؟" },
        a: {
          en: "They tap a link and complete a short hosted checkout, then return to the same conversation where the receipt appears. There is no separate app to install.",
          ar: "ينقرون رابطاً ويُتمّون صفحة دفع مستضافة قصيرة، ثم يعودون إلى المحادثة نفسها حيث يظهر الإيصال. لا يوجد تطبيق منفصل للتثبيت.",
        },
      },
      {
        q: { en: "What about customers who do not have a card?", ar: "ماذا عن العملاء الذين لا يملكون بطاقة؟" },
        a: {
          en: "They can pay by bank transfer and upload the receipt in the chat. Your staff verify it against the order before it is marked paid.",
          ar: "يمكنهم الدفع بتحويل بنكي ورفع الإيصال في المحادثة. يتحقق موظفوك منه مقابل الطلب قبل تعليمه مدفوعاً.",
        },
      },
      {
        q: { en: "Does the order update automatically when it is paid?", ar: "هل يُحدَّث الطلب تلقائياً عند دفعه؟" },
        a: {
          en: "For card payments, yes — the signed callback marks the order paid and sends the receipt without staff involvement. Bank transfers wait on your verification step.",
          ar: "لمدفوعات البطاقة، نعم — يُعلّم الردّ الموقّع الطلب مدفوعاً ويرسل الإيصال دون تدخل موظف. تنتظر التحويلات البنكية خطوة تحققك.",
        },
      },
    ],
    related: [
      { href: "/product/broadcast-campaigns", label: { en: "Broadcast & Marketing Campaigns", ar: "حملات البث والتسويق" } },
      { href: "/product/team-inbox", label: { en: "Multi-Agent Team Inbox", ar: "صندوق الفريق متعدد الموظفين" } },
      { href: "/solutions/tours-safari-musandam", label: { en: "For tours & Musandam operators", ar: "لمشغّلي الجولات ومسندم" } },
      { href: "/solutions/restaurants-dining", label: { en: "For restaurants & dining", ar: "للمطاعم والمقاهي" } },
    ],
    schemaType: "Product",
  },

  /* ===================================================================== */
  /* 5. Interactive WhatsApp Simulator                                      */
  /*    Primary keyword:  WhatsApp bot simulator                            */
  /*    Secondary:        test WhatsApp flows · WhatsApp chatbot preview ·  */
  /*                      WhatsApp Business demo                            */
  /* ===================================================================== */
  {
    slug: "simulator",
    primaryKeyword: "WhatsApp bot simulator",
    secondaryKeywords: [
      "test WhatsApp flows",
      "WhatsApp chatbot preview",
      "WhatsApp Business demo",
    ],
    keywords: [
      "WhatsApp bot simulator", "test WhatsApp flows", "WhatsApp chatbot preview",
      "WhatsApp Business demo", "WhatsApp flow testing tool", "try WhatsApp bot",
      "WhatsApp simulator Oman", "WhatsApp bot QA", "interactive WhatsApp demo",
      "WhatsApp buttons list message preview", "WhatsApp bot sandbox",
    ],
    metaTitle: {
      en: "Interactive WhatsApp Bot Simulator — Test Before You Send | Fizmoh",
      ar: "محاكي واتساب التفاعلي — اختبر قبل الإرسال | Fizmoh",
    },
    metaDescription: {
      en: "Run your real WhatsApp bot flow in an interactive simulator: buttons, lists, catalogue steps and handover, with no number connected and nothing sent.",
      ar: "شغّل مسار بوت واتساب الفعلي في محاكٍ تفاعلي — أزرار، قوائم، خطوات كتالوج، تحويل — دون ربط رقم أو إرسال رسائل. جرّبه مجاناً.",
    },
    eyebrow: { en: "Interactive WhatsApp Simulator", ar: "محاكي واتساب التفاعلي" },
    h1: {
      en: "Try a real WhatsApp bot flow before you send a single message",
      ar: "جرّب مسار بوت واتساب حقيقياً قبل أن ترسل رسالة واحدة",
    },
    subheadline: {
      en: "An interactive simulator that runs your actual bot flows — buttons, lists, catalogue steps, handover — exactly as a customer would see them, with no number connected and nothing sent.",
      ar: "محاكٍ تفاعلي يشغّل مسارات البوت الفعلية — أزرار، قوائم، خطوات كتالوج، تحويل — تماماً كما يراها العميل، دون ربط رقم ودون إرسال شيء.",
    },
    hero: {
      src: "/marketing/products/simulator.jpg",
      alt: {
        en: "A single smartphone on a clean light desk with a soft green glow behind it and a hand reaching to tap the screen",
        ar: "هاتف واحد على مكتب فاتح نظيف بوهج أخضر ناعم خلفه، ويد تمتد للنقر على الشاشة",
      },
      width: 1280,
      height: 714,
      placeholder: true,
    },
    heroNote: {
      en: "No number to connect · nothing sent · about five minutes from signup",
      ar: "لا رقم للربط · لا شيء يُرسل · نحو خمس دقائق من التسجيل",
    },
    problems: [
      {
        title: { en: "You find the dead end in production", ar: "تكتشف الطريق المسدود في الإنتاج" },
        body: {
          en: "A flow that looked fine on the canvas loops or stalls the first time a real customer takes an unexpected turn.",
          ar: "مسار بدا سليماً على اللوحة يدور أو يتوقف أول مرة يسلك فيها عميل حقيقي منعطفاً غير متوقع.",
        },
      },
      {
        title: { en: "Demos are slideware", ar: "العروض مجرد شرائح" },
        body: {
          en: "Showing a client \"how the bot will work\" with screenshots is not the same as letting them tap the buttons.",
          ar: "عرض \"كيف سيعمل البوت\" لعميل بلقطات شاشة ليس كأن تدعه ينقر الأزرار.",
        },
      },
      {
        title: { en: "QA on a real phone is slow", ar: "الاختبار على هاتف حقيقي بطيء" },
        body: {
          en: "Testing every branch by messaging a live number burns template costs and clutters a real inbox.",
          ar: "اختبار كل فرع بمراسلة رقم مباشر يستهلك تكاليف القوالب ويشوّش صندوقاً حقيقياً.",
        },
      },
    ],
    useCases: [
      {
        icon: "Eye",
        title: { en: "Preview a flow you are building", ar: "عاين مساراً تبنيه" },
        body: {
          en: "Switch from the canvas to the simulator and see the conversation the way the customer will, step by step.",
          ar: "انتقل من اللوحة إلى المحاكي وشاهد المحادثة كما سيراها العميل، خطوة بخطوة.",
        },
      },
      {
        icon: "Presentation",
        title: { en: "Demo it live to a stakeholder", ar: "اعرضه مباشرة لصاحب قرار" },
        body: {
          en: "Hand a manager or a client the simulator and let them drive — a far stronger sell than a deck.",
          ar: "سلّم مديراً أو عميلاً المحاكي ودعه يقوده — إقناع أقوى بكثير من عرض تقديمي.",
        },
      },
      {
        icon: "GitBranch",
        title: { en: "QA every branch before publish", ar: "اختبر كل فرع قبل النشر" },
        body: {
          en: "Take each path — new customer, returning, Arabic, out of stock — and confirm every one ends somewhere sensible.",
          ar: "اسلك كل مسار — عميل جديد، عائد، عربي، غير متوفر — وتأكد أن كلاً منها ينتهي بمكان منطقي.",
        },
      },
      {
        icon: "GraduationCap",
        title: { en: "Train staff on the handover point", ar: "درّب الموظفين على نقطة التحويل" },
        body: {
          en: "Show agents exactly what the customer has seen and answered by the time a conversation reaches them.",
          ar: "أرِ الموظفين بالضبط ما رآه العميل وأجاب عنه حين تصل المحادثة إليهم.",
        },
      },
      {
        icon: "Share2",
        title: { en: "Let a prospect drive it themselves", ar: "دع العميل المحتمل يقوده بنفسه" },
        body: {
          en: "Sales can share the simulator so a prospect experiences the bot first-hand instead of reading about it.",
          ar: "يستطيع فريق المبيعات مشاركة المحاكي ليجرّب العميل المحتمل البوت مباشرة بدل القراءة عنه.",
        },
      },
    ],
    how: [
      {
        title: { en: "Pick a flow or a template", ar: "اختر مساراً أو قالباً" },
        body: {
          en: "Choose one of your own flows or start from an industry template to see the pattern before you adapt it.",
          ar: "اختر أحد مساراتك أو ابدأ من قالب قطاعي لترى النمط قبل تكييفه.",
        },
      },
      {
        title: { en: "The simulator renders the WhatsApp UI", ar: "يعرض المحاكي واجهة واتساب" },
        body: {
          en: "You get the real chat interface — bubbles, buttons, list menus — running your flow engine, not a mock-up.",
          ar: "تحصل على واجهة المحادثة الحقيقية — فقاعات، أزرار، قوائم — تعمل بمحرك مساراتك، لا نموذجاً صورياً.",
        },
      },
      {
        title: { en: "Tap through every branch", ar: "انقر عبر كل فرع" },
        body: {
          en: "Press buttons, type replies, choose list options, reach the handover — exactly as a customer would.",
          ar: "اضغط الأزرار، اكتب الردود، اختر خيارات القوائم، صِل إلى التحويل — تماماً كما يفعل العميل.",
        },
      },
      {
        title: { en: "Fix in the builder, run again", ar: "أصلح في المنشئ، وأعد التشغيل" },
        body: {
          en: "Spot a gap, switch to the Botflow Studio, change the step, and re-run the simulator in seconds.",
          ar: "لاحظ ثغرة، انتقل إلى استوديو المسارات، غيّر الخطوة، وأعد تشغيل المحاكي خلال ثوانٍ.",
        },
      },
    ],
    features: [
      {
        feature: { en: "Runs the real flow engine", ar: "يعمل بمحرك المسارات الحقيقي" },
        benefit: { en: "What you approve in the simulator is what customers get — no \"it behaved differently live\".", ar: "ما تعتمده في المحاكي هو ما يحصل عليه العملاء — دون \"تصرّف بشكل مختلف مباشرة\"." },
      },
      {
        feature: { en: "No number required", ar: "لا حاجة لرقم" },
        benefit: { en: "You can evaluate the whole idea in the first five minutes, before any Meta setup.", ar: "يمكنك تقييم الفكرة كاملة في أول خمس دقائق، قبل أي إعداد لدى Meta." },
      },
      {
        feature: { en: "Every interactive message type", ar: "كل أنواع الرسائل التفاعلية" },
        benefit: { en: "Buttons, list menus, catalogue cards and quick replies behave exactly as in production.", ar: "الأزرار والقوائم وبطاقات الكتالوج والردود السريعة تتصرف تماماً كما في الإنتاج." },
      },
      {
        feature: { en: "Shareable", ar: "قابل للمشاركة" },
        benefit: { en: "Send a prospect or a colleague a working demo instead of a PDF walkthrough.", ar: "أرسِل لعميل محتمل أو زميل عرضاً يعمل بدل شرح PDF." },
      },
      {
        feature: { en: "Instant re-runs", ar: "إعادة تشغيل فورية" },
        benefit: { en: "No publish step and no wait, so testing a change is a normal part of building it.", ar: "لا خطوة نشر ولا انتظار، فيصبح اختبار التغيير جزءاً طبيعياً من بنائه." },
      },
      {
        feature: { en: "Preset industry scenarios", ar: "سيناريوهات قطاعية جاهزة" },
        benefit: { en: "See a dining, retail, clinic or tours conversation working before you commit to a design.", ar: "شاهد محادثة مطعم أو تجزئة أو عيادة أو جولات وهي تعمل قبل أن تلتزم بتصميم." },
      },
    ],
    stats: [
      { value: { en: "0", ar: "0" }, label: { en: "messages sent while you test", ar: "رسائل تُرسل أثناء اختبارك" } },
      { value: { en: "0", ar: "0" }, label: { en: "WhatsApp numbers you need to connect first", ar: "أرقام واتساب تحتاج ربطها أولاً" } },
      { value: { en: "Real", ar: "حقيقي" }, label: { en: "flow engine, not a mock-up", ar: "محرك مسارات، لا نموذج صوري" } },
      { value: { en: "~5 min", ar: "~5 دقائق" }, label: { en: "from signup to your first test", ar: "من التسجيل إلى أول اختبار" } },
    ],
    testimonials: [
      {
        quote: {
          en: "TODO: replace with real client quote — an agency describing pitching a WhatsApp bot to a client by letting them use the simulator.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — وكالة تصف عرض بوت واتساب على عميل بدعه يستخدم المحاكي.",
        },
        name: "",
        role: { en: "Agency Founder", ar: "مؤسس وكالة" },
        company: "TODO",
        todo: true,
      },
      {
        quote: {
          en: "TODO: replace with real client quote — a team lead describing catching a broken branch in the simulator that would have hit customers.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — قائد فريق يصف اكتشاف فرع معطّل في المحاكي كان سيصيب العملاء.",
        },
        name: "",
        role: { en: "Team Lead", ar: "قائد الفريق" },
        company: "TODO",
        todo: true,
      },
    ],
    faqs: [
      {
        q: { en: "Does the simulator use my real bot flow?", ar: "هل يستخدم المحاكي مسار البوت الحقيقي؟" },
        a: {
          en: "Yes. It runs the same flow engine that serves live conversations, so the behaviour you see is the behaviour customers get.",
          ar: "نعم. يشغّل محرك المسارات نفسه الذي يخدم المحادثات المباشرة، فالسلوك الذي تراه هو ما يحصل عليه العملاء.",
        },
      },
      {
        q: { en: "Do I need to connect a WhatsApp number to use it?", ar: "هل أحتاج ربط رقم واتساب لاستخدامه؟" },
        a: {
          en: "No. The simulator works before any number is connected and without sending anything through Meta, so you can try it immediately after signing up.",
          ar: "لا. يعمل المحاكي قبل ربط أي رقم ودون إرسال أي شيء عبر Meta، فتستطيع تجربته فور التسجيل.",
        },
      },
      {
        q: { en: "Can I show the simulator to a client?", ar: "هل أستطيع عرض المحاكي على عميل؟" },
        a: {
          en: "Yes. It is designed to be driven by someone else — hand it over in a meeting, or share it so a prospect can tap through the flow on their own.",
          ar: "نعم. صُمّم ليقوده شخص آخر — سلّمه في اجتماع، أو شاركه ليتنقل العميل المحتمل عبر المسار بنفسه.",
        },
      },
      {
        q: { en: "Does it support buttons and list messages?", ar: "هل يدعم رسائل الأزرار والقوائم؟" },
        a: {
          en: "Yes — reply buttons, list menus, catalogue cards and quick replies all render and behave as they do in a real WhatsApp conversation.",
          ar: "نعم — أزرار الرد وقوائم الاختيار وبطاقات الكتالوج والردود السريعة كلها تُعرض وتتصرف كما في محادثة واتساب حقيقية.",
        },
      },
      {
        q: { en: "Is it the same as what customers get in production?", ar: "هل هو نفسه ما يحصل عليه العملاء في الإنتاج؟" },
        a: {
          en: "The conversation logic is identical. The only differences are cosmetic — there is no real delivery, and no 24-hour window or template cost applies because nothing is actually sent.",
          ar: "منطق المحادثة مطابق. الفروق الوحيدة شكلية — لا تسليم حقيقي، ولا تنطبق نافذة 24 ساعة أو تكلفة قالب لأن لا شيء يُرسل فعلاً.",
        },
      },
    ],
    related: [
      { href: "/product/botflow-studio", label: { en: "Visual Botflow Studio — build what you test", ar: "استوديو مسارات البوت — ابنِ ما تختبره" } },
      { href: "/product/team-inbox", label: { en: "Multi-Agent Team Inbox", ar: "صندوق الفريق متعدد الموظفين" } },
      { href: "/solutions/clinics-hospitals-health", label: { en: "See a clinic flow", ar: "شاهد مسار عيادة" } },
      { href: "/solutions/ecommerce-online-stores", label: { en: "See a store flow", ar: "شاهد مسار متجر" } },
    ],
    schemaType: "Product",
  },

  /* ===================================================================== */
  /* 6. Digital QR Reviews & Google Auto-Reply                              */
  /*    Primary keyword:  QR code review generation software               */
  /*    Secondary:        Google review auto-reply · AI QR sign design ·   */
  /*                      Google Business Profile review management        */
  /* ===================================================================== */
  {
    slug: "digital-qr-reviews",
    primaryKeyword: "QR code review generation software",
    secondaryKeywords: [
      "Google review auto-reply",
      "AI QR sign design",
      "Google Business Profile review management",
    ],
    keywords: [
      "QR code review generation software", "Google review auto-reply", "AI QR sign design",
      "Google Business Profile review management", "QR code for Google reviews", "review funnel QR code",
      "AI reply to Google reviews", "automatic Google review responses", "QR code review card generator Oman",
      "Google Business Profile OAuth integration", "review approval queue", "QR code reputation management",
    ],
    metaTitle: {
      en: "QR Review Generation & Google Auto-Reply | Fizmoh",
      ar: "توليد مراجعات QR والرد التلقائي على جوجل | Fizmoh",
    },
    metaDescription: {
      en: "A QR code that turns a real customer moment into a genuine Google review, an AI-designed print sign to put it on, and an auto-reply engine that answers every review — with a human always able to approve first.",
      ar: "رمز QR يحوّل لحظة عميل حقيقية إلى مراجعة جوجل فعلية، لافتة مطبوعة بتصميم ذكاء اصطناعي، ومحرك رد تلقائي يجيب كل مراجعة — مع بقاء الموافقة البشرية خياراً دائماً.",
    },
    eyebrow: { en: "Digital QR Reviews & Google Auto-Reply", ar: "مراجعات QR الرقمية والرد التلقائي على جوجل" },
    h1: {
      en: "From a scan to a real Google review, and a reply to every one you get",
      ar: "من مسح الرمز إلى مراجعة جوجل حقيقية، ورد على كل ما تصلك منها",
    },
    subheadline: {
      en: "A QR code your customer scans, rates and reviews in their own words — with an AI-designed sign to print it on, real ratings pulled onto your dashboard, and an auto-reply engine that answers every Google review in a tone you choose. Nothing is ever posted as the customer without them seeing and confirming it first.",
      ar: "رمز QR يمسحه عميلك، يقيّم من خلاله، ويكتب مراجعته بكلماته — مع لافتة بتصميم ذكاء اصطناعي للطباعة، وتقييمات حقيقية تظهر في لوحتك، ومحرك رد تلقائي يجيب كل مراجعة جوجل بالنبرة التي تختارها. لا يُنشر شيء باسم العميل دون أن يراه ويؤكده أولاً.",
    },
    hero: {
      src: "/marketing/products/digital-qr-reviews.jpg",
      alt: {
        en: "A printed QR review sign on a restaurant table next to a phone showing a five-star rating screen",
        ar: "لافتة QR مطبوعة على طاولة مطعم بجانب هاتف يعرض شاشة تقييم خمس نجوم",
      },
      width: 1280,
      height: 714,
      kind: "css",
      icon: "QrCode",
    },
    heroNote: {
      en: "Customer confirms every word · full error-correction QR, always · approval before anything posts",
      ar: "العميل يؤكد كل كلمة · رمز QR بأعلى تصحيح خطأ دائماً · موافقة قبل أي نشر",
    },
    problems: [
      {
        title: { en: "Good reviews only happen by luck", ar: "المراجعات الجيدة تحدث بالصدفة فقط" },
        body: {
          en: "A happy customer walks out and the moment is gone. There is no easy, honest path from \"this was great\" to an actual Google review.",
          ar: "يغادر العميل السعيد وتضيع اللحظة. لا يوجد مسار سهل وصادق من \"كان هذا رائعاً\" إلى مراجعة جوجل فعلية.",
        },
      },
      {
        title: { en: "Every reply is written by hand, or not at all", ar: "كل رد يُكتب يدوياً، أو لا يُكتب أبداً" },
        body: {
          en: "Answering every Google review daily is a real chore. In practice it gets skipped, delayed for weeks, or answered with the same copy-pasted line every time.",
          ar: "الرد على كل مراجعة جوجل يومياً مهمة حقيقية شاقة. عملياً، تُهمَل أو تتأخر أسابيع أو تُجاب بنفس الجملة المنسوخة كل مرة.",
        },
      },
      {
        title: { en: "A bare printed QR code doesn't get scanned", ar: "رمز QR مطبوع بلا تصميم لا يُمسح" },
        body: {
          en: "A code taped to a counter with no design and no clear ask blends into the background — most customers never notice it, let alone scan it.",
          ar: "رمز ملصق على طاولة دون تصميم أو طلب واضح يندمج مع الخلفية — لا يلاحظه معظم العملاء، ناهيك عن مسحه.",
        },
      },
    ],
    useCases: [
      {
        icon: "QrCode",
        title: { en: "A scan that becomes a real review", ar: "مسح يتحول إلى مراجعة حقيقية" },
        body: {
          en: "The customer rates, adds a few words about what stood out, and gets 2-4 AI-drafted review suggestions built from what they actually said — never invented. They pick one, edit it if they want, and confirm the exact text before Google opens.",
          ar: "يقيّم العميل، يضيف كلمات عمّا أعجبه، ويحصل على 2-4 اقتراحات مراجعة مصاغة بالذكاء الاصطناعي من كلامه الفعلي — لا شيء مُختلَق. يختار واحداً، يعدّله إن أراد، ويؤكد النص بالضبط قبل فتح جوجل.",
        },
      },
      {
        icon: "Sparkles",
        title: { en: "AI-designed, fully editable print signs", ar: "لافتات مطبوعة بتصميم ذكاء اصطناعي وقابلة للتعديل بالكامل" },
        body: {
          en: "A full-page canvas editor: drag text, shapes and an AI-generated background image anywhere, or describe a look and let AI draft the whole design. The QR itself always renders on top, always at full error correction — never covered, never distorted.",
          ar: "محرر تصميم بصفحة كاملة: اسحب النصوص والأشكال وصورة خلفية مولّدة بالذكاء الاصطناعي في أي مكان، أو صف الشكل ودع الذكاء الاصطناعي يصمم الكل. يبقى رمز QR نفسه فوق كل شيء دائماً وبأعلى تصحيح خطأ — لا يُغطّى ولا يُشوَّه أبداً.",
        },
      },
      {
        icon: "RefreshCcw",
        title: { en: "Real ratings on your dashboard", ar: "تقييمات حقيقية في لوحتك" },
        body: {
          en: "Connect your Google Business Profile once and pull the real average rating and review count for each location — never a number this platform invented.",
          ar: "اربط ملف نشاطك التجاري في جوجل مرة واحدة، واسحب متوسط التقييم الحقيقي وعدد المراجعات لكل موقع — لا رقم من اختراع هذا النظام أبداً.",
        },
      },
      {
        icon: "MessageCircleQuestion",
        title: { en: "Every Google review gets answered", ar: "كل مراجعة جوجل تحصل على رد" },
        body: {
          en: "A natural, specific reply drafted for each new review — thanking a 5-star visit by name of what they liked, or calmly inviting a 1-2 star reviewer to reach out directly. Never robotic, never the same line twice.",
          ar: "رد طبيعي ومحدد يُصاغ لكل مراجعة جديدة — شكر زيارة خمس نجوم بذكر ما أعجب العميل تحديداً، أو دعوة هادئة لصاحب تقييم نجمة أو نجمتين للتواصل مباشرة. لا رد آلي، ولا نفس الجملة مرتين.",
        },
      },
      {
        icon: "ShieldCheck",
        title: { en: "Approval before anything posts, if you want it", ar: "موافقة قبل أي نشر، إن أردت" },
        body: {
          en: "Choose manual approval, draft-only, or automatic publishing for eligible ratings. Whatever the mode, 1-3 star reviews and anything mentioning refunds, safety, legal threats or discrimination always wait for a person.",
          ar: "اختر الموافقة اليدوية، أو المسودة فقط، أو النشر التلقائي للتقييمات المؤهلة. أياً كان الوضع، تقييمات النجمة إلى ثلاث نجوم وأي إشارة لاسترداد أو سلامة أو تهديد قانوني أو تمييز تنتظر دائماً شخصاً.",
        },
      },
    ],
    how: [
      {
        title: { en: "Connect your Google Business Profile once", ar: "اربط ملف نشاطك في جوجل مرة واحدة" },
        body: {
          en: "One OAuth connection per workspace, tokens encrypted at rest, and a location picker to link the right listing.",
          ar: "اتصال OAuth واحد لكل مساحة عمل، رموز مشفّرة عند التخزين، وأداة اختيار لربط الموقع الصحيح.",
        },
      },
      {
        title: { en: "Design and print a QR sign", ar: "صمم واطبع لافتة QR" },
        body: {
          en: "Describe the look you want, or drag it together yourself in the full-page editor. Export a print-ready PDF in the paper size you need.",
          ar: "صف الشكل الذي تريده، أو اسحبه بنفسك في محرر الصفحة الكاملة. صدّر ملف PDF جاهزاً للطباعة بمقاس الورق الذي تحتاجه.",
        },
      },
      {
        title: { en: "A customer scans, rates and reviews", ar: "يمسح العميل، يقيّم، ويكتب مراجعة" },
        body: {
          en: "They land on a branded page, rate honestly, and confirm an AI-drafted review in their own words before it ever reaches Google.",
          ar: "يصل إلى صفحة بهوية علامتك، يقيّم بصدق، ويؤكد مراجعة مصاغة بالذكاء الاصطناعي بكلماته قبل وصولها إلى جوجل.",
        },
      },
      {
        title: { en: "Every new Google review gets a reply", ar: "كل مراجعة جوجل جديدة تحصل على رد" },
        body: {
          en: "The auto-reply engine drafts a reply for each one and routes it the way you configured — published, held for your approval, or left as a draft.",
          ar: "يصوغ محرك الرد التلقائي رداً لكل مراجعة ويوجّهه كما أعددته — منشور، بانتظار موافقتك، أو محفوظ كمسودة.",
        },
      },
    ],
    features: [
      {
        feature: { en: "AI-generated print designs", ar: "تصاميم مطبوعة مولّدة بالذكاء الاصطناعي" },
        benefit: { en: "A sign customers actually notice and stop to scan, not a bare code taped to a counter.", ar: "لافتة يلاحظها العملاء فعلاً ويتوقفون لمسحها، لا رمز عارٍ ملصق على طاولة." },
      },
      {
        feature: { en: "Full-page drag-and-drop editor", ar: "محرر سحب وإفلات بصفحة كاملة" },
        benefit: { en: "Exact control over the layout without needing a designer on staff.", ar: "تحكم دقيق بالتخطيط دون حاجة لمصمم في الفريق." },
      },
      {
        feature: { en: "Customer confirms every word", ar: "العميل يؤكد كل كلمة" },
        benefit: { en: "A review is never posted, submitted or fabricated on a customer's behalf — they see the exact text first.", ar: "لا تُنشر أو تُقدَّم أو تُختلَق مراجعة نيابة عن العميل أبداً — يرى النص بالضبط أولاً." },
      },
      {
        feature: { en: "Real Google rating & review count", ar: "تقييم جوجل الحقيقي وعدد المراجعات" },
        benefit: { en: "The number on your dashboard is the number on your actual listing — nothing estimated.", ar: "الرقم في لوحتك هو نفس الرقم في ملفك الفعلي — لا شيء تقديري." },
      },
      {
        feature: { en: "Configurable reply tone & language", ar: "نبرة ولغة رد قابلة للتخصيص" },
        benefit: { en: "Professional, warm, formal, casual, luxury or your own custom tone, in the language your customers actually write in.", ar: "احترافية، دافئة، رسمية، غير رسمية، فاخرة، أو نبرتك الخاصة، باللغة التي يكتب بها عملاؤك فعلاً." },
      },
      {
        feature: { en: "1-3 star reviews always held for a person", ar: "تقييمات النجمة إلى ثلاث نجوم تنتظر شخصاً دائماً" },
        benefit: { en: "Nothing sensitive goes out to a public review without a human's eyes on it first, whatever mode you run in.", ar: "لا شيء حساس يُنشر علناً دون عين بشرية عليه أولاً، أياً كان الوضع الذي تعمل به." },
      },
    ],
    stats: [
      { value: { en: "5", ar: "5" }, label: { en: "starting print sizes — every layer stays fully editable", ar: "مقاسات طباعة أولية — كل عنصر قابل للتعديل بالكامل" } },
      { value: { en: "H", ar: "H" }, label: { en: "QR error-correction level, on every design", ar: "مستوى تصحيح خطأ QR في كل تصميم" } },
      { value: { en: "0", ar: "0" }, label: { en: "fabricated reviews — every word is the customer's own, confirmed before posting", ar: "مراجعات مُختلَقة — كل كلمة من العميل نفسه، مؤكدة قبل النشر" } },
      { value: { en: "1-3★", ar: "1-3★" }, label: { en: "always held for approval, in every mode", ar: "تُحفظ دائماً للموافقة، في كل الأوضاع" } },
    ],
    testimonials: [
      {
        quote: {
          en: "TODO: replace with real client quote — an owner describing what changed once every Google review actually got a reply.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — صاحب عمل يصف ما تغيّر بعد أن أصبح لكل مراجعة جوجل رد فعلي.",
        },
        name: "",
        role: { en: "Owner", ar: "المالك" },
        company: "TODO",
        todo: true,
      },
      {
        quote: {
          en: "TODO: replace with real client quote — a marketing lead describing the jump in actual review volume after printing the AI-designed signs.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — مسؤول تسويق يصف ارتفاع عدد المراجعات الفعلي بعد طباعة اللافتات المصممة بالذكاء الاصطناعي.",
        },
        name: "",
        role: { en: "Marketing Lead", ar: "مسؤول التسويق" },
        company: "TODO",
        todo: true,
      },
    ],
    faqs: [
      {
        q: { en: "Does this ever post a fake or automatic review?", ar: "هل يُنشر هذا مراجعة مزيفة أو تلقائية؟" },
        a: {
          en: "No. A review is only ever posted after the customer sees the exact final text and clicks to open Google themselves. Nothing is submitted, simulated or invented on their behalf.",
          ar: "لا. لا تُنشر المراجعة إلا بعد أن يرى العميل النص النهائي بالضبط وينقر بنفسه لفتح جوجل. لا شيء يُقدَّم أو يُحاكى أو يُختلَق نيابة عنه.",
        },
      },
      {
        q: { en: "Can I control which star ratings get an automatic reply?", ar: "هل يمكنني التحكم بأي تقييمات نجوم تحصل على رد تلقائي؟" },
        a: {
          en: "Yes. Set a minimum rating for automatic publishing, and a floor below which approval is always required — 1-3 star reviews stay held for a person by default in every mode.",
          ar: "نعم. حدّد أدنى تقييم للنشر التلقائي، وحداً أدنى تُطلب الموافقة تحته دائماً — تبقى تقييمات النجمة إلى ثلاث نجوم بانتظار شخص افتراضياً في كل الأوضاع.",
        },
      },
      {
        q: { en: "Does adding a background image or logo affect whether the QR scans?", ar: "هل تؤثر إضافة صورة خلفية أو شعار على مسح الرمز؟" },
        a: {
          en: "No. The QR is always generated separately at the highest error-correction level and drawn on top of every other layer in the final print file — a design can be rearranged freely without ever risking a code that fails to scan.",
          ar: "لا. يُولَّد رمز QR دائماً بشكل منفصل بأعلى مستوى تصحيح خطأ ويُرسم فوق كل طبقة أخرى في ملف الطباعة النهائي — يمكن إعادة ترتيب التصميم بحرية دون خطر رمز لا يُمسح.",
        },
      },
      {
        q: { en: "What languages can replies be written in?", ar: "بأي لغات يمكن كتابة الردود؟" },
        a: {
          en: "Whichever you configure — the reply matches the language you set, and multiple languages can be supported per workspace.",
          ar: "أي لغة تُعدّها — يطابق الرد اللغة التي تحددها، ويمكن دعم أكثر من لغة لكل مساحة عمل.",
        },
      },
      {
        q: { en: "What if my Google Business Profile API access isn't approved yet?", ar: "ماذا لو لم تتم الموافقة على وصول واجهة برمجة ملف جوجل بعد؟" },
        a: {
          en: "Everything else still works — connecting the account, designing signs, the customer review flow, drafting and approving replies. Only pulling live ratings and publishing replies to Google waits on that approval, and the dashboard says so plainly rather than showing a broken or fabricated number.",
          ar: "كل شيء آخر يعمل — ربط الحساب، تصميم اللافتات، مسار مراجعة العميل، صياغة الردود والموافقة عليها. فقط سحب التقييمات الحية ونشر الردود على جوجل ينتظران تلك الموافقة، وتوضح اللوحة ذلك صراحة بدلاً من إظهار رقم معطل أو مُختلَق.",
        },
      },
    ],
    related: [
      { href: "/product/team-inbox", label: { en: "Multi-Agent Team Inbox", ar: "صندوق الفريق متعدد الموظفين" } },
      { href: "/product/payments", label: { en: "AmwalPay Online Payments", ar: "مدفوعات أموال باي" } },
      { href: "/solutions/restaurants-dining", label: { en: "For restaurants & cafes", ar: "للمطاعم والمقاهي" } },
      { href: "/whats-new", label: { en: "See what's new", ar: "شاهد ما الجديد" } },
    ],
    schemaType: "Product",
  },

  /* ===================================================================== */
  /* 7. Facebook & Instagram Automation                                     */
  /*    Primary keyword:  Facebook Messenger automation software           */
  /*    Secondary:        Instagram DM automation · unified social inbox · */
  /*                      Instagram comment automation                     */
  /* ===================================================================== */
  {
    slug: "facebook-instagram-automation",
    primaryKeyword: "Facebook Messenger automation software",
    secondaryKeywords: [
      "Instagram DM automation",
      "unified social inbox",
      "Instagram comment automation",
    ],
    keywords: [
      "Facebook Messenger automation software", "Instagram DM automation", "unified social inbox",
      "Instagram comment automation", "Facebook Messenger AI reply", "Instagram Professional account automation",
      "Messenger chatbot Oman", "unified WhatsApp Facebook Instagram inbox", "social media auto-reply AI",
      "Instagram lead capture automation", "Facebook Page automation software", "Meta messaging automation",
    ],
    metaTitle: {
      en: "Facebook & Instagram Automation — Unified Inbox | Fizmoh",
      ar: "أتمتة فيسبوك وإنستغرام — صندوق موحد | Fizmoh",
    },
    metaDescription: {
      en: "One inbox for WhatsApp, Messenger and Instagram DMs, with AI auto-reply, comment automation and lead capture — official Meta APIs only, a human always able to approve first.",
      ar: "صندوق واحد لواتساب وماسنجر ورسائل إنستغرام المباشرة، مع رد تلقائي بالذكاء الاصطناعي وأتمتة تعليقات والتقاط عملاء محتملين — واجهات ميتا الرسمية فقط، مع بقاء الموافقة البشرية خياراً دائماً.",
    },
    eyebrow: { en: "Facebook & Instagram Automation", ar: "أتمتة فيسبوك وإنستغرام" },
    h1: {
      en: "WhatsApp, Messenger and Instagram — one inbox, one AI, one team",
      ar: "واتساب وماسنجر وإنستغرام — صندوق واحد، ذكاء اصطناعي واحد، فريق واحد",
    },
    subheadline: {
      en: "Connect your Facebook Page and Instagram Professional account through official Meta login, and every DM and comment lands in the same inbox your WhatsApp team already uses — answered by AI grounded only in what you tell it, with a person always able to review first.",
      ar: "اربط صفحتك على فيسبوك وحساب إنستغرام الاحترافي عبر تسجيل دخول ميتا الرسمي، وتصل كل رسالة وتعليق إلى نفس الصندوق الذي يستخدمه فريق واتساب — يرد عليها الذكاء الاصطناعي بالاعتماد فقط على ما تخبره به، مع بقاء المراجعة البشرية خياراً متاحاً دائماً.",
    },
    hero: {
      src: "/marketing/products/facebook-instagram-automation.jpg",
      alt: {
        en: "A phone showing a unified inbox with WhatsApp, Messenger and Instagram conversations side by side",
        ar: "هاتف يعرض صندوقاً موحداً لمحادثات واتساب وماسنجر وإنستغرام جنباً إلى جنب",
      },
      width: 1280,
      height: 714,
      kind: "css",
      icon: "MessageCircleQuestion",
    },
    heroNote: {
      en: "Official Meta OAuth only · no scraping, no stored passwords · 1-3 star and sensitive topics always held for a person",
      ar: "تسجيل دخول ميتا الرسمي فقط · لا استخراج بيانات ولا كلمات مرور مخزنة · المواضيع الحساسة تنتظر شخصاً دائماً",
    },
    problems: [
      {
        title: { en: "Three inboxes, three logins, one team", ar: "ثلاثة صناديق، ثلاثة تسجيلات دخول، فريق واحد" },
        body: {
          en: "A customer messages on Instagram, another on Messenger, another on WhatsApp — and your team switches between three separate apps to answer all of them.",
          ar: "يراسل عميل على إنستغرام، وآخر على ماسنجر، وثالث على واتساب — ويتنقل فريقك بين ثلاثة تطبيقات منفصلة للرد على الجميع.",
        },
      },
      {
        title: { en: "Instagram comments pile up unanswered", ar: "تعليقات إنستغرام تتراكم دون رد" },
        body: {
          en: "A public comment asking about price or availability sits there for days, visible to everyone who scrolls past it, because nobody owns replying to comments specifically.",
          ar: "يبقى تعليق عام يسأل عن السعر أو التوفر لأيام، يراه كل من يمر عليه، لأن لا أحد مسؤول عن الرد على التعليقات تحديداً.",
        },
      },
      {
        title: { en: "No record of who said what, on which platform", ar: "لا سجل لمن قال ماذا، وعلى أي منصة" },
        body: {
          en: "A lead who first messaged on Instagram and later followed up on WhatsApp looks like two different strangers, because nothing connects the two conversations.",
          ar: "يبدو عميل محتمل راسل أولاً على إنستغرام ثم تابع على واتساب وكأنه شخصان غريبان، لأن لا شيء يربط بين المحادثتين.",
        },
      },
    ],
    useCases: [
      {
        icon: "MessageCircleQuestion",
        title: { en: "One inbox for every channel", ar: "صندوق واحد لكل قناة" },
        body: {
          en: "WhatsApp, Messenger and Instagram DMs in the same conversation list, each with a channel badge, the same assign/label/notes tools your team already knows.",
          ar: "رسائل واتساب وماسنجر وإنستغرام المباشرة في نفس قائمة المحادثات، مع شارة قناة لكل واحدة، ونفس أدوات التعيين والتصنيف والملاحظات التي يعرفها فريقك.",
        },
      },
      {
        icon: "Bot",
        title: { en: "AI replies grounded in your own information", ar: "ردود ذكاء اصطناعي مبنية على معلوماتك فقط" },
        body: {
          en: "Services, prices, FAQs, hours and location you provide — never invented, never a price or promise the AI made up, in a tone you choose per channel.",
          ar: "الخدمات والأسعار والأسئلة الشائعة وأوقات العمل والموقع التي تقدمها أنت — لا شيء يُختلَق أبداً، ولا سعر أو وعد يخترعه الذكاء الاصطناعي، بنبرة تختارها لكل قناة.",
        },
      },
      {
        icon: "MessageCircleQuestion",
        title: { en: "Comment automation, kept separate from DMs", ar: "أتمتة التعليقات، منفصلة عن الرسائل المباشرة" },
        body: {
          en: "Turn on auto-reply for Facebook and Instagram comments independently of direct messages — answer a public \"how much?\" the moment it's asked.",
          ar: "فعّل الرد التلقائي على تعليقات فيسبوك وإنستغرام بشكل مستقل عن الرسائل المباشرة — أجب على سؤال \"بكم؟\" العام لحظة طرحه.",
        },
      },
      {
        icon: "ListChecks",
        title: { en: "Leads captured automatically", ar: "التقاط العملاء المحتملين تلقائياً" },
        body: {
          en: "When a customer volunteers an email or phone number in a DM, it becomes a lead in the same CRM your WhatsApp leads already land in.",
          ar: "عندما يذكر عميل بريده الإلكتروني أو هاتفه في رسالة مباشرة، يصبح عميلاً محتملاً في نفس نظام إدارة العلاقات الذي تصل إليه عملاء واتساب المحتملون.",
        },
      },
      {
        icon: "ShieldCheck",
        title: { en: "Human handoff, always available", ar: "تحويل بشري، متاح دائماً" },
        body: {
          en: "Refunds, complaints, legal threats, abuse, safety and payment issues are always escalated to a person — whatever automation mode is switched on.",
          ar: "الاسترداد والشكاوى والتهديدات القانونية والإساءة والسلامة ومشاكل الدفع تُحال دائماً إلى شخص — أياً كان وضع الأتمتة المفعّل.",
        },
      },
    ],
    how: [
      {
        title: { en: "Connect through official Meta login", ar: "اتصل عبر تسجيل دخول ميتا الرسمي" },
        body: {
          en: "Your Facebook Page and Instagram Professional account, connected the way Meta actually supports it — no scraping, no browser automation, no stored passwords.",
          ar: "صفحتك على فيسبوك وحسابك الاحترافي على إنستغرام، متصلان بالطريقة التي تدعمها ميتا فعلياً — لا استخراج بيانات، لا أتمتة متصفح، لا كلمات مرور مخزنة.",
        },
      },
      {
        title: { en: "Tell it about your business", ar: "أخبره عن نشاطك التجاري" },
        body: {
          en: "Services, prices, FAQs, hours, location — the only facts the AI is ever allowed to answer from, per channel.",
          ar: "الخدمات والأسعار والأسئلة الشائعة وأوقات العمل والموقع — الحقائق الوحيدة التي يُسمح للذكاء الاصطناعي بالرد اعتماداً عليها، لكل قناة.",
        },
      },
      {
        title: { en: "Choose how automated it is", ar: "اختر مستوى الأتمتة" },
        body: {
          en: "Draft only, manual approval, or fully automatic for eligible messages — the owner has to explicitly confirm before anything sends without a click.",
          ar: "مسودة فقط، أو موافقة يدوية، أو تلقائي بالكامل للرسائل المؤهلة — يجب على المالك التأكيد صراحة قبل إرسال أي شيء دون نقرة.",
        },
      },
      {
        title: { en: "Everything lands in one inbox", ar: "كل شيء يصل إلى صندوق واحد" },
        body: {
          en: "Your team answers WhatsApp, Messenger and Instagram from the same screen, with the same assign, label, and note tools throughout.",
          ar: "يرد فريقك على واتساب وماسنجر وإنستغرام من نفس الشاشة، بنفس أدوات التعيين والتصنيف والملاحظات في كل مكان.",
        },
      },
    ],
    features: [
      {
        feature: { en: "One inbox, three channels", ar: "صندوق واحد، ثلاث قنوات" },
        benefit: { en: "No more switching apps to answer the same customer on a different platform.", ar: "لا مزيد من التنقل بين التطبيقات للرد على نفس العميل على منصة مختلفة." },
      },
      {
        feature: { en: "Official Meta OAuth only", ar: "تسجيل دخول ميتا الرسمي فقط" },
        benefit: { en: "No scraping, no browser automation, no stored Facebook or Instagram passwords, ever.", ar: "لا استخراج بيانات، لا أتمتة متصفح، لا كلمات مرور فيسبوك أو إنستغرام مخزنة، أبداً." },
      },
      {
        feature: { en: "Separate DM and comment automation", ar: "أتمتة منفصلة للرسائل والتعليقات" },
        benefit: { en: "Turn each on independently, per channel, with its own tone and rules.", ar: "فعّل كل واحدة بشكل مستقل، لكل قناة، بنبرتها وقواعدها الخاصة." },
      },
      {
        feature: { en: "Configurable automation mode", ar: "وضع أتمتة قابل للتخصيص" },
        benefit: { en: "Draft only, manual approval, or fully automatic — never defaults to unattended sending.", ar: "مسودة فقط، أو موافقة يدوية، أو تلقائي بالكامل — لا يُفعّل الإرسال دون مراقبة افتراضياً." },
      },
      {
        feature: { en: "Automatic lead capture", ar: "التقاط عملاء محتملين تلقائي" },
        benefit: { en: "A volunteered email or phone number becomes a lead in your existing CRM, not a message that scrolls away.", ar: "يصبح البريد الإلكتروني أو الهاتف المذكور طواعية عميلاً محتملاً في نظامك الحالي، لا رسالة تختفي." },
      },
      {
        feature: { en: "Sensitive topics always escalated", ar: "المواضيع الحساسة تُحال دائماً" },
        benefit: { en: "Refunds, legal threats, safety and payment issues reach a person, in every automation mode.", ar: "الاسترداد والتهديدات القانونية والسلامة ومشاكل الدفع تصل إلى شخص، في كل وضع أتمتة." },
      },
    ],
    stats: [
      { value: { en: "3", ar: "3" }, label: { en: "channels, one inbox — WhatsApp, Messenger, Instagram", ar: "قنوات في صندوق واحد — واتساب وماسنجر وإنستغرام" } },
      { value: { en: "0", ar: "0" }, label: { en: "stored Facebook or Instagram passwords — OAuth only", ar: "كلمات مرور فيسبوك أو إنستغرام مخزنة — تسجيل دخول رسمي فقط" } },
      { value: { en: "2", ar: "2" }, label: { en: "automation types per channel: DMs and comments, independently switched", ar: "نوعا أتمتة لكل قناة: الرسائل والتعليقات، بشكل مستقل" } },
      { value: { en: "1-3★", ar: "1-3★" }, label: { en: "and sensitive topics always held for a person", ar: "والمواضيع الحساسة تُحفظ دائماً لشخص" } },
    ],
    testimonials: [
      {
        quote: {
          en: "TODO: replace with real client quote — an owner describing what changed once Instagram DMs stopped needing a separate app.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — صاحب عمل يصف ما تغيّر بعد أن لم تعد رسائل إنستغرام تحتاج تطبيقاً منفصلاً.",
        },
        name: "",
        role: { en: "Owner", ar: "المالك" },
        company: "TODO",
        todo: true,
      },
      {
        quote: {
          en: "TODO: replace with real client quote — a support lead describing the unified inbox replacing three separate apps.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — مسؤول دعم يصف الصندوق الموحد وهو يستبدل ثلاثة تطبيقات منفصلة.",
        },
        name: "",
        role: { en: "Support Lead", ar: "مسؤول الدعم" },
        company: "TODO",
        todo: true,
      },
    ],
    faqs: [
      {
        q: { en: "Does this work with a personal Instagram account?", ar: "هل يعمل هذا مع حساب إنستغرام شخصي؟" },
        a: {
          en: "No — only Instagram Professional accounts (Business or Creator), connected through Meta's own Instagram Login. Personal accounts are not supported, by design.",
          ar: "لا — فقط الحسابات الاحترافية على إنستغرام (تجارية أو للمبدعين)، متصلة عبر تسجيل دخول إنستغرام الرسمي من ميتا. الحسابات الشخصية غير مدعومة، عن قصد.",
        },
      },
      {
        q: { en: "Is this scraping Facebook or Instagram?", ar: "هل هذا استخراج بيانات من فيسبوك أو إنستغرام؟" },
        a: {
          en: "No. Every connection and every message goes through Meta's own official APIs and OAuth login — no browser automation, no scraping, no password ever stored.",
          ar: "لا. كل اتصال وكل رسالة تمر عبر واجهات برمجة ميتا وتسجيل الدخول الرسمي — لا أتمتة متصفح، لا استخراج بيانات، لا كلمة مرور تُخزَّن أبداً.",
        },
      },
      {
        q: { en: "Can the AI reply completely on its own?", ar: "هل يمكن للذكاء الاصطناعي أن يرد وحده تماماً؟" },
        a: {
          en: "Only if the workspace owner explicitly turns on fully automatic mode — and even then, 1-3 star sentiment, refunds, legal threats, safety and payment issues are always held for a person first.",
          ar: "فقط إذا فعّل مالك مساحة العمل الوضع التلقائي الكامل صراحة — وحتى في تلك الحالة، تُحفظ دائماً الشكاوى والاسترداد والتهديدات القانونية ومشاكل السلامة والدفع لشخص أولاً.",
        },
      },
      {
        q: { en: "Do WhatsApp, Messenger and Instagram share the same AI knowledge?", ar: "هل تشترك واتساب وماسنجر وإنستغرام في نفس معرفة الذكاء الاصطناعي؟" },
        a: {
          en: "Business information and tone are configured per channel, so you can answer more casually on Instagram and more formally on WhatsApp if you want — or keep them identical.",
          ar: "تُعدّ معلومات النشاط والنبرة لكل قناة على حدة، فيمكنك الرد بشكل أكثر ودية على إنستغرام وأكثر رسمية على واتساب إن أردت — أو إبقائهما متطابقين.",
        },
      },
      {
        q: { en: "What if Meta hasn't approved API access for my account yet?", ar: "ماذا لو لم توافق ميتا على وصول واجهة برمجة التطبيقات لحسابي بعد؟" },
        a: {
          en: "Connecting and configuring everything still works for accounts the platform's own Meta app can reach today. Full customer traffic on a newly connected account depends on Meta's own App Review approval, which is outside anyone's control but Meta's.",
          ar: "الاتصال وإعداد كل شيء يعملان للحسابات التي يمكن لتطبيق ميتا الخاص بالمنصة الوصول إليها اليوم. حركة العملاء الكاملة على حساب متصل حديثاً تعتمد على موافقة مراجعة تطبيقات ميتا الخاصة بها، وهو أمر خارج عن سيطرة أي طرف سوى ميتا.",
        },
      },
    ],
    related: [
      { href: "/product/team-inbox", label: { en: "Multi-Agent Team Inbox", ar: "صندوق الفريق متعدد الموظفين" } },
      { href: "/product/digital-qr-reviews", label: { en: "Digital QR Reviews & Google Auto-Reply", ar: "مراجعات QR الرقمية والرد التلقائي على جوجل" } },
      { href: "/solutions/restaurants-dining", label: { en: "For restaurants & cafes", ar: "للمطاعم والمقاهي" } },
      { href: "/whats-new", label: { en: "See what's new", ar: "شاهد ما الجديد" } },
    ],
    schemaType: "Product",
  },

  /* ===================================================================== */
  /* 8. Digital Business Cards & Smart vCard                                 */
  /*    Primary keyword:  Digital Business Card                             */
  /*    Secondary:        Smart vCard generator · WhatsApp Business Card    */
  /*                      QR code contact card · Electronic card Oman GCC   */
  /* ===================================================================== */
  {
    slug: "digital-vcard",
    primaryKeyword: "Digital Business Card",
    secondaryKeywords: [
      "Smart vCard generator",
      "WhatsApp Business Card",
      "QR code contact card",
      "Electronic business card Oman UAE GCC",
    ],
    keywords: [
      "digital business card", "smart vcard generator", "electronic business card",
      "virtual business card", "whatsapp business card", "qr code contact card",
      "nfc business card alternative", "mobile contact card", "digital vcard Oman",
      "digital business card UAE Dubai", "digital business card Saudi Arabia GCC",
      "vcf contact card download", "interactive business card", "video cover digital card",
      "corporate digital business cards",
    ],
    metaTitle: {
      en: "Digital Business Cards & Smart vCard Generator | Fizmoh",
      ar: "بطاقات الأعمال الرقمية الذكية ومولد vCard التفاعلي | فيزموه",
    },
    metaDescription: {
      en: "Create mobile-first digital business cards with 10+ executive themes, video covers, 1-click RFC 6350 phone contact saving, dynamic QR codes, and WhatsApp lead capture.",
      ar: "أنشئ بطاقات أعمال رقمية ذكية مع أكثر من 10 قوالب تنفيذية، أغلفة فيديو، حفظ جهة الاتصال بنقرة واحدة VCF، باركود ديناميكي، والتقاط العملاء عبر واتساب.",
    },
    eyebrow: { en: "Smart Digital Business Cards", ar: "بطاقات الأعمال الرقمية الذكية" },
    h1: {
      en: "Your professional identity. Elevated on every phone.",
      ar: "هويتك المهنية الراقية. جاهزة على كل هاتف.",
    },
    subheadline: {
      en: "Replace wasteful paper cards with modern, mobile-first vCard profiles. Share instantly via dynamic QR code, NFC, or WhatsApp, and let prospective clients save your full contact details with a single tap.",
      ar: "استبدل الكروت الورقية التقليدية ببطاقة أعمال رقمية عصرية. شارك فوراً عبر باركود QR أو NFC أو واتساب، ومكّن عملاءك من حفظ أرقامك وموقعك مباشرة بنقرة واحدة.",
    },
    hero: {
      src: "/brand/vcard-triple-showcase.jpg",
      alt: {
        en: "Three executive smartphones showing Fizmoh digital business cards with video covers, custom links, and WhatsApp actions",
        ar: "ثلاثة هواتف ذكية تعرض بطاقات أعمال فيزموه الرقمية التنفيذية مع أغلفة فيديو وروابط مخصصة",
      },
      width: 1200,
      height: 800,
      placeholder: false,
    },
    heroNote: {
      en: "Live on iOS & Android · Zero App Download Needed · Instant RFC 6350 vCard Phone Sync",
      ar: "يعمل على آيفون وأندرويد · بدون تحميل تطبيقات · حفظ فوري في جهات الاتصال",
    },
    problems: [
      {
        title: { en: "Paper business cards get lost or thrown away in 24 hours", ar: "بطاقات الأعمال الورقية تُفقد أو تُرمى خلال 24 ساعة" },
        body: {
          en: "88% of printed paper business cards are tossed in the trash within a week. Contact info gets mistyped or never transferred to the phone address book.",
          ar: "88% من كروت الأعمال الورقية تُهمل أو تُرمى في سلة المهملات. وتفاصيل الاتصال قد تُكتب بالخطأ أو لا تُحفظ في الهاتف أبداً.",
        },
      },
      {
        title: { en: "Outdated details require costly reprinting batches", ar: "تغيير رقم أو عنوان يتطلب إعادة طباعة مكلفة" },
        body: {
          en: "When a phone number, office location, or title changes, thousands of expensive printed cards immediately become obsolete waste.",
          ar: "عندما يتغير رقم الهاتف أو عنوان المكتب أو المسمى الوظيفي، تصبح آلاف الكروت المطبوعة عديمة الفائدة على الفور.",
        },
      },
      {
        title: { en: "Zero visibility into who viewed or engaged with your card", ar: "انعدام المعرفة بمن اطّلع على بطاقتك أو تفاعل معها" },
        body: {
          en: "Paper cards provide zero analytics. You never know if someone opened your portfolio, called your office, or shared your profile.",
          ar: "الكروت التقليدية لا تقدم أي إحصائيات. لن تعرف أبداً من فتح معرض أعمالك أو اتصل بمكتبك أو شارك بياناتك.",
        },
      },
    ],
    useCases: [
      {
        icon: "Sparkles",
        title: { en: "10+ Curated Executive Themes", ar: "أكثر من 10 قوالب تنفيذية راقية" },
        body: {
          en: "Choose from Modern Minimal, Midnight Executive, Royal Emerald, Cyberpunk Neon, Frosted Glass, Neo-Brutalist, and Champagne Luxury.",
          ar: "اختر من بين تصاميم عصرية، تنفيذية فاخرة، زمردية ملكية، زجاجية معتمة، أو عاجية كلاسيكية تناسب هيبة نشاطك التجاري.",
        },
      },
      {
        icon: "Video",
        title: { en: "Looping Video & Photo Covers", ar: "أغلفة فيديو وصور متحركة" },
        body: {
          en: "Engage visitors immediately with dynamic auto-playing MP4 video covers showcasing your hotel, safari tours, restaurant venue, or portfolio.",
          ar: "اجذب العملاء فوراً بغلاف فيديو MP4 يعمل في حلقة مستمرة يعرض فندقك، جولاتك السياحية، مطعمك أو إنجازاتك.",
        },
      },
      {
        icon: "Download",
        title: { en: "1-Click Phone Contact Download (VCF)", ar: "حفظ فوري في جهات الاتصال بنقرة واحدة" },
        body: {
          en: "Generates RFC 6350 standards-compliant vCard files. Your client taps 'Save Contact' and your full details are saved to their iOS or Android address book instantly.",
          ar: "توليد ملفات vCard متوافقة قياسياً مع هواتف آبل وأندرويد. ينقر العميل 'حفظ جهة الاتصال' فتُحفظ أرقامك وعناوينك في هاتفه فوراً.",
        },
      },
      {
        icon: "QrCode",
        title: { en: "Dynamic Smart QR Code", ar: "رمز QR ذكي وديناميكي" },
        body: {
          en: "High-resolution branded QR code ready for phone lockscreens, trade show badges, brochures, and vehicle wraps.",
          ar: "رمز QR عالي الدقة جاهز للشاشات وبطاقات المؤتمرات والبروشورات وتغليف المركبات يفتح ملفك الشخصي فوراً.",
        },
      },
      {
        icon: "LayoutGrid",
        title: { en: "Products & Services: Slider or Square Grid", ar: "عرض الخدمات: سلايدر أو شبكة مربعة" },
        body: {
          en: "Display your key offerings with instant WhatsApp booking buttons in either an interactive horizontal swipe slider or a clean 2x2 square grid.",
          ar: "اعرض خدماتك وباقاتك مع أزرار حجز مباشرة عبر واتساب إما بسلايدر تمرير أفقي أو شبكة مربعة أنيقة.",
        },
      },
      {
        icon: "BarChart3",
        title: { en: "Live Real-Time View & Lead Analytics", ar: "إحصائيات تفاعل ومتابعة مباشرة للعملاء" },
        body: {
          en: "Track card views, phone call taps, WhatsApp message clicks, and VCF saves over 7, 30, and 90-day periods directly from your dashboard.",
          ar: "تابع مشاهدات البطاقة، نقرات الاتصال الهاتفي، رسائل واتساب، وعمليات حفظ الرقم خلال 7 و30 و90 يوماً من لوحة التحكم.",
        },
      },
    ],
    how: [
      {
        title: { en: "Customize your branding & theme", ar: "خصص هويتك واختر قالبك" },
        body: {
          en: "Upload your business logo, select an image or MP4 video banner, choose from 10 executive themes, and pick your 3D action button style.",
          ar: "ارفع شعارك، اختر غلاف صورة أو فيديو MP4، حدد قالبك من 10 تصاميم، واختر نمط أزرار التفاعل ثلاثية الأبعاد.",
        },
      },
      {
        title: { en: "Add services, social links & custom URLs", ar: "أضف الخدمات وروابط التواصل والملفات" },
        body: {
          en: "List your packages, menu items, or consultation slots, plus links to your PDF brochure, Google Maps location, and social channels.",
          ar: "أدرج خدماتك وباقاتك وروابط بروشور الـ PDF وموقعك على خرائط جوجل وقنوات التواصل الاجتماعي.",
        },
      },
      {
        title: { en: "Share via QR code, NFC tap, or WhatsApp", ar: "شارك عبر الباركود أو NFC أو واتساب" },
        body: {
          en: "Display your dynamic QR on your phone screen, send your vanity link (e.g. fizmoh.cloud/card/your-name), or program into an NFC card.",
          ar: "اعرض رمز QR على شاشة هاتفك، أو أرسل رابطك المخصص، أو برمج الرابط على بطاقة NFC بلاستيكية أو معدنية.",
        },
      },
      {
        title: { en: "Capture leads and sync to WhatsApp CRM", ar: "اجمع العملاء المحتملين واربطهم بـ CRM" },
        body: {
          en: "Inquiries submitted via your digital card's lead form flow directly into your Fizmoh multi-agent WhatsApp inbox and customer records.",
          ar: "الطلبات والاستفسارات المرسلة من نموذج البطاقة تصل مباشرة إلى صندوق وارد واتساب ومطابقة العملاء في المنصة.",
        },
      },
    ],
    features: [
      {
        feature: { en: "10+ Executive Themes (Dark & Light)", ar: "أكثر من 10 قوالب تنفيذية (فاتح وداكن)" },
        benefit: { en: "Match your company's aesthetic perfectly with tailored colors and typography.", ar: "توافق مثالي مع هوية شركتك بالألوان والخطوط المختارة بعناية." },
      },
      {
        feature: { en: "Looping MP4 Video Cover Banner", ar: "غلاف فيديو MP4 متحرك بحلقة مستمرة" },
        benefit: { en: "Showcase your tours, rooms, food, or creative work in motion with instant sound toggle.", ar: "اعرض عقاراتك أو جولاتك أو أطباقك بحركة جذابة مع تحكم بالصوت." },
      },
      {
        feature: { en: "Multi-Layout Services (Slider / Grid)", ar: "عرض خدمات متعدد الأشكال (سلايدر / شبكة)" },
        benefit: { en: "Showcase your portfolio or packages cleanly with WhatsApp order buttons.", ar: "اعرض باقاتك ومنتجاتك بوضوح مع أزرار طلب وحجز فورية عبر واتساب." },
      },
      {
        feature: { en: "Custom URLs & Icon Picker Engine", ar: "روابط مخصصة ومكتبة أيقونات شاملة" },
        benefit: { en: "Add direct links to PDF brochures, TripAdvisor reviews, reservation platforms with highlight badges.", ar: "أضف روابط سريعة للبروشورات، تقييمات تريب أدفايزر، والحجوزات بشارات مميزة." },
      },
      {
        feature: { en: "1-Click Phonebook VCF Contact Download", ar: "حفظ فوري في دفتر العناوين بنقرة واحدة" },
        benefit: { en: "Standard RFC 6350 compliance ensures seamless sync with Apple Contacts and Google Contacts.", ar: "توافق كامل يضمن حفظ اسمك ورقمك وعنوانك في هواتف العملاء بسلاسة." },
      },
      {
        feature: { en: "Dynamic QR Code with Custom Logo", ar: "رمز QR ديناميكي بهوية شركتك" },
        benefit: { en: "Generate high-res vector and image QR codes ready for lockscreens and event banners.", ar: "رمز QR عالي الدقة جاهز لشاشة القفل وبطاقات المعارض والمؤتمرات." },
      },
    ],
    stats: [
      { value: { en: "1 sec", ar: "ثانية واحدة" }, label: { en: "to share full contact details via QR or NFC", ar: "لمشاركة كامل تفاصيل الاتصال عبر QR أو NFC" } },
      { value: { en: "88%", ar: "88%" }, label: { en: "reduction in paper card printing waste & reprinting costs", ar: "توفير في هدر طباعة وتكاليف الكروت الورقية" }, estimate: true },
      { value: { en: "10+", ar: "10+" }, label: { en: "executive themes crafted for GCC and global professionals", ar: "قوالب تنفيذية مصممة للشركات الخليجية والعالمية" } },
      { value: { en: "100%", ar: "100%" }, label: { en: "compatible with native iOS and Android address books", ar: "توافق كامل مع سجل عناوين آيفون وأندرويد" } },
    ],
    testimonials: [
      {
        quote: {
          en: "TODO: replace with real client quote — a sales director describing switching an entire regional sales team from paper cards to Fizmoh digital vCards.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — مدير مبيعات يصف تحويل فريق المبيعات الإقليمي بالكامل من الكروت الورقية إلى بطاقات فيزموه الرقمية.",
        },
        name: "",
        role: { en: "Sales Director", ar: "مدير المبيعات" },
        company: "TODO",
        todo: true,
      },
      {
        quote: {
          en: "TODO: replace with real client quote — an executive using video cover and NFC tap at international trade expos.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — مسؤول تنفيذي يستخدم غلاف الفيديو ومشاركة NFC في المعارض الدولية.",
        },
        name: "",
        role: { en: "Managing Partner", ar: "شريك إداري" },
        company: "TODO",
        todo: true,
      },
    ],
    faqs: [
      {
        q: { en: "Does my client need to install an app to view my digital business card?", ar: "هل يحتاج العميل لتحميل تطبيق لمشاهدة بطاقتي الرقمية؟" },
        a: {
          en: "No app installation is needed! Your digital vCard opens instantly in any mobile browser when someone scans your QR code, taps your NFC card, or clicks your link.",
          ar: "لا يحتاج العميل لأي تطبيق على الإطلاق! تفتح البطاقة فوراً على أي متصفح هاتف بمجرد مسح الباركود أو لمس بطاقة NFC أو النقر على الرابط.",
        },
      },
      {
        q: { en: "How does the 'Save Contact' button work on iOS and Android?", ar: "كيف يعمل زر 'حفظ جهة الاتصال' على أجهزة آيفون وأندرويد؟" },
        a: {
          en: "When clicked, it generates a standard vCard (.vcf) file that the phone automatically recognizes. One tap opens the native Contacts app with your name, phone, email, company, address, and website pre-filled.",
          ar: "عند النقر عليه، يتم إنشاء ملف vCard (.vcf) قياسي يتعرف عليه الهاتف تلقائياً، ليفتح تطبيق جهات الاتصال بجميع بياناتك معبأة مسبقاً لحفظها.",
        },
      },
      {
        q: { en: "Can I update my phone number or services after printing the QR code?", ar: "هل يمكنني تعديل رقمي أو خدماتي بعد طباعة رمز QR؟" },
        a: {
          en: "Yes! Your QR code points to your dynamic link. Any changes you make to your title, services, video cover, or numbers update instantly without changing your printed QR code.",
          ar: "نعم بكل تأكيد! الباركود ديناميكي، وأي تعديل في بياناتك أو خدماتك أو فيديوهاتك ينعكس فوراً دون الحاجة لتغيير الباركود المطبوع.",
        },
      },
      {
        q: { en: "Can I use an MP4 video as my card cover banner?", ar: "هل يمكنني استخدام فيديو MP4 كغلاف للبطاقة؟" },
        a: {
          en: "Yes, you can upload an MP4 video directly or paste a video link. It will automatically play in a smooth silent loop on your card, with an audio unmute toggle for visitors.",
          ar: "نعم، يمكنك رفع فيديو MP4 مباشرة أو وضع رابط فيديو، وسيعمل تلقائياً بحركة انسيابية صامتة مع زر تشغيل الصوت للزائر.",
        },
      },
      {
        q: { en: "Where do inquiries and contact form submissions go?", ar: "أين تصل الاستفسارات والطلبات المرسلة عبر البطاقة؟" },
        a: {
          en: "Lead form submissions appear directly in your Fizmoh workspace dashboard and notify your team, ready for automated WhatsApp follow-up.",
          ar: "تصل رسائل نموذج التواصل مباشرة إلى لوحة تحكم مساحة العمل في فيزموه مع إشعار لفريقك، وجاهزية للمتابعة التلقائية عبر واتساب.",
        },
      },
    ],
    related: [
      { href: "/product/team-inbox", label: { en: "Multi-Agent Team Inbox", ar: "صندوق الفريق متعدد الموظفين" } },
      { href: "/product/digital-qr-reviews", label: { en: "Digital QR Reviews & Google Auto-Reply", ar: "مراجعات QR الرقمية والرد التلقائي على جوجل" } },
      { href: "/solutions/ecommerce-online-stores", label: { en: "Ecommerce & Retail Solutions", ar: "حلول المتاجر والتجزئة" } },
      { href: "/whats-new", label: { en: "See what's new", ar: "شاهد ما الجديد" } },
    ],
    schemaType: "Product",
  },

  /* ===================================================================== */
  /* 9. Smart Menu & Ordering System                                        */
  /*    Primary keyword:  Restaurant QR Menu and Ordering System            */
  /*    Secondary:        Contactless Dining Oman GCC · Live Kitchen KDS    */
  /*                      AI Menu Scanner PDF · Table QR Ordering           */
  /* ===================================================================== */
  {
    slug: "smart-menu-ordering",
    primaryKeyword: "Restaurant QR Menu and Ordering System",
    secondaryKeywords: [
      "Contactless Dining Oman GCC",
      "Live Kitchen Display System KDS",
      "AI Menu Scanner PDF converter",
      "Table QR ordering WhatsApp",
    ],
    keywords: [
      "restaurant QR code menu", "smart menu ordering system", "contactless dining system",
      "live kitchen display system", "restaurant KDS Oman", "digital restaurant menu GCC",
      "AI menu scanner", "scan menu PDF to digital", "table QR ordering", "waiter call system",
      "cafe digital menu", "restaurant POS WhatsApp", "Muscat restaurant ordering",
      "restaurant online ordering Oman", "restaurant menu QR generator",
    ],
    metaTitle: {
      en: "Smart Menu & Ordering System — Live KDS & AI Menu Scanner | Fizmoh",
      ar: "المنيو الذكي ونظام طلبات المطاعم — شاشة مطبخ حية ومسح بالذكاء الاصطناعي | فيزموه",
    },
    metaDescription: {
      en: "Transform dining with branded QR menus, live Kitchen Display System (KDS), waiter paging, instant table ordering, and AI menu scanning from PDF or photos.",
      ar: "ارتقِ بتجربة المطاعم والمقاهي مع قوائم QR الرقمية، شاشة المطبخ التفاعلية KDS، استدعاء النادل، طلبات الطاولات الفورية، ومسح وتوليد المنيو بالذكاء الاصطناعي.",
    },
    eyebrow: { en: "Smart Menu & QR Dining", ar: "المنيو الذكي ونظام الطلبات الرقمية" },
    h1: {
      en: "Instant QR dining, live kitchen display, and AI menu scanning",
      ar: "قوائم QR تفاعلية، شاشة مطبخ حية، ومسح المنيو بالذكاء الاصطناعي",
    },
    subheadline: {
      en: "Empower guests to scan table QR codes, browse rich visual menus, order directly, and call staff in seconds — while your chefs manage orders in real time on a live Kitchen Display System.",
      ar: "مكّن ضيوفك من مسح باركود الطاولة، استعراض المنيو المصور، الطلب فوراً، وطلب النادل بضغطة زر — مع إدارة الطلبات لحظة بلحظة للطهاة عبر شاشة المطبخ الحية.",
    },
    hero: {
      src: "/marketing/industries/restaurants-dining.jpg",
      alt: {
        en: "Modern restaurant guests ordering via table QR code with chefs managing tickets on a live kitchen display",
        ar: "رواد مطعم عصري يطلبون عبر رمز QR على الطاولة مع إدارة الطهاة للطلبات عبر شاشة المطبخ",
      },
      width: 1280,
      height: 714,
      placeholder: false,
    },
    heroNote: {
      en: "No app download needed · Instant table QR codes · Multi-branch & multi-menu support",
      ar: "بدون تحميل تطبيقات · رموز QR فورية للطاولات · دعم الفروع وقوائم متعددة",
    },
    problems: [
      {
        title: { en: "Printed menus are slow to update and expensive to reprint", ar: "القوائم المطبوعة بطيئة في التحديث ومكلفة في إعادة الطباعة" },
        body: {
          en: "Every price change, sold-out dish, or seasonal item requires reprints or messy stickers. Guests frequently order items that the kitchen has already run out of.",
          ar: "أي تعديل في الأسعار أو نفاد طبق أو إضافة صنف موسمي يتطلب إعادة طباعة أو ملصقات مشوهة، مما يؤدي لطلب زبائن أصناف غير متوفرة.",
        },
      },
      {
        title: { en: "Slow table turnarounds and missed waiter calls during peak hours", ar: "بطء دوران الطاولات وصعوبة استدعاء النادل في أوقات الذروة" },
        body: {
          en: "Diners wait 10-15 minutes just to catch a waiter's eye for the menu, then wait again to order and pay. Frustrated guests lead to lower table turnover and lost revenue.",
          ar: "ينتظر الضيوف طويلاً لجذب انتباه النادل للحصول على المنيو ثم الطلب ثم الحساب، مما يقلل دوران الطاولات ويسبب خسارة في الإيرادات.",
        },
      },
      {
        title: { en: "Kitchen miscommunication and lost paper order tickets", ar: "أخطاء التواصل في المطبخ وفقدان إيصالات الطلبات الورقية" },
        body: {
          en: "Handwritten notes and noisy kitchen environments lead to missing dish modifications, delayed cooking times, and dissatisfied guests asking where their food is.",
          ar: "الملاحظات الخطية وضجيج المطبخ يتسببان في تفويت التعديلات على الأطباق وتأخير إعداد الطعام واستياء الزبائن من فترات الانتظار.",
        },
      },
    ],
    useCases: [
      {
        icon: "QrCode",
        title: { en: "Contactless Table QR Ordering", ar: "طلبات الطاولات بالباركود بدون تلامس" },
        body: {
          en: "Place branded, high-resolution QR stands on tables. Diners scan with any phone camera to view allergen tags, high-res photos, and place their order in seconds.",
          ar: "ضع استاندات QR أنيقة على الطاولات. يمسح الزائر الباركود بكاميرا أي هاتف ليستعرض الصور والأسعار ومسببات الحساسية ويطلب فوراً.",
        },
      },
      {
        icon: "MonitorPlay",
        title: { en: "Live Kitchen Display System (KDS)", ar: "شاشة المطبخ التفاعلية الحية (KDS)" },
        body: {
          en: "Chefs see incoming orders categorized by 'Pending', 'Preparing', and 'Ready' with live timers and sound alerts. Tap to advance status in real time.",
          ar: "يرى الطهاة الطلبات مقسمة حسب 'جديد' و'قيد التحضير' و'جاهز' مع عدادات زمنية وتنبيهات صوتية فورية وتحديث سريع بلمسة واحدة.",
        },
      },
      {
        icon: "Sparkles",
        title: { en: "AI Menu Scanner (GPT-4o Vision)", ar: "مسح المنيو بالذكاء الاصطناعي (GPT-4o)" },
        body: {
          en: "Upload your existing multi-page PDF or snap photos of your printed menu. GPT-4o automatically extracts categories, dish names, descriptions, and OMR prices.",
          ar: "ارفع كتيب المنيو كملف PDF أو التقط صوراً لقائمتك الورقية، ويقوم الذكاء الاصطناعي باستخراج الفئات والأسماء والأسعار آلياً.",
        },
      },
      {
        icon: "BellRing",
        title: { en: "Instant Waiter Call System", ar: "نظام استدعاء النادل الفوري" },
        body: {
          en: "Guests tap 'Call Waiter', 'Request Water', or 'Ask for the Bill' right from the digital menu. Waitstaff receive real-time table alerts instantly.",
          ar: "ينقر الضيف 'طلب النادل' أو 'طلب ماء' أو 'طلب الحساب' مباشرة من شاشة المنيو، فيصل إشعار فوري لفريق الخدمة برقم الطاولة.",
        },
      },
      {
        icon: "CreditCard",
        title: { en: "In-Menu AmwalPay & Cash Checkout", ar: "دفع إلكتروني عبر أموال باي ونقداً" },
        body: {
          en: "Support pay-at-table via AmwalPay debit/credit card gateway in Omani Rials or cash upon service, with automated WhatsApp invoice delivery.",
          ar: "ادعم الدفع على الطاولة ببطاقات البنك عبر بوابة أموال باي بالريال العماني أو نقداً مع إرسال فاتورة إلكترونية عبر واتساب.",
        },
      },
      {
        icon: "SlidersHorizontal",
        title: { en: "Multi-Branch & Direct Importer", ar: "إدارة الفروع والاستيراد المباشر" },
        body: {
          en: "Manage multiple restaurant branches, custom dine-in/takeaway menus, and batch import dishes via clean CSV format without manual entry.",
          ar: "أدر فروع مطاعمك المتعددة، قوائم الطعام المخصصة للصالات أو التوصيل، واستيراد الأصناف دفعة واحدة عبر ملفات CSV المنظمة.",
        },
      },
    ],
    how: [
      {
        title: { en: "Create your menu or scan via AI", ar: "أنشئ قائمتك أو امسحها بالذكاء الاصطناعي" },
        body: {
          en: "Upload dishes manually, import via CSV, or let the GPT-4o AI Menu Scanner convert your PDF menu into digital items with photos and prices.",
          ar: "أدخل الأصناف يدوياً أو استوردها بملف CSV أو دع ماسح المنيو بالذكاء الاصطناعي يحول ملف PDF لقائمة رقمية تفاعلية بأسعارها وصورها.",
        },
      },
      {
        title: { en: "Generate & print table QR codes", ar: "ولّد واطبع باركود الطاولات" },
        body: {
          en: "Assign tables, download high-res branded QR codes with your restaurant logo, and place acrylic stands across dining sections.",
          ar: "حدد أرقام الطاولات ونزل رموز QR عالية الدقة مع شعار مطعمك، واطبع لافتات أنيقة للصالة أو التراس الخارجي.",
        },
      },
      {
        title: { en: "Open Kitchen Display on any screen", ar: "افتح شاشة المطبخ على أي شاشة أو تابلت" },
        body: {
          en: "Launch the live Kitchen KDS on an iPad, tablet, or kitchen TV. No special POS hardware required.",
          ar: "شغّل شاشة المطبخ التفاعلية الحية على أي جهاز آيباد أو تابلت أو شاشة مطبخ عادية دون الحاجة لأجهزة POS باهظة الثمن.",
        },
      },
      {
        title: { en: "Receive orders, calls, and payments", ar: "استقبل الطلبات ونداءات النادل والمدفوعات" },
        body: {
          en: "Guests order from their phones, tickets appear instantly in the kitchen, staff receive waiter alerts, and revenue flows into your dashboard.",
          ar: "يطلب الزوار من هواتفهم، وتظهر التذاكر فوراً للطهاة، ويتلقى فريق الصالة طلبات الزبائن، مع تقارير وإحصائيات مبيعات حية.",
        },
      },
    ],
    features: [
      {
        feature: { en: "Live Kitchen Display System (KDS)", ar: "شاشة المطبخ التفاعلية الحية (KDS)" },
        benefit: { en: "Eliminate paper ticket loss and track exact preparation times for every dish.", ar: "التخلص تماماً من هدر الورق وضياع الإيصالات وتتبع سرعة تجهيز الأطباق." },
      },
      {
        feature: { en: "GPT-4o Vision AI Menu Scanner", ar: "مسح المنيو بالذكاء الاصطناعي GPT-4o" },
        benefit: { en: "Digitize 50+ menu items from a PDF or photo in under 2 minutes.", ar: "تحويل أكثر من 50 صنفاً من ملف PDF أو صورة إلى قائمة رقمية خلال دقيقتين." },
      },
      {
        feature: { en: "Table-Specific QR Code Builder", ar: "منشئ رموز QR مخصصة لكل طاولة" },
        benefit: { en: "Automatic table assignment so waitstaff always know exactly where to deliver food.", ar: "تحديد تلقائي لرقم الطاولة لضمان تقديم الطعام للمكان الصحيح دائماً." },
      },
      {
        feature: { en: "Digital Waiter Call & Bill Paging", ar: "استدعاء النادل وطلب الحساب إلكترونياً" },
        benefit: { en: "Give guests responsive service without waving hands or waiting.", ar: "خدمة راقية وسريعة للضيوف دون الحاجة للانتظار أو التلويح باليد." },
      },
      {
        feature: { en: "AmwalPay In-Menu Card Payments (OMR)", ar: "دفع بالبطاقات البنكية أموال باي (OMR)" },
        benefit: { en: "Let customers pay immediately on their phones in Omani Rials.", ar: "تمكين الزبائن من دفع الحساب فوراً بهواتفهم بالريال العماني." },
      },
      {
        feature: { en: "Direct CSV System Importer", ar: "استيراد الأصناف المباشر عبر CSV" },
        benefit: { en: "Bulk upload hundreds of items, variants, and ingredients in one click without AI.", ar: "رفع مئات الأصناف والخيارات بنقرة واحدة بدون استخدام الذكاء الاصطناعي." },
      },
    ],
    stats: [
      { value: { en: "35%", ar: "35%" }, label: { en: "faster table turnover during peak lunch & dinner rushes", ar: "سرعة أكبر في دوران الطاولات خلال أوقات الذروة" }, estimate: true },
      { value: { en: "2 min", ar: "دقيقتان" }, label: { en: "to digitize a full restaurant menu with AI vision scanner", ar: "لرقمنة منيو كامل بالماسح الذكي للصور وملفات PDF" } },
      { value: { en: "0", ar: "0" }, label: { en: "hardware POS terminals required — runs on any tablet or phone", ar: "أجهزة كاشير معقدة مطلوبة — يعمل على أي جهاز تابلت أو شاشة" } },
      { value: { en: "100%", ar: "100%" }, label: { en: "mobile browser compatible with zero app downloads", ar: "متوافق مع كل الهواتف الذكية بدون الحاجة لتحميل تطبيقات" } },
    ],
    testimonials: [
      {
        quote: {
          en: "TODO: replace with real client quote — a restaurant manager in Muscat describing cutting order delays by half with the live KDS and QR table codes.",
          ar: "TODO: استبدل باقتباس عميل حقيقي — مدير مطعم في مسقط يصف تقليص تأخير الطلبات إلى النصف باستخدام شاشة المطبخ الحية ورموز QR.",
        },
        name: "",
        role: { en: "Restaurant Operations Manager", ar: "مدير عمليات المطعم" },
        company: "TODO",
        todo: true,
      },
    ],
    faqs: [
      {
        q: { en: "Do restaurant guests need to install an app to view the menu or order?", ar: "هل يحتاج زبائن المطعم لتحميل أي تطبيق لمشاهدة المنيو أو الطلب؟" },
        a: {
          en: "No app download is needed. Diners simply point their smartphone camera at the table QR code, and the fast, responsive digital menu opens immediately in their web browser.",
          ar: "لا يحتاج العميل لأي تطبيق على الإطلاق. يمسح الزبون الباركود بكاميرا هاتفه فيفتح المنيو الرقمي السريع والأنيق فوراً في متصفح الهاتف.",
        },
      },
      {
        q: { en: "How does the Live Kitchen Display System (KDS) work?", ar: "كيف تعمل شاشة المطبخ التفاعلية الحية (KDS)؟" },
        a: {
          en: "The KDS runs in any web browser on an iPad, Android tablet, or kitchen monitor. As soon as a guest orders, the ticket appears with sound alerts, table number, modifications, and a preparation timer.",
          ar: "تعمل شاشة المطبخ على أي متصفح في جهاز آيباد أو تابلت أو شاشة تلفزيون في المطبخ. بمجرد تأكيد الطلب، تظهر التذكرة مع تنبيه صوتي ورقم الطاولة والتعديلات ومؤقت التحضير.",
        },
      },
      {
        q: { en: "How does the AI Menu Scanner import menus from PDF or photos?", ar: "كيف يعمل ماسح المنيو بالذكاء الاصطناعي لتحويل PDF والصور؟" },
        a: {
          en: "Our AI scanner uses GPT-4o Vision to read multi-column PDF brochures or photos of printed menus. It automatically parses item titles, descriptions, categories, and prices in OMR, allowing you to review and import in one tap.",
          ar: "يستخدم الماسح الذكي نموذج GPT-4o لقراءة ملفات PDF أو صور القوائم الورقية، ويستخرج تلقائياً الفئات والأطباق والأسعار بالريال العماني مع إمكانية المراجعة والحفظ بنقرة واحدة.",
        },
      },
      {
        q: { en: "Can we import dishes directly without using AI?", ar: "هل يمكننا استيراد الأصناف مباشرة دون استخدام الذكاء الاصطناعي؟" },
        a: {
          en: "Yes! Fizmoh includes a Direct System Importer. You can download a clean CSV template, fill in your categories and dishes, and upload directly to populate your menu in seconds.",
          ar: "نعم بالتأكيد! توفر المنصة نظام الاستيراد المباشر عبر ملفات CSV، حيث يمكنك تنزيل النموذج المعتمد وإضافة أصنافك ورفعها مباشرة للنظام بلحظات.",
        },
      },
      {
        q: { en: "Can customers pay online at the table via AmwalPay?", ar: "هل يمكن للزبائن الدفع إلكترونياً على الطاولة عبر أموال باي؟" },
        a: {
          en: "Yes, you can enable AmwalPay card checkout so diners pay instantly with debit or credit cards in OMR. You can also accept cash or pay-at-counter according to your restaurant's workflow.",
          ar: "نعم، يمكنك تفعيل الدفع الإلكتروني عبر أموال باي بالريال العماني ببطاقات الخصم والائتمان، أو اختيار الدفع نقداً عند الكاشير حسب رغبة المطعم.",
        },
      },
    ],
    related: [
      { href: "/solutions/restaurants-dining", label: { en: "Restaurants & Dining Industry Suite", ar: "حلول قطاع المطاعم والضيافة" } },
      { href: "/solutions/cafes-coffee", label: { en: "Cafes & Specialty Coffee", ar: "حلول المقاهي والكافيهات المختصة" } },
      { href: "/product/digital-qr-reviews", label: { en: "Digital QR Reviews & Google Auto-Reply", ar: "مراجعات QR والرد التلقائي على جوجل" } },
      { href: "/product/payments", label: { en: "AmwalPay Online Payments", ar: "مدفوعات أموال باي بالريال العماني" } },
    ],
    schemaType: "Product",
  },
]

export function productBySlug(slug: string): MarketingPage | undefined {
  return PRODUCT_PAGES.find(p => p.slug === slug.toLowerCase())
}

export const PRODUCT_SLUGS = PRODUCT_PAGES.map(p => p.slug)
