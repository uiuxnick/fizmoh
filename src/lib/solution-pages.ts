/**
 * Industry and comparison landing pages.
 *
 * Each entry is a real page with its own argument, not a template with the
 * industry name swapped in. Google treats near-identical pages generated from
 * one shell as doorway pages and suppresses them, so the pain points, the
 * workflow and the questions below are written per industry — and every
 * capability named is one the platform genuinely has.
 *
 * Feature modules land here later: `modules` is the list each page promises,
 * and it is deliberately drawn from what exists today rather than a roadmap.
 */

export type Faq = { q: string; a: string }

export type SolutionPage = {
  slug: string
  kind: "industry" | "compare"
  /** The one term this page is trying to win. */
  primaryKeyword: string
  keywords: string[]
  title: string
  metaTitle: string
  metaDescription: string
  h1: string
  intro: string
  /** What is actually going wrong for this reader today. */
  problems: { title: string; body: string }[]
  /** How the platform answers it, in the order it happens. */
  workflow: { step: string; body: string }[]
  modules: string[]
  faqs: Faq[]
}

export const SOLUTION_PAGES: SolutionPage[] = [
  {
    slug: "real-estate",
    kind: "industry",
    primaryKeyword: "WhatsApp marketing for real estate",
    keywords: [
      "WhatsApp marketing for real estate", "WhatsApp lead generation", "WhatsApp lead capture",
      "WhatsApp chatbot for business", "WhatsApp appointment scheduling", "WhatsApp CRM integration",
      "WhatsApp lead qualification bot", "WhatsApp marketing Oman",
    ],
    title: "Real estate",
    metaTitle: "WhatsApp Marketing for Real Estate Agencies",
    metaDescription:
      "Qualify property enquiries, book viewings and keep every lead in one shared inbox. WhatsApp Business API for real estate agencies in Oman and the GCC.",
    h1: "WhatsApp for real estate agencies",
    intro:
      "Property enquiries arrive at every hour, from portals, ads and referrals, and they go cold fast. The agent who replies first usually wins the viewing — which is a staffing problem, not a sales problem.",
    problems: [
      { title: "Enquiries scattered across personal phones", body: "Each agent answers from their own WhatsApp, so nobody can see the full pipeline, and a lead is lost the day that agent leaves." },
      { title: "The same five questions, all day", body: "Price, location, size, availability, viewing times. Answering them manually is most of an agent's day and none of their value." },
      { title: "Viewings arranged by phone tag", body: "Two or three messages to agree a time that a calendar could settle in one." },
    ],
    workflow: [
      { step: "Capture", body: "A Click-to-WhatsApp ad, a QR code on a board or a website widget opens a conversation on your official number — not an agent's personal one." },
      { step: "Qualify", body: "A bot asks budget, area, bedrooms and timeline before a human is involved, and records the answers on the contact." },
      { step: "Route", body: "The qualified enquiry lands in the shared inbox and is assigned to the agent covering that area." },
      { step: "Book", body: "Available viewing slots are offered in the chat and confirmed to a calendar, with an automatic reminder before the appointment." },
      { step: "Follow up", body: "Tasks and follow-up dates sit on the contact record, so a lead that is not ready today is not forgotten next month." },
    ],
    modules: ["Multi-agent shared inbox", "No-code bot builder", "Appointment scheduling", "Contact records and follow-up tasks", "Broadcast campaigns to opted-in buyers"],
    faqs: [
      { q: "Can several agents work from one WhatsApp number?", a: "Yes. One official business number feeds a shared inbox where conversations are assigned, reassigned and handed over, with internal notes that the customer never sees." },
      { q: "Will leads be lost if an agent leaves?", a: "No. Conversations and contact records belong to the workspace, not to the agent's phone, so a departing agent's pipeline stays with the agency." },
      { q: "Can it answer in Arabic?", a: "Yes, including Gulf dialects, and it replies in whichever language the customer writes in." },
    ],
  },
  {
    slug: "education",
    kind: "industry",
    primaryKeyword: "WhatsApp school communication",
    keywords: [
      "WhatsApp marketing for education", "WhatsApp school communication", "WhatsApp chatbot",
      "WhatsApp broadcast", "WhatsApp appointment scheduling", "WhatsApp notification messages",
      "WhatsApp marketing Oman",
    ],
    title: "Education",
    metaTitle: "WhatsApp for Schools, Institutes & Training Centres",
    metaDescription:
      "Handle admissions enquiries, course bookings and parent announcements on WhatsApp. Official Cloud API messaging for schools and training centres in Oman and the GCC.",
    h1: "WhatsApp for schools and training centres",
    intro:
      "Parents and prospective students already message on WhatsApp. The question is whether those messages reach one inbox your team can manage, or twelve phones nobody can audit.",
    problems: [
      { title: "Admissions season overwhelms the front desk", body: "The same intake questions arrive hundreds of times in a few weeks, and the answers decide whether a family enrols." },
      { title: "Announcements go out by group chat", body: "Broadcast groups leak every parent's number to every other parent, and there is no record of who received what." },
      { title: "Course bookings live in a spreadsheet", body: "Seats, schedules and payment status tracked by hand, with no link to the conversation that produced them." },
    ],
    workflow: [
      { step: "Answer", body: "A bot handles fees, intake dates, curriculum and location instantly, in Arabic or English, and hands over to staff for anything it cannot answer." },
      { step: "Enrol", body: "Course and seat availability is offered in the chat, with the place held while the parent decides." },
      { step: "Collect", body: "Fees are taken by card in Omani Rial or by bank transfer, and a receipt is issued automatically." },
      { step: "Announce", body: "Term dates, closures and events go out as opted-in broadcasts — individually, so no parent sees another's number." },
      { step: "Remind", body: "Automatic reminders before classes and payment deadlines." },
    ],
    modules: ["No-code bot builder with Arabic understanding", "Broadcast campaigns with opt-in tracking", "Seat and schedule booking", "Card payments and automatic receipts", "Multi-agent shared inbox"],
    faqs: [
      { q: "How is this different from a WhatsApp group?", a: "Broadcasts are sent individually, so recipients cannot see each other's numbers or reply to the whole list — and every send is recorded against consent." },
      { q: "Can parents pay fees in the chat?", a: "Yes. A card checkout link in Omani Rial, or bank transfer with a receipt uploaded in the conversation and verified by your staff." },
      { q: "Do we need a new phone number?", a: "You can connect an existing business number, provided it is not currently active on the consumer WhatsApp app." },
    ],
  },
  {
    slug: "retail",
    kind: "industry",
    primaryKeyword: "WhatsApp marketing for retail",
    keywords: [
      "WhatsApp marketing for retail", "WhatsApp catalog", "WhatsApp shop", "WhatsApp checkout",
      "WhatsApp cart recovery", "WhatsApp WooCommerce plugin", "WhatsApp order tracking",
      "WhatsApp conversational commerce",
    ],
    title: "Retail",
    metaTitle: "WhatsApp Commerce for Retail & Online Stores",
    metaDescription:
      "Sell from a catalog inside the chat, recover abandoned carts and keep WooCommerce in sync. WhatsApp conversational commerce for retailers in Oman and the GCC.",
    h1: "WhatsApp for retail and online stores",
    intro:
      "Most shoppers who abandon a cart never see the email about it. They do read WhatsApp — which is why the same reminder converts several times better in a chat than in an inbox.",
    problems: [
      { title: "Carts abandoned and never recovered", body: "The customer got distracted at checkout, and an email an hour later goes unopened." },
      { title: "Orders taken by hand in chat", body: "Staff retype items and prices into the store, and mistakes become refunds." },
      { title: "No record of who bought what", body: "Conversations and orders live in different places, so repeat customers are treated like strangers." },
    ],
    workflow: [
      { step: "Browse", body: "Customers open a product catalog inside the conversation, with prices and stock from your store." },
      { step: "Buy", body: "Cart and checkout happen in the chat, paid by card in Omani Rial or bank transfer." },
      { step: "Sync", body: "Two-way WooCommerce sync keeps products, stock and order status the same in both places without retyping." },
      { step: "Recover", body: "An abandoned checkout triggers a follow-up in the chat with a working link straight back to it." },
      { step: "Retain", body: "Purchase history sits on the contact, so restock alerts and offers go to people who actually bought." },
    ],
    modules: ["In-chat product catalog", "Two-way WooCommerce sync", "Card payments and bank transfer", "Abandoned cart recovery", "Broadcast campaigns and segments"],
    faqs: [
      { q: "Does it work with WooCommerce?", a: "Yes, with two-way sync: products and stock flow in, orders and status flow back, so the store stays the single source of truth." },
      { q: "How are payments taken?", a: "A hosted card checkout in Omani Rial, or bank transfer where the customer sends a receipt in the chat for your staff to verify." },
      { q: "Is cart recovery automatic?", a: "Yes — an unfinished checkout triggers a message with a link back to the exact order, and it stops once the order is paid." },
    ],
  },
  {
    slug: "finance",
    kind: "industry",
    primaryKeyword: "WhatsApp marketing for banks",
    keywords: [
      "WhatsApp marketing for banks", "WhatsApp marketing for insurance", "WhatsApp OTP messages",
      "WhatsApp notification messages", "WhatsApp data privacy", "WhatsApp consent management",
      "WhatsApp customer support",
    ],
    title: "Banking & insurance",
    metaTitle: "WhatsApp for Banks, Insurers & Financial Services",
    metaDescription:
      "Send authenticated notifications, handle service enquiries and manage consent on WhatsApp — with opt-in records and audit trails built in.",
    h1: "WhatsApp for banks and insurers",
    intro:
      "Financial messaging is judged on two things: whether the customer got it, and whether you can prove what you sent and that they agreed to receive it.",
    problems: [
      { title: "SMS costs rise while open rates fall", body: "One-time codes and statements sent by SMS are expensive and increasingly ignored." },
      { title: "Consent is undocumented", body: "Marketing goes out with no record of who opted in, when, or through what — which is the first thing a regulator asks for." },
      { title: "Service enquiries tie up the call centre", body: "Balance, branch hours, claim status and document checklists are asked constantly and answered manually." },
    ],
    workflow: [
      { step: "Notify", body: "Authentication and utility templates deliver codes, reminders and statements on a channel customers actually read." },
      { step: "Record", body: "Every opt-in and opt-out is logged with its source and timestamp, and honoured automatically thereafter." },
      { step: "Deflect", body: "A bot answers routine service questions and hands anything sensitive to a named agent." },
      { step: "Audit", body: "Who sent what, to whom, and who approved it — retained and searchable." },
    ],
    modules: ["Authentication and utility templates", "Consent logging with opt-out handling", "Multi-agent inbox with internal notes", "Audit log of staff actions", "Role-based access control"],
    faqs: [
      { q: "Can we send one-time passcodes?", a: "Yes, through Meta-approved authentication templates. Approval is required per template before any are sent." },
      { q: "How is consent handled?", a: "Opt-in is recorded with its source and timestamp, opt-out is honoured automatically, and both are retained as a consent log." },
      { q: "Is customer data kept in the region?", a: "That depends on your deployment. Ask us about data residency before you sign — we would rather answer it precisely than generally." },
    ],
  },
  {
    slug: "automotive",
    kind: "industry",
    primaryKeyword: "WhatsApp marketing for automotive",
    keywords: [
      "WhatsApp marketing for automotive", "WhatsApp booking system", "WhatsApp appointment reminders",
      "WhatsApp lead generation", "WhatsApp customer service", "WhatsApp chatbot",
    ],
    title: "Automotive",
    metaTitle: "WhatsApp for Car Dealers & Service Centres",
    metaDescription:
      "Book test drives and services, send maintenance reminders, and keep every enquiry in a shared inbox. WhatsApp Business API for automotive in Oman and the GCC.",
    h1: "WhatsApp for dealerships and service centres",
    intro:
      "A car enquiry and a service booking are the same conversation to the customer and two different systems to you. WhatsApp is where both start.",
    problems: [
      { title: "Test drive enquiries go unanswered after hours", body: "Interest peaks in the evening, when the showroom is closed." },
      { title: "Service reminders sent by SMS are ignored", body: "The customer misses the interval, and the workshop loses the booking." },
      { title: "Parts and status updates chased by phone", body: "Customers call for updates that a message could have delivered." },
    ],
    workflow: [
      { step: "Enquire", body: "A bot captures model, budget and timing at any hour, and books a test drive into a real slot." },
      { step: "Service", body: "Customers pick a service date from live availability, with a reminder before it." },
      { step: "Update", body: "Job status, parts arrival and collection-ready messages go out from the workshop's inbox." },
      { step: "Return", body: "Service intervals trigger a follow-up task, so the next booking is prompted rather than hoped for." },
    ],
    modules: ["Slot booking with live availability", "Automated reminders", "Multi-agent shared inbox", "Follow-up tasks on the contact record", "Broadcast campaigns for offers"],
    faqs: [
      { q: "Can customers book a service slot themselves?", a: "Yes. Available times come from your calendar, the slot is held while they confirm, and the booking is recorded against their record." },
      { q: "Can we message customers about offers?", a: "Only those who opted in. Consent is recorded and opt-outs are honoured automatically." },
      { q: "Does it handle both sales and aftersales?", a: "Yes — conversations can be routed to different teams from the same number." },
    ],
  },
  {
    slug: "whatsapp-vs-sms",
    kind: "compare",
    primaryKeyword: "WhatsApp vs SMS marketing",
    keywords: [
      "WhatsApp vs SMS marketing", "WhatsApp SMS alternative", "WhatsApp open rate",
      "WhatsApp cost per message", "WhatsApp marketing cost", "WhatsApp broadcast",
    ],
    title: "WhatsApp vs SMS",
    metaTitle: "WhatsApp vs SMS Marketing: Cost, Reach & Conversion",
    metaDescription:
      "An honest comparison of WhatsApp and SMS for business messaging: pricing models, delivery, two-way conversation, media, and when SMS is still the better choice.",
    h1: "WhatsApp vs SMS marketing",
    intro:
      "SMS reaches any phone with no app and no internet. WhatsApp reaches people who reply. Which matters more depends on what the message is for — and there are cases where SMS still wins.",
    problems: [
      { title: "Cost is charged differently", body: "SMS bills per message and per segment, so a long message costs several times a short one. WhatsApp bills per 24-hour conversation by category, so a long exchange can cost less than a single SMS." },
      { title: "SMS is one-way in practice", body: "Replies land in a queue nobody reads. On WhatsApp the reply is the point, and it opens a window for free follow-up." },
      { title: "No media, no buttons in SMS", body: "SMS cannot carry a catalog, a document, a location or a tappable button — all of which shorten the path to a purchase." },
    ],
    workflow: [
      { step: "Where SMS still wins", body: "Recipients with no smartphone or no data, and critical alerts that must arrive regardless of app installation. We will say so rather than sell you the wrong channel." },
      { step: "Where WhatsApp wins", body: "Anything conversational: bookings, order updates a customer might question, support, catalog browsing, and payment links." },
      { step: "Delivery you can see", body: "WhatsApp reports sent, delivered and read. SMS reports delivered at best." },
      { step: "The switch", body: "Most businesses keep SMS for one-time codes and move marketing and service conversations to WhatsApp." },
    ],
    modules: ["Broadcast campaigns", "Delivery and read reporting", "Two-way shared inbox", "Rich media and interactive buttons", "Consent and opt-out handling"],
    faqs: [
      { q: "Is WhatsApp cheaper than SMS?", a: "Usually for conversations, because WhatsApp charges per 24-hour window rather than per message — but not always. A single short alert to a non-smartphone user is cheaper by SMS." },
      { q: "Can I use both?", a: "Yes, and most do: SMS for one-time codes and critical alerts, WhatsApp for anything the customer might reply to." },
      { q: "Do I need opt-in for WhatsApp?", a: "Yes, and it is enforced more strictly than for SMS. Sending without it damages your number's quality rating." },
    ],
  },
  {
    slug: "whatsapp-vs-email",
    kind: "compare",
    primaryKeyword: "WhatsApp vs email marketing",
    keywords: [
      "WhatsApp vs email marketing", "WhatsApp open rate", "WhatsApp engagement rate",
      "WhatsApp newsletter", "WhatsApp ROI", "WhatsApp marketing ROI calculator",
    ],
    title: "WhatsApp vs email",
    metaTitle: "WhatsApp vs Email Marketing: Open Rates & Best Use",
    metaDescription:
      "How WhatsApp and email compare for marketing: open and reply rates, cost, list ownership, message length, and which channel suits which job.",
    h1: "WhatsApp vs email marketing",
    intro:
      "Email is cheap, unlimited in length and yours to keep. WhatsApp is read within minutes and replied to. They are not competitors so much as different jobs.",
    problems: [
      { title: "Email open rates keep falling", body: "Promotional mail is filtered before a human sees it, and the sender rarely knows." },
      { title: "WhatsApp is not a newsletter channel", body: "Long-form content belongs in email. Sending it on WhatsApp gets you muted, and mutes hurt your quality rating." },
      { title: "Cost per message is not the whole picture", body: "Email is nearly free to send and expensive to get read. WhatsApp costs per conversation and is nearly always read." },
    ],
    workflow: [
      { step: "Use email for", body: "Newsletters, long-form content, receipts and anything the customer may want to search for later." },
      { step: "Use WhatsApp for", body: "Time-sensitive messages, order and booking updates, support, and anything that needs a reply." },
      { step: "Together", body: "Announce in email, follow up on WhatsApp with the people who clicked — the follow-up is where the conversion happens." },
      { step: "Measure honestly", body: "Compare replies and completed actions, not opens. Opens are the least reliable number in email." },
    ],
    modules: ["Broadcast campaigns", "Segments and audience targeting", "Click and conversion tracking", "Shared inbox for replies", "Consent management"],
    faqs: [
      { q: "Should I move my newsletter to WhatsApp?", a: "No. Long-form content on WhatsApp gets muted, and mutes lower your quality rating. Keep the newsletter in email." },
      { q: "Which converts better?", a: "For time-sensitive, transactional and conversational messages, WhatsApp — largely because it gets read and replied to. For considered purchases with long content, email still holds up." },
      { q: "Can I build a WhatsApp list from my email list?", a: "Only with fresh consent. An email subscription is not consent to message on WhatsApp." },
    ],
  },
  {
    slug: "whatsapp-business-app-vs-api",
    kind: "compare",
    primaryKeyword: "WhatsApp Business App vs API",
    keywords: [
      "WhatsApp Business App vs API", "WhatsApp Business API pricing", "WhatsApp API cost",
      "WhatsApp Business App", "WhatsApp multi-agent inbox", "WhatsApp green tick",
      "WhatsApp API providers",
    ],
    title: "App vs API",
    metaTitle: "WhatsApp Business App vs API: Which Do You Need?",
    metaDescription:
      "The practical differences between the free WhatsApp Business App and the Cloud API: team access, automation, verification, cost, and when the app is genuinely enough.",
    h1: "WhatsApp Business App vs the Cloud API",
    intro:
      "The free app is enough for a lot of businesses, and we will tell you if you are one of them. The API matters when more than one person needs to answer, or when messages have to be sent by software.",
    problems: [
      { title: "The app is one phone, a few devices", body: "It cannot give a team a shared queue, assignment, or a record of who replied to whom." },
      { title: "No automation in the app", body: "Away messages and quick replies only. No booking, no payment, no catalog sync, no integration with your systems." },
      { title: "No verification path", body: "The green tick and higher messaging limits are only available through the API." },
    ],
    workflow: [
      { step: "Stay on the app if", body: "One or two people handle chats, volume is modest, and nothing needs to connect to your other systems. It is free — do not pay for what you do not need." },
      { step: "Move to the API when", body: "Several agents share the workload, you need bots or scheduled sends, you want the green tick, or messaging has to connect to bookings, stock or payments." },
      { step: "What changes", body: "The number moves to the API and stops working in the consumer app. Chat history does not transfer." },
      { step: "What it costs", body: "The API itself is billed by Meta per conversation; the platform is billed separately. Both are on the pricing page." },
    ],
    modules: ["Multi-agent shared inbox", "No-code bot builder", "Broadcast campaigns", "Bookings and payments", "Green tick verification support"],
    faqs: [
      { q: "Can I keep my existing number?", a: "Usually yes, provided it is not currently active on the consumer WhatsApp app. Migrating it ends its use there." },
      { q: "Will I lose my chat history?", a: "Yes. History from the app does not transfer to the API — plan the switch for a quiet period." },
      { q: "Do I get the green tick automatically?", a: "No. Verification is Meta's decision, based on your business's public presence. The API makes you eligible to apply; it does not guarantee approval." },
    ],
  },
]

export function solutionBySlug(slug: string): SolutionPage | undefined {
  return SOLUTION_PAGES.find(p => p.slug === slug.toLowerCase())
}

export const INDUSTRY_PAGES = SOLUTION_PAGES.filter(p => p.kind === "industry")
export const COMPARE_PAGES = SOLUTION_PAGES.filter(p => p.kind === "compare")
