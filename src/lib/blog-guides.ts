import type { BlogPost } from "@/lib/blog-data"

/**
 * Guide-style posts, kept separate from the product posts in `blog-data.ts`.
 *
 * These target the informational half of the keyword list — how-to, tips,
 * checklists, mistakes, and the 2026/AI questions people actually type. They
 * are written to be useful on their own: a page that exists only to hold a
 * keyword earns nothing, because nobody links to it and nobody finishes it.
 *
 * Two clusters were deliberately left unwritten, and should stay unwritten
 * until the material exists:
 *
 *  - **Case study.** Requires a real, named customer with real numbers and
 *    their permission. An invented one is a lie that a prospect can check.
 *  - **Statistics.** Requires figures we can attribute to a dated, public
 *    source. Quoting round numbers we cannot stand behind is how a site loses
 *    the trust it is trying to build.
 */
export const GUIDE_POSTS: BlogPost[] = [
  {
    slug: "ai-whatsapp-marketing-2026",
    slugAr: "tasweeq-whatsapp-bil-zakaa-alistinaey-2026",
    metaTitle: "AI-Powered WhatsApp Marketing in 2026: What Actually Works",
    metaTitleAr: "التسويق عبر واتساب بالذكاء الاصطناعي 2026",
    metaDescription:
      "Where AI genuinely helps on WhatsApp — qualification, triage, Arabic dialects, personalisation — and where it still fails. A practical view for 2026.",
    metaDescriptionAr:
      "أين ينفع الذكاء الاصطناعي فعلاً في واتساب — التأهيل والفرز واللهجات العربية والتخصيص — وأين يفشل. نظرة عملية لعام 2026.",
    h1: "AI-powered WhatsApp marketing in 2026",
    h1Ar: "التسويق عبر واتساب بالذكاء الاصطناعي في 2026",
    category: "AI & Automation",
    categoryAr: "الذكاء الاصطناعي والأتمتة",
    readTime: "10 min read",
    date: "2026-09-02",
    author: {
      name: "Nick Sharma",
      nameAr: "نيك شارما",
      role: "Lead Solutions Architect & Technical Consultant",
      roleAr: "كبير مهندسي الحلول التقنية والمحادثات",
      credential: "WhatsApp Business Platform Specialist · Enterprise SaaS & GCC Commerce Architect",
      credentialAr: "خبير منصة واتساب للأعمال · مهندس برمجيات SaaS وحلول التجارة التحادثية بالخليج",
      bio: "Nick builds scalable WhatsApp Cloud API infrastructure, visual botflow engines, and automated conversational commerce systems for GCC enterprises.",
      bioAr: "يقود تطوير البنية التحتية لمنصة واتساب كلاود API ومحركات البوت الذكية وأنظمة التجارة التحادثية للشركات في الخليج.",
      avatarInitial: "N",
    },
    image: "/blog/whatsapp-ai-chatbot-builder.svg",
    imageAlt: "AI agent handling a WhatsApp conversation with human handover",
    imageAltAr: "وكيل ذكاء اصطناعي يدير محادثة واتساب مع تحويل لموظف",
    primaryKeyword: "AI-powered WhatsApp marketing",
    primaryKeywordAr: "التسويق عبر واتساب بالذكاء الاصطناعي",
    keywords: [
      "AI-powered WhatsApp marketing", "WhatsApp AI agents 2026", "WhatsApp Business AI",
      "WhatsApp generative AI", "WhatsApp AI customer service", "conversational commerce trends",
      "WhatsApp hyper-personalization", "WhatsApp Arabic chatbot", "WhatsApp AI chatbot",
      "WhatsApp marketing automation trends",
    ],
    keywordsAr: [
      "التسويق عبر واتساب بالذكاء الاصطناعي", "وكلاء الذكاء الاصطناعي واتساب 2026",
      "شات بوت واتساب بالذكاء الاصطناعي", "التجارة التحادثية", "شات بوت عربي واتساب",
    ],
    toc: [
      { id: "works", titleEn: "Where AI genuinely helps", titleAr: "أين ينفع الذكاء الاصطناعي فعلاً" },
      { id: "fails", titleEn: "Where it still fails", titleAr: "أين ما زال يفشل" },
      { id: "arabic", titleEn: "Arabic and Gulf dialects", titleAr: "العربية واللهجات الخليجية" },
      { id: "handover", titleEn: "Handover is the whole design", titleAr: "التحويل هو جوهر التصميم" },
      { id: "start", titleEn: "A sane place to start", titleAr: "نقطة بداية معقولة" },
    ],
    faqs: [
      { q: "Can AI replace my support team on WhatsApp?", a: "No, and businesses that try usually reverse it. AI handles the repetitive majority well — hours, prices, availability, order status — and should hand over the moment a conversation involves money, a complaint or an exception." },
      { q: "Will an AI bot understand Gulf Arabic?", a: "Modern models handle Gulf dialects far better than rule-based bots did, including mixed Arabic and English in one sentence. They are still weaker on local place names and slang, which is why a knowledge base of your own terms matters more than the model choice." },
      { q: "Is AI allowed under WhatsApp's rules?", a: "Yes. What matters to Meta is consent, template categories and the quality of the experience — not whether a human or a model composed the reply. An AI that annoys people damages your rating the same way a bad broadcast does." },
      { q: "What does AI actually cost on WhatsApp?", a: "Two separate costs: Meta's per-conversation charge, which is unchanged by AI, and the model usage itself, which is small per message but real at volume. AI reduces cost mainly by resolving conversations before they need a person." },
    ],
    faqsAr: [
      { q: "هل يستطيع الذكاء الاصطناعي استبدال فريق الدعم؟", a: "لا، ومن يحاول عادة يتراجع. الذكاء الاصطناعي يجيد التعامل مع الأسئلة المتكررة — الأوقات والأسعار والتوفر وحالة الطلب — ويجب أن يحوّل فوراً عند وجود مال أو شكوى أو حالة استثنائية." },
      { q: "هل يفهم البوت اللهجة الخليجية؟", a: "النماذج الحديثة أفضل بكثير من البوتات القديمة، وتتعامل مع خلط العربية والإنجليزية. تبقى أضعف في أسماء الأماكن المحلية، ولذلك قاعدة المعرفة الخاصة بك أهم من اختيار النموذج." },
      { q: "هل الذكاء الاصطناعي مسموح في واتساب؟", a: "نعم. ما يهم Meta هو الموافقة وفئات القوالب وجودة التجربة، لا من كتب الرد. والبوت المزعج يضر بتقييمك مثل الحملة السيئة." },
      { q: "ما تكلفته فعلياً؟", a: "تكلفتان منفصلتان: رسوم المحادثة من Meta ولا تتغير، واستخدام النموذج وهو بسيط لكل رسالة لكنه ملموس بالحجم. التوفير الحقيقي يأتي من إنهاء المحادثة قبل أن تحتاج موظفاً." },
    ],
    contentEn: `
The interesting question about AI on WhatsApp in 2026 is no longer whether a model can hold a conversation. It can. The question is which conversations you should let it hold.

---

## Where AI genuinely helps {#works}

**Qualification.** Asking budget, dates, party size and location, and recording the answers on the contact before a human reads anything. This is the clearest win: it is repetitive, structured, and the customer would rather do it now than wait.

**Triage.** Reading an incoming message and routing it — sales to sales, a complaint to a supervisor, a booking change to operations — is something models do reliably and rota-based routing does badly.

**Answering from your own material.** Pointed at your real prices, hours, policies and stock, a model answers the long tail of questions that no scripted flow anticipates. The knowledge base matters far more than the model.

**Drafting for agents.** Suggesting a reply the agent edits and sends is the most under-rated use: it keeps a human accountable while removing most of the typing.

## Where it still fails {#fails}

**Anything involving money.** Refunds, discounts, disputed charges. A model that improvises a refund policy creates a liability, and customers screenshot it.

**Confident wrong answers.** A model will invent availability or a price rather than say it does not know, unless you make "I don't know, let me get someone" an explicit, rewarded option.

**Complaints.** Someone angry does not want a well-worded paragraph, they want a person. Detecting frustration and escalating fast beats answering well.

**Anything regulated.** Medical, financial or legal specifics need a human, whatever the model appears to know.

## Arabic and Gulf dialects {#arabic}

This is where 2026 differs most from three years ago. Models now handle Gulf Arabic — including sentences that switch between Arabic and English mid-thought, which is how people here actually write — well enough to be useful rather than embarrassing.

Two things still need your input: **local names** (districts, landmarks, your own products) and **register**. A bot that replies in stiff Modern Standard Arabic to someone writing in Omani dialect reads as a foreign call centre. Feed it your own vocabulary.

## Handover is the whole design {#handover}

The measure of a good AI setup is not how much it answers. It is how cleanly it stops.

A working handover: the agent sees the whole conversation, not a summary; the customer is not asked to repeat themselves; the bot goes quiet on that thread rather than interrupting; and the trigger is generous — frustration, money, ambiguity, or simply being asked for a person.

Most bad WhatsApp bot experiences are not bad answers. They are a bot that would not let go.

## A sane place to start {#start}

1. Take the **twenty questions** your team answers most this month
2. Let AI handle only those, from your real data
3. Make **"talk to someone"** available in every reply
4. Read the transcripts weekly — the failures are the roadmap
5. Expand only where the transcripts show it earning it

That sequence gets you most of the value with none of the incidents.

---

The businesses getting real returns from AI on WhatsApp in 2026 are not the ones with the most autonomous bots. They are the ones that automated the boring 70% and made the other 30% reach a person faster.
`,
    contentAr: `
لم يعد السؤال في 2026 هل يستطيع النموذج إدارة محادثة — يستطيع. السؤال: أي محادثات تتركها له؟

---

## أين ينفع فعلاً {#works}

**التأهيل**: سؤال العميل عن الميزانية والتواريخ وعدد الأشخاص وتسجيل الإجابات قبل أن يقرأها موظف.

**الفرز**: قراءة الرسالة وتوجيهها للفريق الصحيح.

**الإجابة من موادك أنت**: أسعارك وأوقاتك وسياساتك ومخزونك. قاعدة المعرفة أهم من النموذج.

**صياغة ردود للموظف**: يقترح والموظف يعدل ويرسل — أكثر الاستخدامات فائدة وأقلها ضجيجاً.

## أين ما زال يفشل {#fails}

**كل ما يتعلق بالمال**: الاسترداد والخصومات والنزاعات.

**الإجابات الخاطئة بثقة**: سيخترع توفراً أو سعراً بدل قول "لا أعرف" ما لم تجعل ذلك خياراً صريحاً.

**الشكاوى**: الغاضب يريد إنساناً لا فقرة منسقة.

**المجالات المنظمة**: الطبية والمالية والقانونية.

## العربية واللهجات الخليجية {#arabic}

هنا الفرق الأكبر عن ثلاث سنوات مضت. النماذج تتعامل الآن مع اللهجة الخليجية وخلط العربية بالإنجليزية داخل الجملة الواحدة بشكل مفيد.

يبقى عليك أمران: **الأسماء المحلية** و**مستوى اللغة**. البوت الذي يرد بفصحى متكلفة على عميل يكتب باللهجة العمانية يبدو كمركز اتصال أجنبي.

## التحويل هو جوهر التصميم {#handover}

معيار النجاح ليس كم يجيب البوت، بل كم يحسن التوقف.

التحويل الجيد: الموظف يرى المحادثة كاملة، والعميل لا يعيد كلامه، والبوت يصمت في ذلك الخيط، والتحويل يحدث عند الغضب أو المال أو الغموض أو مجرد الطلب.

## نقطة بداية معقولة {#start}

1. اجمع **العشرين سؤالاً** الأكثر تكراراً هذا الشهر
2. دع الذكاء الاصطناعي يتولاها فقط، من بياناتك الحقيقية
3. اجعل **"التحدث مع موظف"** متاحاً في كل رد
4. اقرأ المحادثات أسبوعياً
5. توسّع حيث تثبت النتائج

---

من يحقق عائداً حقيقياً في 2026 ليسوا أصحاب أكثر البوتات استقلالية، بل من أتمتوا الـ70% المملة وجعلوا الـ30% الباقية تصل إلى إنسان أسرع.
`,
  },
  {
    slug: "whatsapp-marketing-checklist",
    slugAr: "qaimat-tahaqquq-tasweeq-whatsapp",
    metaTitle: "WhatsApp Marketing Checklist: Launch Without Getting Banned",
    metaTitleAr: "قائمة تحقق لإطلاق تسويق واتساب دون حظر",
    metaDescription:
      "A pre-launch checklist for WhatsApp Business: number and verification, opt-in, templates, routing, compliance and the metrics to watch in week one.",
    metaDescriptionAr:
      "قائمة تحقق قبل إطلاق واتساب بزنس: الرقم والتوثيق، الموافقة، القوالب، التوجيه، الامتثال، والمؤشرات في الأسبوع الأول.",
    h1: "WhatsApp marketing launch checklist",
    h1Ar: "قائمة تحقق لإطلاق التسويق عبر واتساب",
    category: "Guides",
    categoryAr: "أدلة",
    readTime: "8 min read",
    date: "2026-09-02",
    author: {
      name: "Nick Sharma",
      nameAr: "نيك شارما",
      role: "Lead Solutions Architect & Technical Consultant",
      roleAr: "كبير مهندسي الحلول التقنية والمحادثات",
      credential: "WhatsApp Business Platform Specialist · Enterprise SaaS & GCC Commerce Architect",
      credentialAr: "خبير منصة واتساب للأعمال · مهندس برمجيات SaaS وحلول التجارة التحادثية بالخليج",
      bio: "Nick builds scalable WhatsApp Cloud API infrastructure, visual botflow engines, and automated conversational commerce systems for GCC enterprises.",
      bioAr: "يقود تطوير البنية التحتية لمنصة واتساب كلاود API ومحركات البوت الذكية وأنظمة التجارة التحادثية للشركات في الخليج.",
      avatarInitial: "N",
    },
    image: "/blog/whatsapp-platform-comparison.svg",
    imageAlt: "WhatsApp Business launch checklist covering setup, opt-in and templates",
    imageAltAr: "قائمة تحقق لإطلاق واتساب بزنس تشمل الإعداد والموافقة والقوالب",
    primaryKeyword: "WhatsApp marketing checklist",
    primaryKeywordAr: "قائمة تحقق تسويق واتساب",
    keywords: [
      "WhatsApp marketing checklist", "WhatsApp marketing guide", "WhatsApp Business verification",
      "WhatsApp green tick", "WhatsApp opt-in compliance", "WhatsApp template approval",
      "WhatsApp quality rating", "WhatsApp messaging limits", "WhatsApp marketing best practices",
    ],
    keywordsAr: [
      "قائمة تحقق تسويق واتساب", "دليل تسويق واتساب", "توثيق واتساب بزنس",
      "العلامة الخضراء واتساب", "اعتماد قوالب واتساب", "تقييم جودة واتساب",
    ],
    toc: [
      { id: "before", titleEn: "Before you connect a number", titleAr: "قبل ربط الرقم" },
      { id: "setup", titleEn: "Setup and verification", titleAr: "الإعداد والتوثيق" },
      { id: "consent", titleEn: "Consent and opt-out", titleAr: "الموافقة وإلغاء الاشتراك" },
      { id: "content", titleEn: "Templates and routing", titleAr: "القوالب والتوجيه" },
      { id: "week-one", titleEn: "Week one: what to watch", titleAr: "الأسبوع الأول: ماذا تراقب" },
    ],
    faqs: [
      { q: "Can I use a number that is already on the WhatsApp Business app?", a: "Not at the same time. Migrating a number to the API ends its use in the consumer app and the chat history does not transfer, so plan the switch for a quiet period." },
      { q: "How long does template approval take?", a: "Usually minutes to a few hours, but a rejected template has to be edited and resubmitted. Submit your launch templates several days early rather than the night before." },
      { q: "Do I need the green tick to start?", a: "No. Verification is a separate application to Meta, judged on your business's public presence, and you can send messages without it. It is not something any provider can guarantee." },
      { q: "What messaging limit do I start on?", a: "New numbers start on a low daily tier and increase as you send quality traffic without blocks. Do not plan a first-day blast around a limit you do not have yet." },
    ],
    faqsAr: [
      { q: "هل أستطيع استخدام رقم مسجّل في تطبيق واتساب بزنس؟", a: "ليس في الوقت نفسه. نقل الرقم إلى الـAPI ينهي استخدامه في التطبيق ولا يُنقل سجل المحادثات، لذا خطط للنقل في فترة هادئة." },
      { q: "كم يستغرق اعتماد القوالب؟", a: "عادة من دقائق إلى ساعات، لكن القالب المرفوض يحتاج تعديلاً وإعادة إرسال. قدّم قوالب الإطلاق قبل الموعد بأيام." },
      { q: "هل أحتاج العلامة الخضراء للبدء؟", a: "لا. التوثيق طلب منفصل تقرره Meta بناءً على حضور نشاطك التجاري، ويمكنك الإرسال بدونه، ولا يستطيع أي مزود ضمانه." },
      { q: "ما هو حدي اليومي في البداية؟", a: "تبدأ الأرقام الجديدة بحد يومي منخفض يرتفع مع الإرسال الجيد دون حظر. لا تخطط لحملة ضخمة في اليوم الأول." },
    ],
    contentEn: `
Most WhatsApp launches fail in the first fortnight, and almost always for the same reasons: the number was not ready, consent was assumed, or the first campaign went to everybody at once.

Work through this before you send anything.

---

## Before you connect a number {#before}

- [ ] The number is **not currently active** on the WhatsApp Business app, or you accept that migrating ends it there
- [ ] You accept that **chat history does not transfer**
- [ ] The number can receive an SMS or call to verify
- [ ] It is a business number you will keep — changing it later means starting the reputation over
- [ ] Someone owns the inbox. A monitored number is the whole point

## Setup and verification {#setup}

- [ ] Meta Business Manager account created and business details match your trade licence
- [ ] Display name follows Meta's rules (it must relate to the business)
- [ ] Profile filled in: description, address, email, website
- [ ] Green tick applied for **if eligible** — it is Meta's decision and not required to send
- [ ] Payment method added, or you will stop sending mid-campaign

## Consent and opt-out {#consent}

- [ ] Every contact has opted in **to WhatsApp specifically**
- [ ] The opt-in source and date are recorded per contact
- [ ] Opt-out instructions appear in marketing messages
- [ ] Opt-out is honoured automatically, not by hand
- [ ] Someone can answer "where did this consent come from?" for any contact

## Templates and routing {#content}

- [ ] Launch templates submitted **days early**, not the night before
- [ ] Each template is in its honest category — miscategorising to save money gets accounts reviewed
- [ ] Arabic versions written, not machine-translated
- [ ] Every template has a reply path and a person who answers it
- [ ] Conversations route to the right team, and there is a rule for out-of-hours
- [ ] A human handover exists from every bot flow

## Week one: what to watch {#week-one}

- [ ] **Quality rating** in Business Manager, daily. It is the earliest warning you get
- [ ] **Opt-out rate** per campaign. Rising means your targeting is wrong
- [ ] **Reply rate**, not delivery rate
- [ ] **First response time** — a channel people reply to is a channel you must answer
- [ ] **Completed actions**: bookings, payments, recovered carts

---

### The one rule

Start with your most transactional message — a confirmation or a reminder — to your most engaged customers. It is cheap, it is welcome, and it builds the sending reputation that everything else depends on. Save the promotional broadcast until your quality rating has held green for a fortnight.
`,
    contentAr: `
تفشل معظم إطلاقات واتساب في الأسبوعين الأولين للأسباب نفسها: الرقم لم يكن جاهزاً، أو افتُرضت الموافقة، أو أُرسلت أول حملة للجميع دفعة واحدة.

---

## قبل ربط الرقم {#before}

- [ ] الرقم **غير مستخدم حالياً** في تطبيق واتساب بزنس، أو تقبل انتهاء استخدامه هناك
- [ ] تدرك أن **سجل المحادثات لا يُنقل**
- [ ] الرقم يستقبل رسالة أو مكالمة تحقق
- [ ] هو رقم عمل ستحتفظ به
- [ ] هناك شخص مسؤول عن متابعة الوارد

## الإعداد والتوثيق {#setup}

- [ ] حساب Meta Business Manager وبياناته مطابقة للسجل التجاري
- [ ] اسم العرض يلتزم بقواعد Meta
- [ ] الملف التجاري مكتمل
- [ ] طلب العلامة الخضراء **إن كنت مؤهلاً** — القرار لـMeta وليس شرطاً للإرسال
- [ ] وسيلة دفع مضافة

## الموافقة وإلغاء الاشتراك {#consent}

- [ ] كل جهة اتصال وافقت **على واتساب تحديداً**
- [ ] مصدر الموافقة وتاريخها مسجلان
- [ ] تعليمات إلغاء الاشتراك واضحة
- [ ] الإلغاء ينفذ تلقائياً

## القوالب والتوجيه {#content}

- [ ] القوالب مقدمة **قبل أيام** من الإطلاق
- [ ] كل قالب في فئته الصحيحة
- [ ] النسخ العربية مكتوبة لا مترجمة آلياً
- [ ] لكل قالب مسار رد وشخص يجيب
- [ ] التحويل لموظف متاح من كل مسار بوت

## الأسبوع الأول: ماذا تراقب {#week-one}

- [ ] **تقييم الجودة** يومياً
- [ ] **نسبة إلغاء الاشتراك** لكل حملة
- [ ] **نسبة الرد** لا نسبة التسليم
- [ ] **زمن أول رد**
- [ ] **الإجراءات المكتملة**

---

### القاعدة الوحيدة

ابدأ برسالتك الأكثر خدمية إلى عملائك الأكثر تفاعلاً، وأجّل الحملة الترويجية حتى يستقر تقييم الجودة أسبوعين.
`,
  },
  {
    slug: "how-to-use-whatsapp-for-marketing",
    slugAr: "kayfa-tastakhdim-whatsapp-lil-tasweeq",
    metaTitle: "How to Use WhatsApp for Marketing: A Practical Guide",
    metaTitleAr: "كيف تستخدم واتساب للتسويق: دليل عملي",
    metaDescription:
      "A step-by-step guide to WhatsApp marketing: getting opt-in, choosing templates, writing messages people reply to, and the mistakes that get numbers blocked.",
    metaDescriptionAr:
      "دليل عملي لتسويق واتساب: كيف تحصل على موافقة العملاء، واختيار القوالب، وكتابة رسائل تحصل على ردود، والأخطاء التي تؤدي لحظر رقمك.",
    h1: "How to use WhatsApp for marketing",
    h1Ar: "كيف تستخدم واتساب في التسويق",
    category: "Guides",
    categoryAr: "أدلة",
    readTime: "11 min read",
    date: "2026-09-02",
    author: {
      name: "Nick Sharma",
      nameAr: "نيك شارما",
      role: "Lead Solutions Architect & Technical Consultant",
      roleAr: "كبير مهندسي الحلول التقنية والمحادثات",
      credential: "WhatsApp Business Platform Specialist · Enterprise SaaS & GCC Commerce Architect",
      credentialAr: "خبير منصة واتساب للأعمال · مهندس برمجيات SaaS وحلول التجارة التحادثية بالخليج",
      bio: "Nick builds scalable WhatsApp Cloud API infrastructure, visual botflow engines, and automated conversational commerce systems for GCC enterprises.",
      bioAr: "يقود تطوير البنية التحتية لمنصة واتساب كلاود API ومحركات البوت الذكية وأنظمة التجارة التحادثية للشركات في الخليج.",
      avatarInitial: "N",
    },
    image: "/blog/whatsapp-marketing-funnel.svg",
    imageAlt: "WhatsApp marketing funnel from opt-in through to conversion",
    imageAltAr: "مسار تسويق واتساب من الاشتراك حتى التحويل",
    primaryKeyword: "how to use WhatsApp for marketing",
    primaryKeywordAr: "كيف تستخدم واتساب للتسويق",
    keywords: [
      "how to use WhatsApp for marketing", "WhatsApp marketing tips",
      "WhatsApp marketing best practices", "WhatsApp marketing mistakes",
      "WhatsApp marketing guide", "WhatsApp marketing strategy", "WhatsApp opt-in",
      "WhatsApp message templates", "WhatsApp quality rating",
    ],
    keywordsAr: [
      "كيف تستخدم واتساب للتسويق", "نصائح تسويق واتساب", "أفضل ممارسات تسويق واتساب",
      "أخطاء تسويق واتساب", "دليل تسويق واتساب", "استراتيجية تسويق واتساب",
    ],
    toc: [
      { id: "opt-in", titleEn: "Start with opt-in, not a contact list", titleAr: "ابدأ بالموافقة لا بقائمة أرقام" },
      { id: "templates", titleEn: "Understand the 24-hour window", titleAr: "افهم نافذة الـ24 ساعة" },
      { id: "writing", titleEn: "Write messages people reply to", titleAr: "اكتب رسائل تستحق الرد" },
      { id: "mistakes", titleEn: "Five mistakes that get numbers blocked", titleAr: "خمسة أخطاء تؤدي لحظر رقمك" },
      { id: "measure", titleEn: "Measure replies, not sends", titleAr: "قِس الردود لا الإرسال" },
    ],
    faqs: [
      { q: "Can I upload my existing contact list and start messaging?", a: "No. Every recipient must have opted in to hear from you on WhatsApp specifically. An email subscription, a purchase, or having someone's number is not consent, and messaging without it will damage your number's quality rating within days." },
      { q: "How much does WhatsApp marketing cost?", a: "Meta charges per 24-hour conversation, priced by category and country, and your platform charges separately. A marketing conversation in Oman costs more than a service one, which is why cost is controlled by sending fewer, better-targeted messages rather than by negotiating rates." },
      { q: "What is the 24-hour window?", a: "When a customer messages you, you can reply freely for 24 hours. Outside it you can only send pre-approved templates. This is the single rule that shapes how WhatsApp marketing is planned." },
      { q: "How do I avoid getting my number banned?", a: "Send only to people who opted in, make opting out easy and honour it immediately, keep templates accurate to their category, and watch your quality rating in Business Manager. Blocks and reports are what lower it — not volume by itself." },
    ],
    faqsAr: [
      { q: "هل يمكنني رفع قائمة أرقامي والبدء بالإرسال؟", a: "لا. يجب أن يكون كل مستلم قد وافق صراحة على استقبال رسائلك عبر واتساب تحديداً. الاشتراك في البريد أو الشراء منك أو امتلاك رقمه ليس موافقة، والإرسال بدونها يضر بتقييم جودة رقمك خلال أيام." },
      { q: "كم تكلفة التسويق عبر واتساب؟", a: "تحتسب Meta التكلفة لكل محادثة مدتها 24 ساعة حسب الفئة والدولة، وتحتسب المنصة رسومها بشكل منفصل. التحكم في التكلفة يكون بإرسال رسائل أقل وأدق استهدافاً." },
      { q: "ما هي نافذة الـ24 ساعة؟", a: "عندما يراسلك العميل يمكنك الرد بحرية لمدة 24 ساعة. بعدها لا يمكنك إلا إرسال قوالب معتمدة مسبقاً، وهذه القاعدة هي التي تشكل خطة التسويق كاملة." },
      { q: "كيف أتجنب حظر رقمي؟", a: "أرسل فقط لمن وافق، واجعل إلغاء الاشتراك سهلاً ونفذه فوراً، والتزم بفئة القالب الصحيحة، وراقب تقييم الجودة. الحظر والبلاغات هي ما يخفض التقييم وليس الحجم بحد ذاته." },
    ],
    contentEn: `
Most WhatsApp marketing advice starts with tools. It should start with permission, because permission is the only thing standing between a working channel and a banned number.

This guide covers the sequence that actually works: getting opt-in, understanding the messaging window, writing messages worth replying to, and the mistakes that quietly destroy a sender's reputation.

---

## 1. Start with opt-in, not a contact list {#opt-in}

The most common way businesses fail at WhatsApp is importing a list of numbers they already have and starting to send. Those people never agreed to hear from you **on WhatsApp**, and WhatsApp measures that directly: every block and every "report" pushes your quality rating down, and a low rating cuts your daily messaging limit before it eventually stops you entirely.

Consent that actually holds up:

- A checkbox at checkout that names WhatsApp explicitly
- A **Click-to-WhatsApp** ad, where the customer opens the conversation
- A QR code the customer chooses to scan
- Someone messaging you first

Record where each opt-in came from and when. You will need it if Meta asks, and you will want it when deciding who is safe to message.

## 2. Understand the 24-hour window {#templates}

This one rule shapes everything:

- **A customer messages you** → you may reply freely for 24 hours
- **Outside that window** → you may only send a **pre-approved template**

Templates are categorised, and the category is not cosmetic — it determines both price and what you are allowed to say:

| Category | For | Notes |
|---|---|---|
| **Utility** | Order updates, reminders, receipts | Cheapest; must relate to an existing transaction |
| **Authentication** | One-time codes | Strictly codes only |
| **Marketing** | Offers, launches, re-engagement | Most expensive, most likely to be blocked |

Miscategorising a marketing message as a utility one to save money is the fastest route to template rejection and account review.

## 3. Write messages people reply to {#writing}

WhatsApp is not email. A message that would look brief in an inbox looks like an essay in a chat.

What works:

- **Lead with the specific thing.** "Your Saturday 6am safari is confirmed" beats "An update on your booking."
- **One action per message.** Two links means neither gets tapped.
- **Use buttons rather than instructions.** A tappable "Confirm" beats "reply YES to confirm."
- **Write like the person, not the brand.** These arrive between messages from family.
- **Answer in the language they wrote in.** In the Gulf that means Arabic and English, and often Arabic in a Gulf dialect.

What does not work: block capitals, three emoji per line, and anything that reads like an SMS blast from 2010.

## 4. Five mistakes that get numbers blocked {#mistakes}

1. **Buying or scraping numbers.** Fastest possible ban, and it takes the number with it.
2. **Ignoring opt-outs.** If someone says stop, stop — including for "just one more" campaign.
3. **Sending at the wrong hour.** A marketing message at 11pm gets blocked rather than read.
4. **The same broadcast to everyone.** Irrelevance is what makes people report you.
5. **No reply path.** Sending from a number nobody monitors trains customers to block you.

Recovering a damaged quality rating takes weeks of good behaviour. Not damaging it is much cheaper.

## 5. Measure replies, not sends {#measure}

Delivered and read rates flatter you. The numbers that matter:

- **Reply rate** — did the message start a conversation?
- **Completed actions** — bookings made, carts recovered, payments taken
- **Opt-out rate** — the earliest warning that your targeting is wrong
- **Cost per completed action** — not cost per message

A campaign with a 20% reply rate and 40 bookings beats one with a 98% read rate and none.

---

### Where to start

Pick the one message you send most often — a booking confirmation, a payment reminder, an order update — and move it to WhatsApp first. It is transactional, so it is cheap and welcome. Get that working, watch your quality rating hold, and expand from there.
`,
    contentAr: `
تبدأ معظم النصائح حول التسويق عبر واتساب بالأدوات، والصحيح أن تبدأ بالموافقة، لأنها الفاصل الوحيد بين قناة ناجحة ورقم محظور.

---

## 1. ابدأ بالموافقة لا بقائمة الأرقام {#opt-in}

أكثر الأخطاء شيوعاً هو رفع قائمة أرقام موجودة والبدء بالإرسال. هؤلاء لم يوافقوا على استقبال رسائلك **عبر واتساب**، وواتساب يقيس ذلك مباشرة: كل حظر وكل بلاغ يخفض تقييم جودة رقمك، والتقييم المنخفض يقلل حدك اليومي ثم يوقفك.

الموافقة المقبولة تكون عبر: خانة اختيار عند الدفع تذكر واتساب صراحة، أو إعلان **الضغط للمراسلة**، أو رمز QR يمسحه العميل باختياره، أو أن يراسلك هو أولاً.

## 2. افهم نافذة الـ24 ساعة {#templates}

- **العميل يراسلك** ← يمكنك الرد بحرية لمدة 24 ساعة
- **خارج النافذة** ← قوالب معتمدة مسبقاً فقط

وفئة القالب ليست شكلية، فهي تحدد السعر وما يُسمح بقوله: **الخدمية** لتحديثات الطلبات والتذكيرات، و**التوثيق** لرموز التحقق فقط، و**التسويقية** للعروض وهي الأغلى والأكثر عرضة للحظر.

## 3. اكتب رسائل تستحق الرد {#writing}

واتساب ليس بريداً إلكترونياً. ابدأ بالمعلومة المحددة، واجعل لكل رسالة إجراءً واحداً، واستخدم الأزرار بدل التعليمات، واكتب بلغة إنسانية، وأجب بنفس لغة العميل — وفي الخليج يعني ذلك العربية والإنجليزية وغالباً اللهجة الخليجية.

## 4. خمسة أخطاء تؤدي لحظر رقمك {#mistakes}

1. شراء الأرقام أو جمعها.
2. تجاهل طلبات إلغاء الاشتراك.
3. الإرسال في أوقات غير مناسبة.
4. إرسال نفس الرسالة للجميع.
5. الإرسال من رقم لا يتابعه أحد.

## 5. قِس الردود لا الإرسال {#measure}

الأرقام المهمة: نسبة الرد، والإجراءات المكتملة، ونسبة إلغاء الاشتراك، وتكلفة كل إجراء مكتمل — لا تكلفة الرسالة.

---

### من أين تبدأ

اختر الرسالة التي ترسلها أكثر من غيرها — تأكيد حجز أو تذكير بدفعة — وانقلها إلى واتساب أولاً.
`,
  },
  {
    slug: "how-to-connect-woocommerce-shopify-whatsapp-guide",
    slugAr: "daleel-rabt-woocommerce-shopify-whatsapp",
    aliases: ["woocommerce-shopify-whatsapp-integration-guide", "woocommerce-whatsapp-plugin-guide"],
    metaTitle: "How to Connect WooCommerce & Shopify to WhatsApp: Complete Setup Guide (2026) | Fizmoh",
    metaTitleAr: "دليل ربط ووكومرس وشوبيفاي بواتساب: الدليل الشامل للإعداد والأتمتة (2026) | Fizmoh",
    metaDescription:
      "Step-by-step guide to connecting WooCommerce and Shopify to WhatsApp: recover abandoned carts with 1-click restore buttons, auto-sync order status and shipment tracking, and capture newsletter subscribers.",
    metaDescriptionAr:
      "دليل خطوة بخطوة لربط ووكومرس وشوبيفاي بواتساب: استعادة السلات المتروكة بنقرة واحدة، وتحديثات الطلبات والشحن التلقائية، واشتراكات النشرة البريدية.",
    h1: "How to Connect WooCommerce & Shopify to WhatsApp: Complete Setup Guide (2026)",
    h1Ar: "دليل ربط متجر ووكومرس وشوبيفاي بواتساب: الدليل الشامل للإعداد والأتمتة (2026)",
    category: "E-Commerce & Automation",
    categoryAr: "التجارة الإلكترونية والأتمتة",
    readTime: "12 min read",
    date: "2026-09-20",
    author: {
      name: "Nick Sharma",
      nameAr: "نيك شارما",
      role: "Lead Solutions Architect & Technical Consultant",
      roleAr: "كبير مهندسي الحلول التقنية والمحادثات",
      credential: "WhatsApp Business Platform Specialist · Enterprise SaaS & GCC Commerce Architect",
      credentialAr: "خبير منصة واتساب للأعمال · مهندس برمجيات SaaS وحلول التجارة التحادثية بالخليج",
      bio: "Nick designs high-throughput WhatsApp Cloud API infrastructure, visual botflow engines, and automated conversational commerce systems for GCC enterprises.",
      bioAr: "يقود تطوير البنية التحتية لمنصة واتساب كلاود API ومحركات البوت الذكية وأنظمة التجارة التحادثية للشركات في الخليج.",
      avatarInitial: "N",
    },
    image: "/blog/whatsapp-ecommerce-automation.svg",
    imageAlt: "WooCommerce and Shopify connected to WhatsApp Cloud API for automated cart recovery and order alerts",
    imageAltAr: "ربط متجر ووكومرس وشوبيفاي بواتساب كلاود API لاستعادة السلات وتحديثات الطلبات",
    primaryKeyword: "WooCommerce WhatsApp integration",
    primaryKeywordAr: "ربط ووكومرس بواتساب",
    keywords: [
      "WooCommerce WhatsApp integration",
      "Shopify WhatsApp abandoned cart",
      "WooCommerce abandoned cart WhatsApp",
      "WhatsApp order notifications WooCommerce",
      "Fizmoh Connect for WooCommerce",
      "WhatsApp button templates WooCommerce",
      "e-commerce WhatsApp automation GCC",
      "WooCommerce HPOS WhatsApp plugin",
    ],
    keywordsAr: [
      "ربط ووكومرس بواتساب",
      "استعادة السلات المتروكة واتساب",
      "إشعارات طلبات ووكومرس واتساب",
      "إضافة ووكومرس واتساب",
      "أتمتة شوبيفاي واتساب",
      "تتبع الشحنات واتساب ووكومرس",
    ],
    toc: [
      { id: "overview", titleEn: "Why WhatsApp for E-Commerce?", titleAr: "لماذا واتساب للتجارة الإلكترونية؟" },
      { id: "step-1", titleEn: "Step 1: Download & Install Fizmoh Connect", titleAr: "الخطوة 1: تحميل وتثبيت إضافة Fizmoh Connect" },
      { id: "step-2", titleEn: "Step 2: Store Pairing & API Credentials", titleAr: "الخطوة 2: ربط المتجر ومفاتيح API" },
      { id: "step-3", titleEn: "Step 3: Real-Time Abandoned Cart Typing Capture", titleAr: "الخطوة 3: التقاط السلات المتروكة أثناء الكتابة" },
      { id: "step-4", titleEn: "Step 4: Interactive Button Templates", titleAr: "الخطوة 4: قوالب الأزرار التفاعلية الافتراضية" },
      { id: "step-5", titleEn: "Step 5: Order Status & Live Shipment Tracking", titleAr: "الخطوة 5: تحديثات الطلبات وتتبع الشحنات" },
      { id: "step-6", titleEn: "Step 6: WhatsApp Newsletter Opt-In", titleAr: "الخطوة 6: التقاط المشتركين بالنشرة البريدية" },
      { id: "step-7", titleEn: "Step 7: Connecting Shopify via Webhooks", titleAr: "الخطوة 7: ربط متجر شوبيفاي عبر الويبهوك" },
      { id: "faqs", titleEn: "Frequently Asked Questions", titleAr: "الأسئلة الشائعة" },
    ],
    faqs: [
      {
        q: "Does Fizmoh Connect support WooCommerce High-Performance Order Storage (HPOS)?",
        a: "Yes. Fizmoh Connect explicitly declares full compatibility with WooCommerce HPOS (`custom_order_tables`) and legacy post-based order storage, ensuring smooth execution without admin incompatibility warnings.",
      },
      {
        q: "How does the abandoned cart capture work if the customer leaves before submitting?",
        a: "The plugin embeds a lightweight JavaScript beacon on the checkout page. As soon as a shopper enters their phone number and pauses typing for 1.2 seconds, their phone and cart contents are securely transmitted to Fizmoh. If the order is not completed within 15 minutes, automated recovery sequences trigger.",
      },
      {
        q: "Are the WhatsApp action buttons included by default?",
        a: "Yes. Out of the box, Fizmoh provides pre-built interactive templates featuring direct action buttons such as [Complete Order], [Claim 10% Off], [Track Order], and [Contact Support]. You can also map custom Meta-approved templates from your Fizmoh dashboard.",
      },
      {
        q: "Which shipment tracking plugins are supported?",
        a: "Fizmoh Connect natively detects tracking numbers, carrier names, and direct tracking URLs from Advanced Shipment Tracking (AST), WooCommerce Shipment Tracking, ShipStation, and custom order metadata.",
      },
    ],
    faqsAr: [
      {
        q: "هل تتوافق الإضافة مع نظام تخزين الطلبات عالي الأداء (HPOS) في ووكومرس؟",
        a: "نعم بالكامل. تم بناء إضافة Fizmoh Connect بتوافق معلن مع HPOS (`custom_order_tables`) والأنظمة التقليدية، لتعمل بكفاءة وسرعة ودون أي تنبيهات تعارض في ووردبريس.",
      },
      {
        q: "كيف يتم التقاط السلة إذا خرج العميل دون إتمام الطلب؟",
        a: "تتضمن الإضافة كوداً خفيفاً في صفحة الدفع يستمع لحقل رقم الهاتف. بمجرد أن يكتب العميل رقمه ويتوقف لأكثر من ثانية، تُرسل بيانات السلة مشفرة إلى Fizmoh. وإذا لم يتم الطلب خلال 15 دقيقة، تبدأ مسارات الاستعادة تلقائياً.",
      },
      {
        q: "هل الأزرار التفاعلية مدمجة بشكل افتراضي؟",
        a: "نعم. تأتي المنصة بقوالب أزرار تفاعلية جاهزة ومدمجة مثل [إتمام الطلب]، [احصل على خصم 10%]، [تتبع الشحنة]، و[خدمة العملاء]، مع إمكانية ربط قوالب ميتا المخصصة من لوحة التحكم.",
      },
      {
        q: "ما هي إضافات تتبع الشحنات المدعومة؟",
        a: "تدعم الإضافة استخراج أرقام وروابط التتبع تلقائياً من Advanced Shipment Tracking (AST)، وWooCommerce Shipment Tracking، وShipStation، والحقول المخصصة لشركات الشحن الخليجية.",
      },
    ],
    contentEn: `
In e-commerce across the GCC and Oman, email open rates hover between 12% and 18%, while **WhatsApp messages achieve an average open rate of 98% within the first 15 minutes**. 

When an online shopper abandons their shopping cart or wonders where their shipment is, waiting for an email or checking spam folders leads to lost revenue. By connecting your WooCommerce or Shopify store directly to WhatsApp, you turn high-intent moments into completed sales.

In this comprehensive guide, we walk step-by-step through installing the official **Fizmoh Connect for WooCommerce** plugin, configuring automated abandoned cart recovery with interactive buttons, syncing live shipment tracking, and connecting Shopify stores.

---

## Why WhatsApp for E-Commerce? {#overview}

Standard SMS notifications lack branding, support no interactive buttons, and cost significantly more per message. WhatsApp Cloud API provides:
- **Verified Business Profile**: Displays your store name, logo, website, and green verified badge.
- **1-Click Interactive Buttons**: Quick Reply buttons (\`[Need Help?]\`) and Direct URL Call-to-Action buttons (\`[Complete Order]\`, \`[Track Shipment]\`).
- **1-Click Cart Restoration**: Deep links automatically restore the customer's cart items, quantities, and apply recovery coupon discounts instantly.
- **Unified Two-Way Customer Inbox**: If a customer replies with questions about sizing or shipping to Muscat or Dubai, your team answers immediately inside the Fizmoh CRM inbox.

---

## Step 1: Download & Install Fizmoh Connect for WooCommerce {#step-1}

Fizmoh provides an official, dedicated WordPress plugin engineered specifically for modern WooCommerce setups:

1. **Download the Plugin Package**:
   Download the latest release directly:
   **[Download Fizmoh Connect for WooCommerce (.zip)](/api/ecommerce/plugin/download)** (v1.0.0, 17 KB)
2. **Install in WordPress**:
   - Log into your WordPress Admin Dashboard.
   - Navigate to **Plugins → Add New Plugin → Upload Plugin**.
   - Select \`fizmoh-connect-for-woocommerce.zip\` and click **Install Now**.
   - Once uploaded, click **Activate Plugin**.
3. **Verify HPOS Compatibility**:
   - Fizmoh Connect includes native declaration for WooCommerce High-Performance Order Storage (\`custom_order_tables\`).
   - Navigate to **WooCommerce → Settings → Advanced → Features** to confirm no incompatibility flags exist.

---

## Step 2: Store Pairing & API Credentials {#step-2}

Once activated, link your WordPress store to your Fizmoh workspace:

1. Open your **Fizmoh Dashboard** and navigate to **Settings → E-Commerce & Stores → Connected Stores**.
2. Click **Add Store Connection**, choose **WooCommerce**, and enter your Store Name and Domain URL (e.g., \`https://yourstore.com\`).
3. Click **Generate Pairing Credentials**. You will receive:
   - **Store Key**: \`fiz_store_...\`
   - **Fizmoh API Endpoint**: \`https://app.fizmoh.cloud/api/ecommerce\`
4. In your WordPress Admin, go to **WooCommerce → Fizmoh Connect Settings**.
5. Paste your **Store Key** and verify the Endpoint URL.
6. Click **Test Connection**. You should see a green success indicator: \`Connected to Fizmoh Cloud Workspace\`.

---

## Step 3: Real-Time Abandoned Cart Typing Capture {#step-3}

Nearly 70% of e-commerce shopping carts are abandoned before payment. Traditional abandoned cart plugins only trigger if the shopper reaches the final step and submits the form.

Fizmoh Connect solves this with **Real-Time Typing Capture**:
- When a customer types their phone number into the checkout billing or shipping fields, a debounced (1,200ms) client-side event captures the phone number and current cart contents.
- The cart token, items list, total value, and currency (e.g., \`OMR\` or \`AED\`) are securely registered with Fizmoh.
- **Automated 3-Stage Recovery Timeline**:
  - **Stage 1 (15 Minutes)**: Gentle reminder with a direct \`[Complete Order]\` button. Restores the exact cart session in one click.
  - **Stage 2 (4 Hours)**: High-converting incentive with an automated \`10% Off\` coupon code pre-applied to the restored cart link.
  - **Stage 3 (24 Hours)**: Urgency reminder notifying the customer that reserved stock will be released.

When the customer completes their order, Fizmoh automatically marks the cart as **Recovered** and halts subsequent recovery messages immediately.

---

## Step 4: Interactive Button Templates {#step-4}

Unlike plain text alerts, Fizmoh provides default interactive WhatsApp templates out of the box equipped with Call-to-Action (CTA) URL buttons and Quick Reply buttons:

| Event | Notification Purpose | Button 1 (CTA URL) | Button 2 (Quick Reply) |
| :--- | :--- | :--- | :--- |
| **Order Placed** | Immediate confirmation & invoice link | \`[Track Order]\` | \`[Contact Support]\` |
| **Processing** | Kitchen or warehouse packing update | \`[View Order]\` | \`[Need Changes?]\` |
| **Shipped** | Dispatched with tracking number | \`[Track Shipment]\` | \`[Delivery Help]\` |
| **Delivered** | Confirmation & review solicitation | \`[Leave Review]\` | \`[Shop Again]\` |
| **Abandoned Cart 1** | 15-minute quick recovery | \`[Complete Order]\` | \`[Need Help?]\` |
| **Abandoned Cart 2** | 4-hour recovery with 10% coupon | \`[Claim 10% Off]\` | \`[Ask Question]\` |
| **Newsletter Welcome** | Welcome gift & discount code | \`[Shop Now]\` | - |

In **Settings → E-Commerce & Stores → Templates & Buttons**, you can preview each message bubble live, send a test message to your personal WhatsApp number, or toggle to map your own custom Meta-approved templates.

---

## Step 5: Order Status & Live Shipment Tracking {#step-5}

Customers want to know exactly where their parcel is. Fizmoh Connect hooks into WooCommerce order status changes and extracts tracking data automatically:

- **Supported Tracking Plugins**:
  - **Advanced Shipment Tracking (AST)**: Reads tracking number, carrier name (Aramex, DHL, Oman Post, SMSA, etc.), and generated tracking link.
  - **WooCommerce Shipment Tracking**: Official WooCommerce extension fields.
  - **ShipStation & Custom Metadata**: Reads custom tracking keys automatically.
- **Automatic Dispatch**: When an order transitions from *Processing* to *Completed* or *Shipped*, Fizmoh dynamically inserts the carrier tracking URL into the WhatsApp \`[Track Shipment]\` button.

---

## Step 6: WhatsApp Newsletter Opt-In {#step-6}

Building a clean, compliant WhatsApp audience requires explicit customer opt-in:
1. **Checkout Checkbox**: Fizmoh Connect automatically injects an opt-in checkbox into the WooCommerce checkout page:
   > *"Receive order updates, tracking alerts, and exclusive VIP offers on WhatsApp."*
2. **Shortcode for Custom Pages**: Place \`[fizmoh_newsletter_box]\` on your homepage, blog, or landing pages to collect WhatsApp subscribers with name and phone number.
3. **Automated Welcome Gift**: Upon subscription, Fizmoh immediately dispatches a welcome template with a discount coupon button.
4. **Consent Timestamp**: Every subscriber record includes a verified ISO-8601 consent timestamp for compliance.

---

## Step 7: Connecting Shopify via Webhooks {#step-7}

If you operate a Shopify store, you can connect it directly using Fizmoh's secure Shopify webhook endpoint:

1. In your **Shopify Admin**, go to **Settings → Notifications → Webhooks**.
2. Create webhooks pointing to:
   \`https://app.fizmoh.cloud/api/ecommerce/webhooks/shopify\`
3. Select the following event topics:
   - \`orders/create\`
   - \`orders/updated\`
   - \`orders/fulfilled\`
   - \`checkouts/create\` & \`checkouts/update\`
4. In your Fizmoh Dashboard under **Connected Stores**, enter your Shopify **Shared HMAC Secret**. Fizmoh automatically verifies all incoming requests using HMAC SHA-256 signatures (\`X-Shopify-Hmac-Sha256\`).

---

## Summary & Next Steps {#faqs}

Integrating WhatsApp with WooCommerce and Shopify transforms your e-commerce operations from slow email notifications to instant, high-converting mobile conversations.

- **[Download Fizmoh Connect for WooCommerce](/api/ecommerce/plugin/download)**
- **[Explore the E-Commerce REST API Documentation](/docs#ecommerce)**
- **[Open Platform Settings to Connect Your Store](/admin)**
`,
    contentAr: `
في التجارة الإلكترونية عبر دول الخليج وسلطنة عمان، لا تتجاوز معدلات فتح رسائل البريد الإلكتروني حاجز الـ 15%، في حين **تحقق رسائل واتساب معدل فتح مذهلاً يصل إلى 98% خلال أول 15 دقيقة**.

عندما يترك المتسوق سلة مشترياته أو يبحث عن مكان شحنته، فإن الانتظار عبر الإيميل يؤدي غالباً إلى خسارة عملية البيع. ومن خلال ربط متجرك في ووكومرس أو شوبيفاي مباشرة بمنصة Fizmoh عبر واتساب كلاود API، يمكنك تحويل هذه اللحظات إلى مبيعات مؤكدة وأرباح مستعادة.

في هذا الدليل العملي، نستعرض خطوة بخطوة كيفية تثبيت إضافة **Fizmoh Connect for WooCommerce** الرسمية، وإعداد مسارات استعادة السلات المتروكة بأزرار تفاعلية، ومزامنة تتبع الشحنات، وربط متجر شوبيفاي.

---

## لماذا واتساب للتجارة الإلكترونية؟ {#overview}

الرسائل النصية القصيرة (SMS) تفتقر إلى الهوية الموثقة، ولا تدعم الأزرار التفاعلية، وتكلفتها باهظة. في المقابل، تمنحك منصة واتساب للأعمال عبر Fizmoh:
- **ملف تجاري موثق بالعلامة الخضراء**: يظهر اسم متجرك وشعارك ورابط الموقع الرسمي.
- **أزرار تفاعلية بنقرة واحدة**: أزرار روابط سريعة مثل \`[إتمام الطلب]\` و\`[تتبع الشحنة]\` وأزرار ردود سريعة مثل \`[خدمة العملاء]\`.
- **استعادة السلة بضغطة زر**: روابط ذكية تعيد بناء محتويات سلة العميل ومنتجاتها مع تطبيق كود الخصم فوراً.
- **صندوق وارد موحد للرد على الاستفسارات**: إذا سأل العميل عن المقاسات أو الشحن إلى مسقط أو الرياض، يجيب فريقك فوراً عبر صندوق CRM الموحد.

---

## الخطوة 1: تحميل وتثبيت إضافة Fizmoh Connect {#step-1}

توفر المنصة إضافة ووردبريس رسمية ومخصصة لمتاجر ووكومرس الحديثة:

1. **تحميل حزمة الإضافة**:
   قم بتحميل الإصدار المباشر:
   **[تحميل إضافة Fizmoh Connect for WooCommerce (.zip)](/api/ecommerce/plugin/download)** (الإصدار v1.0.0، الحجم 17 كيلوبايت)
2. **التثبيت في ووردبريس**:
   - توجه إلى لوحة تحكم ووردبريس.
   - اختر **الإضافات ← أضف إضافة جديدة ← رفع إضافة**.
   - اختر الملف \`fizmoh-connect-for-woocommerce.zip\` واضغط **التنصيب الآن**.
   - بعد اكتمال الرفع، اضغط **تفعيل الإضافة**.
3. **توافق كامل مع HPOS**:
   - تدعم الإضافة نظام تخزين الطلبات عالي الأداء الجديد في ووكومرس (\`custom_order_tables\`).
   - يمكنك التحقق من صفحة **WooCommerce ← الإعدادات ← متقدم ← الميزات** للتأكد من عدم وجود أي تعارض.

---

## الخطوة 2: ربط المتجر ومفاتيح API {#step-2}

بعد التفعيل، اربط متجرك بمساحة عمل Fizmoh:

1. افتح **لوحة تحكم Fizmoh** وتوجه إلى **الإعدادات ← التجارة الإلكترونية والمتاجر ← المتاجر المتصلة**.
2. اضغط **إضافة متجر جديد**، واختر **WooCommerce**، ثم أدخل اسم المتجر ورابط الموقع (مثل \`https://yourstore.com\`).
3. اضغط **توليد بيانات الربط**، لتحصل على:
   - **مفتاح المتجر (Store Key)**: \`fiz_store_...\`
   - **رابط واجهة API**: \`https://app.fizmoh.cloud/api/ecommerce\`
4. في ووردبريس، توجه إلى **WooCommerce ← إعدادات Fizmoh Connect**.
5. الصق **مفتاح المتجر** واضغط **اختبار الاتصال**. ستظهر لك رسالة نجاح خضراء: \`متصل بنجاح مع منصة Fizmoh Cloud\`.

---

## الخطوة 3: التقاط السلات المتروكة أثناء الكتابة {#step-3}

تُترك ما يقرب من 70% من سلات التسوق قبل الدفع. معظم إضافات السلات القديمة لا تلتقط السلة إلا إذا وصل العميل للخطوة الأخيرة وضغط إرسال.

تحل إضافة Fizmoh Connect هذه المشكلة عبر **الالتقاط الفوري أثناء الكتابة**:
- بمجرد أن يكتب المتسوق رقم هاتفه في حقل الجوال بصفحة إتمام الطلب ويتوقف لثانية واحدة، يتم إرسال الرقم ومحتويات السلة مشفرة إلى Fizmoh.
- تُحفظ السلة وقيمتها وعملتها (كالريال العماني أو الدرهم الإماراتي).
- **جدول الاستعادة التلقائي المكون من 3 مراحل**:
  - **المرحلة 1 (بعد 15 دقيقة)**: تذكير لطيف مع زر \`[إتمام الطلب]\` يعيد بناء السلة بنقرة واحدة.
  - **المرحلة 2 (بعد 4 ساعات)**: حافز قوي بكود خصم 10% يُطبق تلقائياً في رابط السلة.
  - **المرحلة 3 (بعد 24 ساعة)**: تذكير عاجل بإخلاء المنتجات المحجوزة في حال عدم إتمام الشراء.

وفور قيام العميل بالشراء، تتعرف المنصة على رقم الطلب وتوقف كافة رسائل الاستعادة المتبقية تلقائياً.

---

## الخطوة 4: قوالب الأزرار التفاعلية الافتراضية {#step-4}

تأتي المنصة مجهزة بقوالب أزرار تفاعلية افتراضية جاهزة للعمل فوراً:

| الحدث | هدف الإشعار | الزر 1 (رابط تفاعلي) | الزر 2 (رد سريع) |
| :--- | :--- | :--- | :--- |
| **تأكيد الطلب** | إشعار فوري وتأكيد الشراء | \`[تتبع الطلب]\` | \`[خدمة العملاء]\` |
| **قيد التجهيز** | إشعار تجهيز وتغليف المنتجات | \`[عرض الطلب]\` | \`[تعديل الطلب]\` |
| **تم الشحن** | إشعار خروج الشحنة مع رقم التتبع | \`[تتبع الشحنة]\` | \`[استفسار عن الشحن]\` |
| **تم التوصيل** | إشعار وصول الطلب وطلب التقييم | \`[تقييم المتجر]\` | \`[تسوق مجدداً]\` |
| **سلة متروكة (15 د)** | استعادة سريعة للسلة | \`[إتمام الطلب]\` | \`[مساعدة في الطلب]\` |
| **سلة متروكة (4 س)** | كود خصم 10% فوري | \`[استخدم خصم 10%]\` | \`[استفسار]\` |
| **النشرة البريدية** | هدية ترحيبية وكوبون | \`[تسوق الآن]\` | - |

من خلال **الإعدادات ← التجارة الإلكترونية والمتاجر ← القوالب والأزرار**، يمكنك استعراض فقاعة الرسالة تفاعلياً، وإرسال تجربة حية لهاتفك الشخصي، أو ربط قوالبك المعتمدة الخاصة من Meta.

---

## الخطوة 5: تحديثات الطلبات وتتبع الشحنات الحية {#step-5}

يرغب العملاء دائماً في معرفة موقع طرودهم بدقة. تلتقط إضافة Fizmoh Connect تغييرات حالة الطلب في ووكومرس وتستخرج بيانات التتبع:
- **دعم إضافات الشحن**: تدعم إضافة Advanced Shipment Tracking (AST)، وWooCommerce Shipment Tracking، وShipStation، بالإضافة للبيانات المخصصة لشركات الشحن كأرامكس وسمسا والبريد العماني وDHL.
- **تحديث الرابط تلقائياً**: عند تحويل الطلب إلى "تم الشحن"، تضع المنصة رابط التتبع المباشر لشركة الشحن داخل زر \`[تتبع الشحنة]\` تلقائياً في رسالة واتساب.

---

## الخطوة 6: التقاط المشتركين بالنشرة البريدية {#step-6}

لبناء جمهور واتساب ملتزم بسياسات Meta:
1. **خانة اختيار عند الدفع**: تضيف الإضافة خياراً مريحاً للعميل في صفحة الدفع:
   > *"أوافق على استلام تحديثات الطلب وتنبيهات الشحن والعروض الحصرية عبر واتساب."*
2. **كود قصير للصفحات**: يمكنك وضع الكود \`[fizmoh_newsletter_box]\` في أي صفحة أو مقال لجمع المشتركين بسهولة.
3. **هدية ترحيبية فورية**: يُرسل للمشترك فوراً قالب ترحيبي مع كود خصم للمشتريات القادمة.

---

## الخطوة 7: ربط متجر شوبيفاي عبر الويبهوك {#step-7}

إذا كنت تستخدم منصة شوبيفاي، يمكنك ربطها مباشرة عبر الويبهوك:
1. في لوحة تحكم شوبيفاي، توجه إلى **Settings ← Notifications ← Webhooks**.
2. أضف روابط الويبهوك موجهة إلى:
   \`https://app.fizmoh.cloud/api/ecommerce/webhooks/shopify\`
3. اختر أحداث الطلبات والشحن والسلات المتروكة.
4. أدخل مفتاح التوقيع المشترك في لوحة تحكم Fizmoh للتحقق من التوقيع المشفر (\`X-Shopify-Hmac-Sha256\`).

---

## ابدأ اليوم

- **[تحميل إضافة ووكومرس الرسمية (.zip)](/api/ecommerce/plugin/download)**
- **[دليل المطورين وواجهات REST API](/docs#ecommerce)**
- **[الانتقال لإعدادات المنصة وربط متجرك](/admin)**
`,
  },
]
