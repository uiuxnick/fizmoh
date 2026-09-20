import { type ViewKey } from "@/lib/store"

export interface TourStep {
  target: string // CSS selector e.g. "[data-tour='nav-dashboard']"
  title: string
  description: string
  tip?: string
  placement?: "top" | "bottom" | "left" | "right" | "center"
  viewKey?: ViewKey
  tab?: string
  restaurantTab?: string
  campaignChannel?: string
  subscriberChannel?: string
}

export interface TourDefinition {
  id: string
  title: string
  subtitle: string
  category: "Overview" | "Operations" | "WhatsApp Commerce" | "Marketing" | "People" | "Insights" | "Platform"
  icon: string // emoji or icon name
  badge?: string
  viewKey?: ViewKey
  tab?: string
  restaurantTab?: string
  channelFilter?: string
  steps: TourStep[]
}

export interface MenuGuideItem {
  key: string
  label: string
  group: string
  description: string
  viewKey: ViewKey
  tourId: string
  submenus?: {
    key: string
    label: string
    description: string
    tourId: string
    tab?: string
    badge?: string
  }[]
}

/**
 * Complete registry of all application menus and their submenus
 * with full descriptive explanations.
 */
export const MENU_GUIDE_ITEMS: MenuGuideItem[] = [
  // --- Overview ---
  {
    key: "dashboard",
    label: "Dashboard",
    group: "Overview",
    description: "High-level command center with live revenue graphs, booking velocity, active conversations, and quick operational shortcuts.",
    viewKey: "dashboard",
    tourId: "tour-dashboard",
  },
  {
    key: "customer-site",
    label: "Customer Website",
    group: "Overview",
    description: "Your public customer-facing web storefront with automated booking flow, mobile responsiveness, and custom domain setup.",
    viewKey: "customer-site",
    tourId: "tour-customer-site",
  },

  // --- Operations ---
  {
    key: "tours",
    label: "Tours & Slots",
    group: "Operations",
    description: "Manage tours, excursions, capacity time slots, automatic seat decrements, pricing tiers, and cancellation policies.",
    viewKey: "tours",
    tourId: "tour-tours",
  },
  {
    key: "restaurant",
    label: "Smart Menu & Ordering",
    group: "Operations",
    description: "Complete restaurant operating system with live kitchen display, digital QR menus, table ordering, and waiter call alerts.",
    viewKey: "restaurant",
    tourId: "tour-restaurant",
    submenus: [
      { key: "rest-overview", label: "Overview", description: "Quick restaurant metrics, active tables, open tabs, and today's kitchen speed.", tourId: "tour-rest-overview", tab: "overview" },
      { key: "rest-kds", label: "Live Kitchen (KDS)", description: "Kitchen Display System for chefs with real-time ticket statuses and timers.", tourId: "tour-rest-kds", tab: "kitchen", badge: "LIVE" },
      { key: "rest-menus", label: "Digital Menus", description: "Organize menus into categories (Starters, Mains, Desserts, Beverages) and multi-currency menus.", tourId: "tour-rest-menus", tab: "menu" },
      { key: "rest-dishes", label: "Dishes & Pricing", description: "Create dishes, upload food photos, configure modifiers (spice level, add-ons) and Halal/Vegan tags.", tourId: "tour-rest-dishes", tab: "menu" },
      { key: "rest-tables", label: "Tables & QR Codes", description: "Generate branded, high-resolution QR codes for each dine-in table, VIP booth, or hotel room.", tourId: "tour-rest-tables", tab: "tables" },
      { key: "rest-orders", label: "Live Orders", description: "Real-time incoming dining, takeaway, and room service orders with instant status actions.", tourId: "tour-rest-orders", tab: "orders" },
      { key: "rest-waiter", label: "Waiter Calls", description: "Live customer bell requests: table calls for bill, water, or service assistance.", tourId: "tour-rest-waiter", tab: "waiter_requests" },
      { key: "rest-ai", label: "AI Menu Scanner", description: "Upload a photo or PDF of a printed menu and let AI automatically extract all dishes, categories, and prices.", tourId: "tour-rest-ai", tab: "ai_import", badge: "AI" },
      { key: "rest-branches", label: "Branches", description: "Manage multiple restaurant outlets, operating hours, phone numbers, and branch locations.", tourId: "tour-rest-branches", tab: "branches" },
    ],
  },
  {
    key: "bookings",
    label: "Bookings & Orders",
    group: "Operations",
    description: "Track customer bookings across WhatsApp, website, and manual entry with status filters, receipt checks, and automated ticket issuance.",
    viewKey: "bookings",
    tourId: "tour-bookings",
  },
  {
    key: "calendar",
    label: "Booking Calendar",
    group: "Operations",
    description: "Visual calendar view showing all scheduled departures, remaining seat allocations, and daily customer schedules.",
    viewKey: "calendar",
    tourId: "tour-calendar",
  },
  {
    key: "appointments",
    label: "Appointments",
    group: "Operations",
    description: "Service appointment scheduling system with time-slot intervals, specialist assignment, and customer reminder notifications.",
    viewKey: "appointments",
    tourId: "tour-appointments",
  },
  {
    key: "hospital",
    label: "Hospital",
    group: "Operations",
    description: "Healthcare clinic management module with outpatient appointments, chemotherapy scheduling, and patient history records.",
    viewKey: "hospital",
    tourId: "tour-hospital",
  },
  {
    key: "visa",
    label: "Visa Assistance",
    group: "Operations",
    description: "Streamline travel visa enquiries, passport document uploads, review workflows, and automated application status updates.",
    viewKey: "visa",
    tourId: "tour-visa",
  },
  {
    key: "payments",
    label: "Payment Verification",
    group: "Operations",
    description: "Manual bank transfer verification queue where staff inspect payment slips, approve orders, or request clarifications.",
    viewKey: "payments",
    tourId: "tour-payments",
  },

  // --- WhatsApp Commerce ---
  {
    key: "inbox",
    label: "WhatsApp Inbox",
    group: "WhatsApp Commerce",
    description: "Unified team inbox for WhatsApp, Instagram, and Facebook with AI co-pilot, bot automation toggles, templates, and customer CRM sidebar.",
    viewKey: "inbox",
    tourId: "tour-inbox",
  },
  {
    key: "catalog",
    label: "Catalog & Products",
    group: "WhatsApp Commerce",
    description: "Sync your physical and digital products directly into WhatsApp Native Commerce Catalog for instant in-chat cart shopping.",
    viewKey: "catalog",
    tourId: "tour-catalog",
  },
  {
    key: "woocommerce",
    label: "WooCommerce Store",
    group: "WhatsApp Commerce",
    description: "Deep integration with WordPress WooCommerce: automatic WhatsApp order notifications, abandon cart recovery, and product sync.",
    viewKey: "woocommerce",
    tourId: "tour-woocommerce",
  },
  {
    key: "ai-assistant",
    label: "AI Assistant",
    group: "WhatsApp Commerce",
    description: "Configure the autonomous AI assistant persona, tone of voice, knowledge retrieval rules, auto-reply triggers, and multi-language answers.",
    viewKey: "ai-assistant",
    tourId: "tour-ai-assistant",
  },
  {
    key: "knowledge",
    label: "Knowledge Base",
    group: "WhatsApp Commerce",
    description: "Upload business FAQs, policies, pricing guides, and PDF documents that the AI reads to answer customer questions accurately 24/7.",
    viewKey: "knowledge",
    tourId: "tour-knowledge",
  },
  {
    key: "bot-builder",
    label: "Bot & Automation",
    group: "WhatsApp Commerce",
    description: "Drag-and-drop visual botflow studio to build automated conversation flows, keyword triggers, menu cards, and handoff rules.",
    viewKey: "bot-builder",
    tourId: "tour-bot-builder",
  },
  {
    key: "whatsapp-numbers",
    label: "Numbers",
    group: "WhatsApp Commerce",
    description: "Manage connected WhatsApp Business phone numbers, Meta Cloud API statuses, quality ratings, and two-tier PIN verifications.",
    viewKey: "whatsapp-numbers",
    tourId: "tour-whatsapp-numbers",
  },
  {
    key: "whatsapp-setup",
    label: "Setup & Guide",
    group: "WhatsApp Commerce",
    description: "Official Meta Business API setup guide, webhook configuration, token verification, and connection diagnostics.",
    viewKey: "whatsapp-setup",
    tourId: "tour-whatsapp-setup",
  },

  // --- Marketing ---
  {
    key: "templates",
    label: "Templates",
    group: "Marketing",
    description: "Create, format, and sync Meta-approved WhatsApp HSM message templates with variables, buttons, and media attachments.",
    viewKey: "templates",
    tourId: "tour-templates",
  },
  {
    key: "campaigns",
    label: "Campaigns & Broadcast",
    group: "Marketing",
    description: "Broadcast targeted campaigns across WhatsApp, Instagram DM, Facebook Messenger, and Email with delivery analytics.",
    viewKey: "campaigns",
    tourId: "tour-campaigns",
    submenus: [
      { key: "camp-all", label: "All Campaigns", description: "Consolidated view of all active, scheduled, and completed marketing broadcasts.", tourId: "tour-camp-all" },
      { key: "camp-whatsapp", label: "WhatsApp Broadcast", description: "Send bulk WhatsApp notifications with approved templates to opted-in audiences.", tourId: "tour-camp-whatsapp" },
      { key: "camp-instagram", label: "Instagram Direct", description: "Automated direct message broadcasts to followers and story leads.", tourId: "tour-camp-instagram" },
      { key: "camp-facebook", label: "Facebook Messenger", description: "Targeted broadcast messages to your Facebook Page audience.", tourId: "tour-camp-facebook" },
      { key: "camp-comment", label: "Viral Comment-to-DM", description: "Automatically send private DMs and discount codes whenever users comment on your social posts.", tourId: "tour-camp-comment", badge: "VIRAL" },
      { key: "camp-email", label: "Email Campaigns", description: "Branded HTML email newsletters and transaction updates.", tourId: "tour-camp-email" },
    ],
  },
  {
    key: "subscribers",
    label: "Subscribers",
    group: "Marketing",
    description: "Centralized audience directory segmented by channel with engagement history, tags, and bulk CSV import/export.",
    viewKey: "subscribers",
    tourId: "tour-subscribers",
    submenus: [
      { key: "sub-all", label: "All Subscribers", description: "Master cross-channel subscriber database with loyalty levels and tags.", tourId: "tour-subs-all" },
      { key: "sub-whatsapp", label: "WhatsApp", description: "Opted-in WhatsApp contacts with opt-in dates and phone verification status.", tourId: "tour-subs-whatsapp" },
      { key: "sub-facebook", label: "Facebook", description: "Facebook Page contacts and active messenger chatters.", tourId: "tour-subs-facebook" },
      { key: "sub-instagram", label: "Instagram", description: "Instagram followers and direct message leads.", tourId: "tour-subs-instagram" },
    ],
  },
  {
    key: "coupons",
    label: "Coupons & Promotions",
    group: "Marketing",
    description: "Create promotional discount vouchers, percentage discounts, expiry schedules, and minimum spend requirements.",
    viewKey: "coupons",
    tourId: "tour-coupons",
  },
  {
    key: "content",
    label: "Content Management",
    group: "Marketing",
    description: "Manage landing page announcements, banners, marketing articles, and platform updates.",
    viewKey: "content",
    tourId: "tour-content",
  },
  {
    key: "digital-qr",
    label: "Digital QR Addons",
    group: "Marketing",
    description: "High-impact QR codes for Google review boosting, multi-link menus, and social profile engagement.",
    viewKey: "digital-qr",
    tourId: "tour-digital-qr",
  },
  {
    key: "digital-vcard",
    label: "Digital Business Card",
    group: "Marketing",
    description: "Interactive digital business card with 1-click 'Add to Contacts' (.vcf) button, social links, and WhatsApp chat shortcut.",
    viewKey: "digital-vcard",
    tourId: "tour-digital-vcard",
  },
  {
    key: "live-chat",
    label: "Website Chat Widget",
    group: "Marketing",
    description: "Embeddable website chat widget connecting visitors directly to your staff or WhatsApp automation.",
    viewKey: "live-chat",
    tourId: "tour-live-chat",
  },

  // --- People ---
  {
    key: "customers",
    label: "Customers & CRM",
    group: "People",
    description: "Comprehensive customer profiles with lifetime spend, booking history, loyalty points tier, notes, and direct WhatsApp links.",
    viewKey: "customers",
    tourId: "tour-customers",
  },
  {
    key: "staff",
    label: "Staff & Roles",
    group: "People",
    description: "Invite staff members, assign security roles (Admin, Agent, Manager), and audit operational actions.",
    viewKey: "staff",
    tourId: "tour-staff",
  },

  // --- Insights ---
  {
    key: "reports",
    label: "Reports & Analytics",
    group: "Insights",
    description: "Deep revenue analytics, conversion rates, channel performance, and booking trends over time.",
    viewKey: "reports",
    tourId: "tour-reports",
  },
  {
    key: "settings",
    label: "Settings",
    group: "Insights",
    description: "Configure business branding, currency, timezone, automated notifications, and system integrations.",
    viewKey: "settings",
    tourId: "tour-settings",
  },
  {
    key: "audit-logs",
    label: "Audit Logs",
    group: "Insights",
    description: "Tamper-evident security trail recording staff logins, setting modifications, and order changes.",
    viewKey: "audit-logs",
    tourId: "tour-audit-logs",
  },
  {
    key: "billing",
    label: "Plan & Billing",
    group: "Insights",
    description: "View active plan limits, invoices, payment methods, and upgrade modules as your business scales.",
    viewKey: "billing",
    tourId: "tour-billing",
  },
  {
    key: "platform",
    label: "Tenants",
    group: "Platform",
    description: "Platform operator console for managing SaaS tenant workspaces, health diagnostics, and system backups.",
    viewKey: "platform",
    tourId: "tour-platform",
  },
]

/**
 * Interactive step-by-step walkthrough definitions
 */
export const TOURS: Record<string, TourDefinition> = {
  // ==========================================
  // 1. GLOBAL NAVIGATION & MENU TOUR
  // ==========================================
  "tour-navigation": {
    id: "tour-navigation",
    title: "Platform Navigation Tour",
    subtitle: "A complete walkthrough of the primary sidebar, menu categories, submenus, and header controls.",
    category: "Overview",
    icon: "🧭",
    steps: [
      {
        target: "[data-tour='sidebar-brand']",
        title: "Workspace Brand & Identity",
        description: "This area displays your active business workspace. Clicking the brand logo will always return you to your home dashboard.",
        tip: "If you operate multiple businesses or branches, your current active business is highlighted here.",
        placement: "right",
      },
      {
        target: "[data-tour='group-overview']",
        title: "Overview Group",
        description: "Houses your high-level executive Dashboard and public Customer Website preview.",
        tip: "Use the Dashboard for daily pulse checks and revenue monitoring.",
        placement: "right",
      },
      {
        target: "[data-tour='nav-dashboard']",
        title: "Menu: Dashboard",
        description: "Visual summary of key metrics: total revenue, order count, open WhatsApp conversations, and real-time activity feeds.",
        placement: "right",
        viewKey: "dashboard",
      },
      {
        target: "[data-tour='nav-customer-site']",
        title: "Menu: Customer Website",
        description: "Preview and configure your mobile-friendly storefront where customers book tours, check availability, and place orders directly.",
        placement: "right",
        viewKey: "customer-site",
      },
      {
        target: "[data-tour='group-operations']",
        title: "Operations Group",
        description: "The core engine for day-to-day fulfillment: Tours, Smart Menu, Bookings, Calendar, Appointments, Hospital, and Payment Verifications.",
        placement: "right",
      },
      {
        target: "[data-tour='nav-tours']",
        title: "Menu: Tours & Slots",
        description: "Define tour itineraries, set slot capacities, auto-decrement seat counts upon booking, and configure pricing in OMR / USD.",
        placement: "right",
        viewKey: "tours",
      },
      {
        target: "[data-tour='nav-restaurant']",
        title: "Menu & Submenus: Smart Menu & Ordering",
        description: "Clicking this reveals 9 specialized submenus: Overview, Kitchen KDS, Digital Menus, Dishes & Pricing, Tables & QR Codes, Live Orders, Waiter Calls, AI Scanner, and Branches.",
        tip: "Everything needed to run a smart digital dining and ordering experience.",
        placement: "right",
        viewKey: "restaurant",
      },
      {
        target: "[data-tour='nav-bookings']",
        title: "Menu: Bookings & Orders",
        description: "Track all orders and departures with quick filters (Confirmed, Pending, Cancelled) and automated WhatsApp e-ticket delivery.",
        placement: "right",
        viewKey: "bookings",
      },
      {
        target: "[data-tour='nav-payments']",
        title: "Menu: Payment Verification",
        description: "A specialized inbox for manual bank transfer slips. Review customer receipt screenshots and verify or decline with one click.",
        placement: "right",
        viewKey: "payments",
      },
      {
        target: "[data-tour='group-whatsapp-commerce']",
        title: "WhatsApp Commerce Group",
        description: "Your conversational business suite: WhatsApp Inbox, Catalog, WooCommerce Store, AI Assistant, Knowledge Base, Bot & Automation, and Numbers.",
        placement: "right",
      },
      {
        target: "[data-tour='nav-inbox']",
        title: "Menu: WhatsApp Inbox",
        description: "Centralized multi-agent chat interface. Reply to customers, send WhatsApp templates, trigger AI replies, or toggle bot automation on/off per conversation.",
        placement: "right",
        viewKey: "inbox",
      },
      {
        target: "[data-tour='nav-bot-builder']",
        title: "Menu: Bot & Automation",
        description: "Build visual interactive conversation flows, custom keyword buttons, automated booking menus, and fallback triggers.",
        placement: "right",
        viewKey: "bot-builder",
      },
      {
        target: "[data-tour='nav-ai-assistant']",
        title: "Menu: AI Assistant & Knowledge Base",
        description: "Power your WhatsApp bot with generative AI that reads your uploaded knowledge docs and FAQs to answer complex customer questions 24/7.",
        placement: "right",
        viewKey: "ai-assistant",
      },
      {
        target: "[data-tour='group-marketing']",
        title: "Marketing Group",
        description: "Growth tools: Message Templates, Multi-Channel Broadcasts, Subscribers, Promo Coupons, Digital QR codes, and vCards.",
        placement: "right",
      },
      {
        target: "[data-tour='nav-campaigns']",
        title: "Menu & Submenus: Campaigns & Broadcast",
        description: "Features 6 channel submenus: All, WhatsApp Broadcast, Instagram Direct, Facebook Messenger, Viral Comment-to-DM, and Email Campaigns.",
        placement: "right",
        viewKey: "campaigns",
      },
      {
        target: "[data-tour='nav-subscribers']",
        title: "Menu & Submenus: Subscribers",
        description: "Audience segmentation submenus: All Subscribers, WhatsApp, Facebook, and Instagram contacts.",
        placement: "right",
        viewKey: "subscribers",
      },
      {
        target: "[data-tour='group-people']",
        title: "People Group",
        description: "Manage your Customer Relationship Management (CRM) directory and team staff permissions.",
        placement: "right",
      },
      {
        target: "[data-tour='group-insights']",
        title: "Insights Group",
        description: "Business intelligence reports, global settings, audit security logs, and subscription plan billing.",
        placement: "right",
      },
      {
        target: "[data-tour='header-controls']",
        title: "Top Header Controls",
        description: "Quick navigation shortcuts, system notifications, workspace switcher, and user profile management.",
        tip: "You can also launch this guided tour anytime from the header or sidebar!",
        placement: "bottom",
      },
    ],
  },

  // ==========================================
  // 2. DASHBOARD TOUR
  // ==========================================
  "tour-dashboard": {
    id: "tour-dashboard",
    title: "Dashboard Walkthrough",
    subtitle: "Understand your operational KPIs, revenue charts, and live channel activity.",
    category: "Overview",
    icon: "📊",
    viewKey: "dashboard",
    steps: [
      {
        target: "[data-tour='dashboard-kpis']",
        title: "Key Performance Indicators (KPIs)",
        description: "Monitor real-time revenue, total bookings, pending payment approvals, and active WhatsApp conversations at a glance.",
        tip: "Clicking 'Pending Verifications' will take you directly to the payment verification queue.",
        placement: "bottom",
        viewKey: "dashboard",
      },
      {
        target: "[data-tour='dashboard-chart']",
        title: "Revenue & Booking Trends",
        description: "Interactive chart displaying daily revenue growth and order volume comparisons over the selected time range.",
        placement: "bottom",
        viewKey: "dashboard",
      },
      {
        target: "[data-tour='dashboard-channels']",
        title: "Channel Performance Breakdown",
        description: "See where your bookings come from: WhatsApp bot conversations, online customer storefront, or direct agent entry.",
        placement: "top",
        viewKey: "dashboard",
      },
      {
        target: "[data-tour='dashboard-recent']",
        title: "Live Activity & Notification Stream",
        description: "Real-time feed of new orders, verified payments, incoming messages, and tour departures.",
        placement: "left",
        viewKey: "dashboard",
      },
    ],
  },

  // ==========================================
  // 3. TOURS & SLOTS TOUR
  // ==========================================
  "tour-tours": {
    id: "tour-tours",
    title: "Tours & Capacity Slots",
    subtitle: "Manage your tour catalogue, capacity slots, pricing, and automated booking limits.",
    category: "Operations",
    icon: "🗺️",
    viewKey: "tours",
    steps: [
      {
        target: "[data-tour='tours-header-actions']",
        title: "Create & Add Tours",
        description: "Click 'New Tour' to publish a new experience with title, description, cover photo, meeting location, and base pricing.",
        tip: "Tours created here are instantly available to both the WhatsApp booking bot and your customer storefront.",
        placement: "bottom",
        viewKey: "tours",
      },
      {
        target: "[data-tour='tours-list']",
        title: "Tour Catalogue",
        description: "Browse all active and archived tours. View departure durations, pricing in OMR, and quick status toggles.",
        placement: "top",
        viewKey: "tours",
      },
      {
        target: "[data-tour='tours-slot-config']",
        title: "Capacity Slots & Auto-Decrement",
        description: "Define daily departure times (e.g. 09:00 AM, 02:00 PM) and maximum seats (default: 8). When a booking is confirmed, available seats automatically decrement.",
        tip: "If all seats fill up, the WhatsApp bot automatically suggests alternative available departure times!",
        placement: "left",
        viewKey: "tours",
      },
    ],
  },

  // ==========================================
  // 4. SMART MENU & ORDERING (RESTAURANT)
  // ==========================================
  "tour-restaurant": {
    id: "tour-restaurant",
    title: "Smart Menu & Ordering System",
    subtitle: "Comprehensive guide to all 9 restaurant submenus, QR ordering, and live kitchen operations.",
    category: "Operations",
    icon: "🍽️",
    viewKey: "restaurant",
    steps: [
      {
        target: "[data-tour='rest-tab-overview']",
        title: "Submenu: Restaurant Overview",
        description: "Real-time restaurant snapshot: today's order revenue, busy dining tables, active kitchen tickets, and top ordered dishes.",
        placement: "bottom",
        viewKey: "restaurant",
        tab: "overview",
      },
      {
        target: "[data-tour='rest-tab-kitchen']",
        title: "Submenu: Live Kitchen Display (KDS)",
        description: "Interactive KDS screen for chefs and kitchen staff. Orders automatically appear in real-time with elapsed timers, color-coded status badges, and 1-tap 'Ready' action.",
        tip: "No paper tickets needed — keeps kitchen and waitstaff perfectly synchronized.",
        placement: "bottom",
        viewKey: "restaurant",
        tab: "kitchen",
      },
      {
        target: "[data-tour='rest-tab-menu']",
        title: "Submenu: Digital Menus & Dishes",
        description: "Create and organize your menu categories (Appetizers, Mains, Grills, Drinks) and individual dish cards with photos, descriptions, and prices.",
        tip: "Supports dietary tags like Halal, Vegan, Chef Special, and Spicy level.",
        placement: "bottom",
        viewKey: "restaurant",
        tab: "menu",
      },
      {
        target: "[data-tour='rest-tab-tables']",
        title: "Submenu: Tables & QR Codes",
        description: "Set up dine-in tables, VIP lounges, or hotel rooms. Generate instant branded QR codes that customers scan with their phones to browse and order without waiting for a waiter.",
        placement: "bottom",
        viewKey: "restaurant",
        tab: "tables",
      },
      {
        target: "[data-tour='rest-tab-orders']",
        title: "Submenu: Live Orders",
        description: "Manage incoming dining, takeaway, and room service orders. Change statuses from PENDING → PREPARING → SERVED → PAID with instant customer notification.",
        placement: "bottom",
        viewKey: "restaurant",
        tab: "orders",
      },
      {
        target: "[data-tour='rest-tab-waiter']",
        title: "Submenu: Waiter Calls",
        description: "Digital service bell! Whenever a guest clicks 'Call Waiter' or 'Request Bill' on their digital menu, an audio and visual alert pops up here immediately.",
        placement: "bottom",
        viewKey: "restaurant",
        tab: "waiter_requests",
      },
      {
        target: "[data-tour='rest-tab-ai']",
        title: "Submenu: AI Menu Scanner",
        description: "Snap a photo of your existing paper menu or upload a PDF. Our AI scanner instantly transcribes all dish names, descriptions, and prices into your digital catalogue.",
        tip: "Saves hours of manual typing!",
        placement: "bottom",
        viewKey: "restaurant",
        tab: "ai_import",
      },
      {
        target: "[data-tour='rest-tab-branches']",
        title: "Submenu: Branches",
        description: "Configure multi-location branches, individual operating hours, contact numbers, and specific branch menu assignments.",
        placement: "bottom",
        viewKey: "restaurant",
        tab: "branches",
      },
    ],
  },

  // ==========================================
  // 5. WHATSAPP INBOX TOUR
  // ==========================================
  "tour-inbox": {
    id: "tour-inbox",
    title: "WhatsApp Inbox & Live Chat",
    subtitle: "Master the multi-channel inbox, AI co-pilot, bot automation controls, and customer CRM tools.",
    category: "WhatsApp Commerce",
    icon: "💬",
    viewKey: "inbox",
    steps: [
      {
        target: "[data-tour='inbox-filter-chips']",
        title: "Conversation Filters & Channels",
        description: "Quickly filter conversations by status (All, Unread, Human Handled, Bot Active) or switch between WhatsApp, Instagram, and Facebook Messenger.",
        placement: "bottom",
        viewKey: "inbox",
      },
      {
        target: "[data-tour='inbox-list']",
        title: "Active Chat List",
        description: "Displays all recent customer interactions. Badges show unread count, detected customer intent (e.g. Booking, Pricing, Complaint), and assigned agent.",
        placement: "right",
        viewKey: "inbox",
      },
      {
        target: "[data-tour='inbox-bot-toggle']",
        title: "Bot Automation Switch (Human Handoff)",
        description: "Toggle the bot on or off per customer! When paused, the bot stops automated responses so a human agent can chat freely without interruption.",
        tip: "You can turn automation back on anytime with a single click.",
        placement: "bottom",
        viewKey: "inbox",
      },
      {
        target: "[data-tour='inbox-composer-tools']",
        title: "Quick Responses, Templates & Media",
        description: "Send approved WhatsApp HSM templates, voice notes, PDF vouchers, product catalog items, or canned responses with 1 tap.",
        placement: "top",
        viewKey: "inbox",
      },
      {
        target: "[data-tour='inbox-customer-drawer']",
        title: "Customer CRM & Booking History",
        description: "Inspect customer details directly beside the chat: phone number, loyalty tier, previous orders, payment statuses, and internal staff notes.",
        placement: "left",
        viewKey: "inbox",
      },
    ],
  },

  // ==========================================
  // 6. BOT & AUTOMATION (FLOW BUILDER)
  // ==========================================
  "tour-bot-builder": {
    id: "tour-bot-builder",
    title: "Bot Builder & Automation Flows",
    subtitle: "Design visual conversation flows, keyword triggers, automated booking, and AI fallbacks.",
    category: "WhatsApp Commerce",
    icon: "⚡",
    viewKey: "bot-builder",
    steps: [
      {
        target: "[data-tour='bot-flows-list']",
        title: "Automation Flows Library",
        description: "Manage your active automated flows: Welcome Greeting, Tour & Safari Booking, Restaurant Reservation, and Complaint Handoff.",
        placement: "bottom",
        viewKey: "bot-builder",
      },
      {
        target: "[data-tour='bot-create-btn']",
        title: "Create Flow or AI Draft",
        description: "Build a new flow from scratch or click 'AI Draft' to describe what you want in plain text (e.g. 'Flow to collect customer email and book a desert tour') and let AI generate the blocks.",
        placement: "bottom",
        viewKey: "bot-builder",
      },
      {
        target: "[data-tour='bot-trigger-config']",
        title: "Flow Triggers",
        description: "Define when this flow activates: on a specific keyword (e.g., 'book', 'menu', 'prices'), upon a new customer conversation, or scheduled time.",
        placement: "top",
        viewKey: "bot-builder",
      },
      {
        target: "[data-tour='bot-messages-editor']",
        title: "Interactive Messages & Buttons",
        description: "Configure interactive list menus, CTA buttons, quick reply pills, and media headers that customers tap on WhatsApp.",
        placement: "left",
        viewKey: "bot-builder",
      },
    ],
  },

  // ==========================================
  // 7. AI ASSISTANT & KNOWLEDGE BASE
  // ==========================================
  "tour-ai-assistant": {
    id: "tour-ai-assistant",
    title: "AI Assistant & Knowledge Retrieval",
    subtitle: "Train your AI assistant to answer customer questions using your business knowledge.",
    category: "WhatsApp Commerce",
    icon: "✨",
    viewKey: "ai-assistant",
    steps: [
      {
        target: "[data-tour='ai-assistant-toggle']",
        title: "AI Assistant Master Switch",
        description: "Enable or disable autonomous AI responses across your WhatsApp channels.",
        tip: "When disabled, only pre-configured button flows and human agents respond.",
        placement: "bottom",
        viewKey: "ai-assistant",
      },
      {
        target: "[data-tour='ai-instructions']",
        title: "System Prompt & Persona",
        description: "Define how the AI speaks to customers: friendly, professional, concise, and in your business voice. Set preferred language (Arabic / English / Multi-lingual).",
        placement: "top",
        viewKey: "ai-assistant",
      },
      {
        target: "[data-tour='ai-knowledge-sync']",
        title: "Knowledge Grounding",
        description: "The AI references your Knowledge Base articles, FAQs, and active Tour descriptions to prevent hallucinations and provide exact answers.",
        placement: "left",
        viewKey: "ai-assistant",
      },
    ],
  },

  // ==========================================
  // 8. CAMPAIGNS & BROADCAST
  // ==========================================
  "tour-campaigns": {
    id: "tour-campaigns",
    title: "Campaigns & Broadcast Suite",
    subtitle: "Guide to multi-channel broadcasts, WhatsApp templates, and comment-to-DM viral tools.",
    category: "Marketing",
    icon: "📢",
    viewKey: "campaigns",
    steps: [
      {
        target: "[data-tour='camp-channel-tabs']",
        title: "Channel Submenus",
        description: "Switch between WhatsApp Broadcast, Instagram Direct, Facebook Messenger, Viral Comment-to-DM, and Email Campaigns.",
        placement: "bottom",
        viewKey: "campaigns",
      },
      {
        target: "[data-tour='camp-create-btn']",
        title: "Create Campaign",
        description: "Launch a new broadcast. Select your recipient audience segment, pick a pre-approved template, personalize with dynamic variables, and schedule departure.",
        placement: "bottom",
        viewKey: "campaigns",
      },
      {
        target: "[data-tour='camp-analytics']",
        title: "Delivery & Read Analytics",
        description: "Real-time metrics on messages sent, delivered, read, and conversion clicks.",
        tip: "WhatsApp broadcasts consistently achieve 90%+ open rates within 15 minutes.",
        placement: "top",
        viewKey: "campaigns",
      },
    ],
  },

  // ==========================================
  // 9. BOOKINGS & ORDERS
  // ==========================================
  "tour-bookings": {
    id: "tour-bookings",
    title: "Bookings & Order Management",
    subtitle: "Track order fulfillment, payment status, tickets, and customer communications.",
    category: "Operations",
    icon: "🛍️",
    viewKey: "bookings",
    steps: [
      {
        target: "[data-tour='bookings-status-tabs']",
        title: "Status Pipeline",
        description: "Filter orders by status: All, Confirmed, Pending Payment, Completed, or Cancelled.",
        placement: "bottom",
        viewKey: "bookings",
      },
      {
        target: "[data-tour='bookings-search']",
        title: "Instant Search",
        description: "Look up any booking instantly by order number, customer phone number, or guest name.",
        placement: "bottom",
        viewKey: "bookings",
      },
      {
        target: "[data-tour='bookings-actions']",
        title: "Order Actions & Tickets",
        description: "Confirm bookings, download official PDF vouchers with QR verification codes, or trigger instant WhatsApp confirmation messages to the customer.",
        placement: "left",
        viewKey: "bookings",
      },
    ],
  },

  // ==========================================
  // 10. PAYMENT VERIFICATION
  // ==========================================
  "tour-payments": {
    id: "tour-payments",
    title: "Payment Verification Queue",
    subtitle: "Fast-track bank transfer slip inspections and automated confirmation delivery.",
    category: "Operations",
    icon: "💳",
    viewKey: "payments",
    steps: [
      {
        target: "[data-tour='payments-queue']",
        title: "Pending Slips Queue",
        description: "Review uploaded customer bank deposit slips or transfer screenshots with customer details and order amounts.",
        placement: "bottom",
        viewKey: "payments",
      },
      {
        target: "[data-tour='payments-approval']",
        title: "1-Click Verify or Decline",
        description: "Approve the payment to automatically update the booking to 'CONFIRMED', decrement seat slots, and send the customer their WhatsApp ticket voucher!",
        placement: "left",
        viewKey: "payments",
      },
    ],
  },

  // ==========================================
  // 11. CUSTOMERS & CRM
  // ==========================================
  "tour-customers": {
    id: "tour-customers",
    title: "Customers & CRM Directory",
    subtitle: "Understand customer profiles, loyalty tiers, lifetime booking value, and communication tags.",
    category: "People",
    icon: "👥",
    viewKey: "customers",
    steps: [
      {
        target: "[data-tour='customers-search']",
        title: "Search & Filter Customers",
        description: "Search across all past and prospective customers by name, phone number, or loyalty level (Silver, Gold, Platinum).",
        placement: "bottom",
        viewKey: "customers",
      },
      {
        target: "[data-tour='customers-table']",
        title: "Customer Records",
        description: "Displays lifetime spend in OMR, total trips booked, channel origin, and direct 1-click WhatsApp message launcher.",
        placement: "top",
        viewKey: "customers",
      },
    ],
  },

  // ==========================================
  // 12. SETTINGS & INTEGRATIONS
  // ==========================================
  "tour-settings": {
    id: "tour-settings",
    title: "Settings & System Configurations",
    subtitle: "Manage business profile, WhatsApp Cloud API tokens, webhooks, and preferences.",
    category: "Insights",
    icon: "⚙️",
    viewKey: "settings",
    steps: [
      {
        target: "[data-tour='settings-business-profile']",
        title: "Business Profile",
        description: "Update your business name, primary support email, default currency (OMR), timezone, and contact address.",
        placement: "bottom",
        viewKey: "settings",
      },
      {
        target: "[data-tour='settings-whatsapp-api']",
        title: "Meta Cloud API Integration",
        description: "Enter your WhatsApp Business Account ID (WABA), Phone Number ID, and permanent System User Access Token.",
        tip: "Use the 'Setup & Guide' menu if you need a step-by-step walkthrough on generating Meta Cloud API tokens.",
        placement: "top",
        viewKey: "settings",
      },
      {
        target: "[data-tour='settings-notifications']",
        title: "Staff Alert Numbers",
        description: "Configure phone numbers that receive immediate WhatsApp notifications when new bookings, high-value orders, or payment slips arrive.",
        placement: "left",
        viewKey: "settings",
      },
    ],
  },

  // ==========================================
  // SMART MENU & ORDERING SUBMENU TOURS
  // ==========================================
  "tour-rest-overview": {
    id: "tour-rest-overview",
    title: "Restaurant Operations Overview",
    subtitle: "High-level metrics on active dining tables, open tickets, and today's kitchen speed.",
    category: "Operations",
    icon: "🍽️",
    viewKey: "restaurant",
    restaurantTab: "overview",
    steps: [
      {
        target: "[data-tour='restaurant-overview-tab']",
        title: "Overview Metrics",
        description: "Review today's total dining covers, gross revenue, average table turn time, and pending requests.",
        placement: "bottom",
        viewKey: "restaurant",
        restaurantTab: "overview",
      },
    ],
  },
  "tour-rest-kds": {
    id: "tour-rest-kds",
    title: "Kitchen Display System (KDS)",
    subtitle: "Live kitchen workflow for head chefs, line cooks, and expo stations.",
    category: "Operations",
    icon: "🍳",
    viewKey: "restaurant",
    restaurantTab: "kitchen",
    steps: [
      {
        target: "[data-tour='restaurant-kitchen-tab']",
        title: "Kitchen Orders Queue",
        description: "Orders stream in real-time with elapsed timers, color-coded urgency, and 1-click status transitions (Preparing, Ready, Served).",
        tip: "Supports audible audio chimes on incoming orders so chefs never miss a ticket.",
        placement: "bottom",
        viewKey: "restaurant",
        restaurantTab: "kitchen",
      },
    ],
  },
  "tour-rest-menus": {
    id: "tour-rest-menus",
    title: "Digital Menus & Categories",
    subtitle: "Organize appetizers, main courses, beverages, desserts, and special tasting menus.",
    category: "Operations",
    icon: "📜",
    viewKey: "restaurant",
    restaurantTab: "menu",
    steps: [
      {
        target: "[data-tour='restaurant-menu-tab']",
        title: "Category Architecture",
        description: "Group your dishes logically with sorting order, display banners, and multi-language category names.",
        placement: "bottom",
        viewKey: "restaurant",
        restaurantTab: "menu",
      },
    ],
  },
  "tour-rest-dishes": {
    id: "tour-rest-dishes",
    title: "Dishes & Pricing Management",
    subtitle: "Manage dish items, photos, ingredients, calorie info, modifiers, and dietary badges.",
    category: "Operations",
    icon: "🍲",
    viewKey: "restaurant",
    restaurantTab: "menu",
    steps: [
      {
        target: "[data-tour='restaurant-menu-tab']",
        title: "Dish Configuration",
        description: "Set item prices, add modifier groups (e.g. spice level, choice of rice, extra sauce), and toggle out-of-stock items instantly.",
        placement: "bottom",
        viewKey: "restaurant",
        restaurantTab: "menu",
      },
    ],
  },
  "tour-rest-tables": {
    id: "tour-rest-tables",
    title: "Dining Tables & Branded QR Codes",
    subtitle: "Set up floor plans, tables, VIP booths, and download print-ready QR codes.",
    category: "Operations",
    icon: "🪑",
    viewKey: "restaurant",
    restaurantTab: "tables",
    steps: [
      {
        target: "[data-tour='restaurant-tables-tab']",
        title: "Table & QR Management",
        description: "Each table receives a unique, secure QR code. When scanned by guests, it automatically opens the table's digital menu and links all orders to that table.",
        tip: "Print QR stickers directly or export high-resolution SVG files for table acrylic stands.",
        placement: "bottom",
        viewKey: "restaurant",
        restaurantTab: "tables",
      },
    ],
  },
  "tour-rest-orders": {
    id: "tour-rest-orders",
    title: "Live Dining & Takeaway Orders",
    subtitle: "Real-time incoming orders from dine-in QR scans, takeaways, and WhatsApp orders.",
    category: "Operations",
    icon: "📋",
    viewKey: "restaurant",
    restaurantTab: "orders",
    steps: [
      {
        target: "[data-tour='restaurant-orders-tab']",
        title: "Live Orders Dispatch",
        description: "View incoming orders with customer details, selected dishes, notes, and payment statuses. Accept or reject with one click.",
        placement: "bottom",
        viewKey: "restaurant",
        restaurantTab: "orders",
      },
    ],
  },
  "tour-rest-waiter": {
    id: "tour-rest-waiter",
    title: "Digital Waiter Calls",
    subtitle: "Instant service bell alerts from tables requesting assistance, water, or the bill.",
    category: "Operations",
    icon: "🔔",
    viewKey: "restaurant",
    restaurantTab: "waiter_requests",
    steps: [
      {
        target: "[data-tour='restaurant-waiter_requests-tab']",
        title: "Waiter Requests Stream",
        description: "When a guest taps 'Call Waiter' or 'Request Bill' on their mobile screen, an instant alert appears here with table number and timestamp.",
        placement: "bottom",
        viewKey: "restaurant",
        restaurantTab: "waiter_requests",
      },
    ],
  },
  "tour-rest-ai": {
    id: "tour-rest-ai",
    title: "AI Menu Scanner & Importer",
    subtitle: "Upload a photo or PDF of a printed menu and let AI convert it into digital catalog items.",
    category: "Operations",
    icon: "🤖",
    viewKey: "restaurant",
    restaurantTab: "ai_import",
    steps: [
      {
        target: "[data-tour='restaurant-ai_import-tab']",
        title: "Instant AI Extraction",
        description: "Upload any existing paper menu image. Optical character recognition and LLMs extract dish names, descriptions, and prices in seconds.",
        placement: "bottom",
        viewKey: "restaurant",
        restaurantTab: "ai_import",
      },
    ],
  },
  "tour-rest-branches": {
    id: "tour-rest-branches",
    title: "Multi-Branch Restaurant Management",
    subtitle: "Manage multiple physical locations, branch menus, operating hours, and staff assignments.",
    category: "Operations",
    icon: "🏢",
    viewKey: "restaurant",
    restaurantTab: "branches",
    steps: [
      {
        target: "[data-tour='restaurant-branches-tab']",
        title: "Branch Switcher & Controls",
        description: "Create multiple restaurant outlets under one workspace. Customize menu availability and branch contact details per location.",
        placement: "bottom",
        viewKey: "restaurant",
        restaurantTab: "branches",
      },
    ],
  },

  // ==========================================
  // CAMPAIGNS SUBMENU TOURS
  // ==========================================
  "tour-camp-all": {
    id: "tour-camp-all",
    title: "All Marketing Campaigns",
    subtitle: "Track multi-channel promotional broadcasts across WhatsApp, Instagram, Facebook, and Email.",
    category: "Marketing",
    icon: "📢",
    viewKey: "campaigns",
    steps: [
      {
        target: "[data-tour='camp-create-btn']",
        title: "Campaign Creator",
        description: "Launch targeted marketing campaigns with audience segments and approved templates.",
        placement: "bottom",
        viewKey: "campaigns",
      },
    ],
  },
  "tour-camp-whatsapp": {
    id: "tour-camp-whatsapp",
    title: "WhatsApp Broadcast Campaigns",
    subtitle: "Deliver rich media WhatsApp messages directly to verified subscriber lists.",
    category: "Marketing",
    icon: "💬",
    viewKey: "campaigns",
    channelFilter: "WHATSAPP",
    steps: [
      {
        target: "[data-tour='camp-channel-tabs']",
        title: "WhatsApp Campaign Hub",
        description: "Select Meta-approved HSM templates, personalize variables (like {{name}}), and schedule delivery.",
        placement: "bottom",
        viewKey: "campaigns",
      },
    ],
  },
  "tour-camp-instagram": {
    id: "tour-camp-instagram",
    title: "Instagram DM Broadcasts",
    subtitle: "Engage Instagram followers and story leads with automated direct messages.",
    category: "Marketing",
    icon: "📸",
    viewKey: "campaigns",
    channelFilter: "INSTAGRAM",
    steps: [
      {
        target: "[data-tour='camp-channel-tabs']",
        title: "Instagram Broadcast Hub",
        description: "Broadcast announcements and promotions directly to your connected Instagram account contacts.",
        placement: "bottom",
        viewKey: "campaigns",
      },
    ],
  },
  "tour-camp-facebook": {
    id: "tour-camp-facebook",
    title: "Facebook Messenger Broadcasts",
    subtitle: "Send interactive messages and buttons to Facebook Page subscribers.",
    category: "Marketing",
    icon: "👥",
    viewKey: "campaigns",
    channelFilter: "FACEBOOK",
    steps: [
      {
        target: "[data-tour='camp-channel-tabs']",
        title: "Facebook Broadcast Hub",
        description: "Send updates, booking reminders, and announcements via official Facebook Messenger channels.",
        placement: "bottom",
        viewKey: "campaigns",
      },
    ],
  },
  "tour-camp-comment": {
    id: "tour-camp-comment",
    title: "Viral Comment-to-DM Automation",
    subtitle: "Automatically reply to social post comments and trigger private DMs with discount codes.",
    category: "Marketing",
    icon: "🔥",
    viewKey: "campaigns",
    steps: [
      {
        target: "[data-tour='camp-channel-tabs']",
        title: "Comment Automation Rules",
        description: "When followers comment a keyword like 'TOUR' or 'MENU' on your Instagram/Facebook posts, bot triggers an instant DM reply with the link.",
        placement: "bottom",
        viewKey: "campaigns",
      },
    ],
  },
  "tour-camp-email": {
    id: "tour-camp-email",
    title: "Email Marketing Campaigns",
    subtitle: "Send branded email announcements, newsletters, and special travel itineraries.",
    category: "Marketing",
    icon: "📧",
    viewKey: "campaigns",
    channelFilter: "EMAIL",
    steps: [
      {
        target: "[data-tour='camp-channel-tabs']",
        title: "Email Broadcasting",
        description: "Compose rich HTML emails with open tracking and link click analytics.",
        placement: "bottom",
        viewKey: "campaigns",
      },
    ],
  },

  // ==========================================
  // SUBSCRIBERS TOURS
  // ==========================================
  "tour-subscribers": {
    id: "tour-subscribers",
    title: "Audience & Subscribers Directory",
    subtitle: "Central directory of all opted-in contacts across WhatsApp, SMS, and Social DM channels.",
    category: "Marketing",
    icon: "👥",
    viewKey: "subscribers",
    steps: [
      {
        target: "[data-tour='nav-subscribers']",
        title: "Cross-Channel Audiences",
        description: "Explore all subscribers collected across your WhatsApp bot, website widget, and social campaigns.",
        placement: "right",
        viewKey: "subscribers",
      },
    ],
  },
  "tour-subs-all": {
    id: "tour-subs-all",
    title: "All Subscribers & Audiences",
    subtitle: "Central directory of all opted-in leads across WhatsApp, SMS, Instagram, and Email.",
    category: "Marketing",
    icon: "👥",
    viewKey: "subscribers",
    steps: [
      {
        target: "[data-tour='nav-subscribers']",
        title: "Master Audience Database",
        description: "Search, filter by engagement score, tags, and export subscriber CSV files.",
        placement: "right",
        viewKey: "subscribers",
      },
    ],
  },
  "tour-subs-whatsapp": {
    id: "tour-subs-whatsapp",
    title: "WhatsApp Opted-in Contacts",
    subtitle: "Audience segment specifically opted into WhatsApp Business communications.",
    category: "Marketing",
    icon: "💬",
    viewKey: "subscribers",
    steps: [
      {
        target: "[data-tour='nav-subscribers']",
        title: "WhatsApp Contacts Segment",
        description: "View opt-in timestamps, customer verification status, and recent conversation links.",
        placement: "right",
        viewKey: "subscribers",
      },
    ],
  },
  "tour-subs-facebook": {
    id: "tour-subs-facebook",
    title: "Facebook Messenger Subscribers",
    subtitle: "Audience segment from connected Facebook pages and ad click conversations.",
    category: "Marketing",
    icon: "👥",
    viewKey: "subscribers",
    steps: [
      {
        target: "[data-tour='nav-subscribers']",
        title: "Facebook Contacts",
        description: "Target messaging specifically to leads acquired from Facebook Ads and messenger chats.",
        placement: "right",
        viewKey: "subscribers",
      },
    ],
  },
  "tour-subs-instagram": {
    id: "tour-subs-instagram",
    title: "Instagram Followers & DM Leads",
    subtitle: "Audience segment acquired through Instagram direct messages and story mentions.",
    category: "Marketing",
    icon: "📸",
    viewKey: "subscribers",
    steps: [
      {
        target: "[data-tour='nav-subscribers']",
        title: "Instagram Leads",
        description: "Engage high-intent Instagram followers who reached out via DM or comment automation.",
        placement: "right",
        viewKey: "subscribers",
      },
    ],
  },

  // ==========================================
  // ADDITIONAL MENU TOURS
  // ==========================================
  "tour-customer-site": {
    id: "tour-customer-site",
    title: "Customer Storefront Website",
    subtitle: "Your public-facing online storefront for direct customer reservations.",
    category: "Overview",
    icon: "🌐",
    viewKey: "customer-site",
    steps: [
      {
        target: "[data-tour='nav-customer-site']",
        title: "Storefront Overview",
        description: "Your storefront allows travelers and diners to browse active tours, select dates, choose seat counts, and pay online.",
        placement: "right",
        viewKey: "customer-site",
      },
    ],
  },
  "tour-calendar": {
    id: "tour-calendar",
    title: "Booking & Departure Calendar",
    subtitle: "Visual day, week, and month schedule of all confirmed bookings and tour guides.",
    category: "Operations",
    icon: "📅",
    viewKey: "calendar",
    steps: [
      {
        target: "[data-tour='nav-calendar']",
        title: "Interactive Schedule",
        description: "Inspect upcoming departures, guide assignments, and slot capacities across the entire month.",
        placement: "right",
        viewKey: "calendar",
      },
    ],
  },
  "tour-appointments": {
    id: "tour-appointments",
    title: "Service Appointments",
    subtitle: "Consultation and private booking time-slot manager with automated SMS and WhatsApp reminders.",
    category: "Operations",
    icon: "⏰",
    viewKey: "appointments",
    steps: [
      {
        target: "[data-tour='nav-appointments']",
        title: "Appointment Management",
        description: "Manage one-on-one appointments, allocate specialists, and review customer confirmations.",
        placement: "right",
        viewKey: "appointments",
      },
    ],
  },
  "tour-hospital": {
    id: "tour-hospital",
    title: "Healthcare & Clinic Module",
    subtitle: "Outpatient appointments, chemotherapy chair reservations, and patient identification.",
    category: "Operations",
    icon: "🏥",
    viewKey: "hospital",
    steps: [
      {
        target: "[data-tour='nav-hospital']",
        title: "Clinic Scheduling",
        description: "Coordinate patient visits, chair slots, and automated appointment status alerts.",
        placement: "right",
        viewKey: "hospital",
      },
    ],
  },
  "tour-visa": {
    id: "tour-visa",
    title: "Visa Assistance & Document Portal",
    subtitle: "Manage tourist visa enquiries, passport submissions, and document approvals.",
    category: "Operations",
    icon: "🛂",
    viewKey: "visa",
    steps: [
      {
        target: "[data-tour='nav-visa']",
        title: "Visa Processing Pipeline",
        description: "Review uploaded customer passport photos, track approval stages, and send WhatsApp updates.",
        placement: "right",
        viewKey: "visa",
      },
    ],
  },
  "tour-catalog": {
    id: "tour-catalog",
    title: "WhatsApp Product Catalog",
    subtitle: "Sync physical and digital merchandise with WhatsApp native catalog shopping.",
    category: "WhatsApp Commerce",
    icon: "🛍️",
    viewKey: "catalog",
    steps: [
      {
        target: "[data-tour='nav-catalog']",
        title: "Meta Catalog Sync",
        description: "Manage product SKUs, prices in OMR, and images that appear inside customer WhatsApp chat windows.",
        placement: "right",
        viewKey: "catalog",
      },
    ],
  },
  "tour-woocommerce": {
    id: "tour-woocommerce",
    title: "WooCommerce Integration",
    subtitle: "Connect your WordPress WooCommerce store for instant order syncing and cart recovery.",
    category: "WhatsApp Commerce",
    icon: "🔌",
    viewKey: "woocommerce",
    steps: [
      {
        target: "[data-tour='nav-woocommerce']",
        title: "WooCommerce Sync",
        description: "Automate WhatsApp dispatch notifications whenever a customer purchases on your WordPress store.",
        placement: "right",
        viewKey: "woocommerce",
      },
    ],
  },
  "tour-knowledge": {
    id: "tour-knowledge",
    title: "Knowledge Base Management",
    subtitle: "Upload FAQs, policy documents, and tour details that ground the AI assistant.",
    category: "WhatsApp Commerce",
    icon: "📚",
    viewKey: "knowledge",
    steps: [
      {
        target: "[data-tour='nav-knowledge']",
        title: "Knowledge Repository",
        description: "Create articles and documents with markdown formatting. The AI vector-searches these articles to answer customer questions accurately.",
        placement: "right",
        viewKey: "knowledge",
      },
    ],
  },
  "tour-whatsapp-numbers": {
    id: "tour-whatsapp-numbers",
    title: "WhatsApp Phone Numbers",
    subtitle: "Manage connected WhatsApp Business API phone numbers, quality tiers, and display names.",
    category: "WhatsApp Commerce",
    icon: "📱",
    viewKey: "whatsapp-numbers",
    steps: [
      {
        target: "[data-tour='nav-whatsapp-numbers']",
        title: "Phone Number Status",
        description: "Check quality ratings (GREEN/HIGH), messaging limits (1K, 10K, Unlimited), and two-step verification PINs.",
        placement: "right",
        viewKey: "whatsapp-numbers",
      },
    ],
  },
  "tour-whatsapp-setup": {
    id: "tour-whatsapp-setup",
    title: "WhatsApp Cloud API Setup Guide",
    subtitle: "Step-by-step interactive setup for connecting Meta Cloud API to your workspace.",
    category: "WhatsApp Commerce",
    icon: "🛠️",
    viewKey: "whatsapp-setup",
    steps: [
      {
        target: "[data-tour='nav-whatsapp-setup']",
        title: "Meta API Setup",
        description: "Follow the guided wizard to configure webhooks, verify Meta tokens, and register production phone numbers.",
        placement: "right",
        viewKey: "whatsapp-setup",
      },
    ],
  },
  "tour-templates": {
    id: "tour-templates",
    title: "Meta HSM Message Templates",
    subtitle: "Create, submit, and manage pre-approved WhatsApp message templates.",
    category: "Marketing",
    icon: "📝",
    viewKey: "templates",
    steps: [
      {
        target: "[data-tour='nav-templates']",
        title: "Template Studio",
        description: "Compose utility, marketing, and authentication templates with quick-reply buttons and call-to-action links.",
        placement: "right",
        viewKey: "templates",
      },
    ],
  },
  "tour-coupons": {
    id: "tour-coupons",
    title: "Coupons & Promotional Codes",
    subtitle: "Create promotional discount vouchers and seasonal coupon campaigns.",
    category: "Marketing",
    icon: "🏷️",
    viewKey: "coupons",
    steps: [
      {
        target: "[data-tour='nav-coupons']",
        title: "Coupon Configuration",
        description: "Define discount percentage or fixed OMR amounts, maximum uses, expiration dates, and minimum order values.",
        placement: "right",
        viewKey: "coupons",
      },
    ],
  },
  "tour-content": {
    id: "tour-content",
    title: "Landing Page Content Management",
    subtitle: "Manage homepage banners, promotional highlights, and What's New changelogs.",
    category: "Marketing",
    icon: "📰",
    viewKey: "content",
    steps: [
      {
        target: "[data-tour='nav-content']",
        title: "Content & Announcements",
        description: "Update public news, feature releases, and promotional banners shown on the customer storefront.",
        placement: "right",
        viewKey: "content",
      },
    ],
  },
  "tour-digital-qr": {
    id: "tour-digital-qr",
    title: "Digital Review & Feedback QR",
    subtitle: "Generate smart QR codes that filter positive reviews to Google and capture private feedback.",
    category: "Marketing",
    icon: "⭐",
    viewKey: "digital-qr",
    steps: [
      {
        target: "[data-tour='nav-digital-qr']",
        title: "Google Review Booster",
        description: "5-star ratings route happy customers to Google Maps reviews; lower ratings direct them to a private manager feedback form.",
        placement: "right",
        viewKey: "digital-qr",
      },
    ],
  },
  "tour-digital-vcard": {
    id: "tour-digital-vcard",
    title: "Digital Business Card (vCard)",
    subtitle: "Shareable digital contact card with instant 'Save to Contacts' (.vcf) button.",
    category: "Marketing",
    icon: "📇",
    viewKey: "digital-vcard",
    steps: [
      {
        target: "[data-tour='nav-digital-vcard']",
        title: "Digital vCard Hub",
        description: "Share your business contact card with 1 tap. Works seamlessly on iPhone and Android devices.",
        placement: "right",
        viewKey: "digital-vcard",
      },
    ],
  },
  "tour-live-chat": {
    id: "tour-live-chat",
    title: "Website Live Chat Widget",
    subtitle: "Embeddable website chat widget connected directly to your WhatsApp and team inbox.",
    category: "Marketing",
    icon: "💬",
    viewKey: "live-chat",
    steps: [
      {
        target: "[data-tour='nav-live-chat']",
        title: "Widget Customization",
        description: "Customize theme colors, greeting text, brand avatar, and auto-response behavior for website visitors.",
        placement: "right",
        viewKey: "live-chat",
      },
    ],
  },
  "tour-staff": {
    id: "tour-staff",
    title: "Staff & Team Permissions",
    subtitle: "Invite team members, assign operational roles, and enforce security policies.",
    category: "People",
    icon: "👥",
    viewKey: "staff",
    steps: [
      {
        target: "[data-tour='nav-staff']",
        title: "Staff Directory",
        description: "Manage agent accounts, administrator privileges, and view active sessions.",
        placement: "right",
        viewKey: "staff",
      },
    ],
  },
  "tour-reports": {
    id: "tour-reports",
    title: "Business Reports & Analytics",
    subtitle: "Comprehensive revenue graphs, order volume trends, and conversion performance.",
    category: "Insights",
    icon: "📊",
    viewKey: "reports",
    steps: [
      {
        target: "[data-tour='nav-reports']",
        title: "Executive Reports",
        description: "Track gross booking value, channel conversion rates, peak booking hours, and export audit-ready CSV reports.",
        placement: "right",
        viewKey: "reports",
      },
    ],
  },
  "tour-audit-logs": {
    id: "tour-audit-logs",
    title: "System Audit & Security Logs",
    subtitle: "Tamper-evident activity trail recording every administrative action.",
    category: "Insights",
    icon: "🔒",
    viewKey: "audit-logs",
    steps: [
      {
        target: "[data-tour='nav-audit-logs']",
        title: "Audit Trail",
        description: "Inspect timestamped records of logins, price modifications, slot edits, and order cancellations.",
        placement: "right",
        viewKey: "audit-logs",
      },
    ],
  },
  "tour-billing": {
    id: "tour-billing",
    title: "Plan, Quotas & Invoices",
    subtitle: "Manage your subscription tier, usage quotas, payment methods, and billing history.",
    category: "Insights",
    icon: "💳",
    viewKey: "billing",
    steps: [
      {
        target: "[data-tour='nav-billing']",
        title: "Plan & Usage",
        description: "View remaining WhatsApp conversation credits, active add-ons, and download monthly VAT invoices.",
        placement: "right",
        viewKey: "billing",
      },
    ],
  },
  "tour-platform": {
    id: "tour-platform",
    title: "Platform Tenant Administration",
    subtitle: "Operator console for managing multi-tenant workspaces and system health.",
    category: "Platform",
    icon: "🛡️",
    viewKey: "platform",
    steps: [
      {
        target: "[data-tour='nav-platform']",
        title: "Tenant Operations",
        description: "Manage SaaS workspaces, domain mappings, database migrations, and platform diagnostics.",
        placement: "right",
        viewKey: "platform",
      },
    ],
  },
}

/**
 * Returns all tours as an array
 */
export function getAllTours(): TourDefinition[] {
  return Object.values(TOURS)
}

/**
 * Find a tour by ID
 */
export function getTourById(id: string): TourDefinition | undefined {
  return TOURS[id]
}

/**
 * Find the primary tour for a given viewKey
 */
export function getTourForView(viewKey: ViewKey): TourDefinition | undefined {
  const match = Object.values(TOURS).find(t => t.viewKey === viewKey)
  return match ?? TOURS["tour-navigation"]
}
