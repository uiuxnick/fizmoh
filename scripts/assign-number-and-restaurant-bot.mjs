import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const KITCHEN_TENANT_ID = "cmu1bbo2q0003i3wcbsptlyek"
  const TOUR_TENANT_ID = "cmsqevt2a0000i3g24a2qc10w"
  const PHONE_NUMBER_ID = "365960046597580" // +1 555-623-9458

  console.log("=== Assigning WhatsApp Number +1 555-623-9458 to support@jimcstudio.com ===")

  // 1. Assign number to kitchen tenant
  const updatedAccount = await prisma.whatsAppAccount.update({
    where: { phoneNumberId: PHONE_NUMBER_ID },
    data: {
      tenantId: KITCHEN_TENANT_ID,
      verifiedName: "Fizmoh Kitchen",
      isDefault: true,
      status: "CONNECTED",
    },
  })
  console.log("Updated WhatsAppAccount:", {
    id: updatedAccount.id,
    displayPhone: updatedAccount.displayPhone,
    tenantId: updatedAccount.tenantId,
    isDefault: updatedAccount.isDefault,
  })

  // 2. Ensure tour tenant has a default number
  const tourNumber = await prisma.whatsAppAccount.findFirst({
    where: { tenantId: TOUR_TENANT_ID },
  })
  if (tourNumber) {
    await prisma.whatsAppAccount.update({
      where: { id: tourNumber.id },
      data: { isDefault: true },
    })
    console.log("Set default number for tour tenant:", tourNumber.displayPhone)
  }

  // 3. Create/Upsert the Master Restaurant Bot Flow for Fizmoh Kitchen
  console.log("=== Creating Master Restaurant Bot for Fizmoh Kitchen ===")

  const flowId = "cmu2masterkitchenbot01"
  const flowName = "Fizmoh Kitchen — Master Restaurant & Ordering Bot"
  const flowDescription =
    "Flagship WhatsApp Bot for +1 555-623-9458: Interactive Welcome Menu, Real-Time Tables, Dynamic Food Menu, Online Ordering, Live Order Tracking, AmwalPay Card Checkout, Waiter Service & Table QR."

  const triggerConfig = {
    channels: ["WHATSAPP"],
    keywords: [
      "hi",
      "hello",
      "hey",
      "start",
      "menu",
      "order",
      "food",
      "table",
      "dine",
      "kitchen",
      "lunch",
      "dinner",
      "waiter",
      "bill",
      "pay",
      "water",
      "service",
      "help",
      "restaurant",
      "مطعم",
      "مرحبا",
      "هلا",
      "سلام",
      "السلام عليكم",
      "صباح الخير",
      "مساء الخير",
      "قائمة",
      "طلب",
      "وجبة",
      "طعام",
      "طاولة",
      "نادل",
      "فاتورة",
      "دفع",
      "خدمة",
      "حجز",
    ],
    matchType: "contains",
  }

  const nodes = [
    {
      id: "trigger",
      type: "TRIGGER",
      data: {},
      position: { x: 400, y: 40 },
    },
    {
      id: "node_welcome",
      type: "LIST",
      data: {
        header: "Fizmoh Kitchen Concierge",
        text: "🍽️ *Welcome to Fizmoh Kitchen!* 🍽️\n\nDelicious chef-crafted meals, fresh ingredients, and exceptional hospitality in Muscat.\n\nPlease tap below to explore our services or place an order 👇",
        listButton: "Restaurant Services",
        rows: [
          { id: "opt_menu", title: "📖 Smart Menu", description: "Browse dishes, categories & prices in OMR" },
          { id: "opt_search", title: "🔍 Search Dishes", description: "Search dishes by name (burger, pasta, pizza...)" },
          { id: "opt_tables", title: "🪑 Live Table Status", description: "Indoor, terrace & VIP seating availability" },
          { id: "opt_order", title: "🛒 Order Food Online", description: "Fast dine-in, takeaway or table delivery" },
          { id: "opt_track", title: "🧾 Track My Order", description: "Live order progress & AmwalPay card pay" },
          { id: "opt_waiter", title: "🔔 Call Waiter / Bill", description: "Table assistance, water, cutlery or bill" },
          { id: "opt_scan", title: "📱 Table QR Scanner", description: "Scan table QR code for instant order" },
        ],
      },
      position: { x: 400, y: 180 },
    },
    // Branch 1: Menu
    {
      id: "n_menu",
      type: "RESTAURANT_MENU",
      data: {
        text: "🍽️ *Fizmoh Kitchen — Seasonal Menu*\n\nExplore our chef's specialties and fresh daily dishes below. Tap to order or open our full interactive menu portal:",
      },
      position: { x: 100, y: 380 },
    },
    {
      id: "n_site",
      type: "RESTAURANT_SITE",
      data: {
        text: "🌐 *Open Full Digital Menu Portal:*\nBrowse with high-res photos, custom modifiers, and fast online checkout:",
      },
      position: { x: 100, y: 560 },
    },
    // Branch 1b: Search Dishes
    {
      id: "n_search",
      type: "RESTAURANT_SEARCH",
      data: {
        text: "🔍 *Search Fizmoh Kitchen Menu:*\nType any dish or ingredient (e.g. *burger*, *truffle*, *fries*, *pasta*, *pizza*):",
      },
      position: { x: 210, y: 380 },
    },
    // Branch 2: Tables
    {
      id: "n_tables",
      type: "RESTAURANT_TABLES",
      data: {
        text: "🪑 *Real-Time Table Availability at Fizmoh Kitchen:*",
      },
      position: { x: 320, y: 380 },
    },
    // Branch 3: Order
    {
      id: "n_order",
      type: "RESTAURANT_ORDER",
      data: {
        text: "🛒 *Order Online — Fizmoh Kitchen:*\nPlace your order directly for dine-in, takeaway or delivery with online card payment:",
      },
      position: { x: 520, y: 380 },
    },
    // Branch 4: Order Status & Pay
    {
      id: "n_track",
      type: "RESTAURANT_ORDER_STATUS",
      data: {},
      position: { x: 720, y: 380 },
    },
    {
      id: "n_pay_prompt",
      type: "RESTAURANT_PAY",
      data: {
        text: "💳 *Instant AmwalPay Online Card Checkout:*\nTap below to pay your open order securely via Debit/Credit Card (Visa, MasterCard, Benefit, Apple Pay):",
      },
      position: { x: 720, y: 560 },
    },
    // Branch 5: Waiter
    {
      id: "n_waiter_menu",
      type: "BUTTONS",
      data: {
        text: "🛎️ *Table Service & Floor Assistance*\nHow can our floor staff help you right now?",
        buttons: [
          { id: "btn_w_assist", title: "🙋 Waiter Assist" },
          { id: "btn_w_bill", title: "🧾 Request Bill" },
          { id: "btn_w_water", title: "💧 Water Refill" },
        ],
      },
      position: { x: 940, y: 380 },
    },
    {
      id: "n_call_assist",
      type: "RESTAURANT_CALL_WAITER",
      data: { requestType: "ASSISTANCE" },
      position: { x: 840, y: 560 },
    },
    {
      id: "n_call_bill",
      type: "RESTAURANT_CALL_WAITER",
      data: { requestType: "BILL" },
      position: { x: 960, y: 560 },
    },
    {
      id: "n_call_water",
      type: "RESTAURANT_CALL_WAITER",
      data: { requestType: "WATER" },
      position: { x: 1080, y: 560 },
    },
    // Branch 6: Scan QR
    {
      id: "n_scan",
      type: "RESTAURANT_SCAN",
      data: {
        text: "📱 *Dine-In Table QR Scan:*\n1️⃣ Scan the QR code placed on your dining table\n2️⃣ Your table number is automatically detected\n3️⃣ Order directly from your phone — it sends straight to our kitchen KDS!",
      },
      position: { x: 1260, y: 380 },
    },
  ]

  const edges = [
    { id: "e0", source: "trigger", target: "node_welcome" },
    // From LIST options
    { id: "e_menu", source: "node_welcome", target: "n_menu", label: "opt_menu" },
    { id: "e_menu_site", source: "n_menu", target: "n_site" },
    { id: "e_search", source: "node_welcome", target: "n_search", label: "opt_search" },
    { id: "e_tables", source: "node_welcome", target: "n_tables", label: "opt_tables" },
    { id: "e_order", source: "node_welcome", target: "n_order", label: "opt_order" },
    { id: "e_track", source: "node_welcome", target: "n_track", label: "opt_track" },
    { id: "e_track_pay", source: "n_track", target: "n_pay_prompt" },
    { id: "e_waiter", source: "node_welcome", target: "n_waiter_menu", label: "opt_waiter" },
    { id: "e_scan", source: "node_welcome", target: "n_scan", label: "opt_scan" },
    // Waiter buttons
    { id: "e_w_assist", source: "n_waiter_menu", target: "n_call_assist", label: "btn_w_assist" },
    { id: "e_w_bill", source: "n_waiter_menu", target: "n_call_bill", label: "btn_w_bill" },
    { id: "e_w_water", source: "n_waiter_menu", target: "n_call_water", label: "btn_w_water" },
  ]

  const botFlow = await prisma.botFlow.upsert({
    where: { id: flowId },
    update: {
      tenantId: KITCHEN_TENANT_ID,
      name: flowName,
      description: flowDescription,
      trigger: "KEYWORD",
      triggerConfig,
      nodes,
      edges,
      publishedNodes: nodes,
      publishedEdges: edges,
      publishedAt: new Date(),
      isActive: true,
      priority: 100,
    },
    create: {
      id: flowId,
      tenantId: KITCHEN_TENANT_ID,
      name: flowName,
      description: flowDescription,
      trigger: "KEYWORD",
      triggerConfig,
      nodes,
      edges,
      publishedNodes: nodes,
      publishedEdges: edges,
      publishedAt: new Date(),
      isActive: true,
      priority: 100,
    },
  })

  console.log("Master Restaurant Bot Flow Created/Updated successfully:", {
    id: botFlow.id,
    name: botFlow.name,
    isActive: botFlow.isActive,
    priority: botFlow.priority,
    tenantId: botFlow.tenantId,
  })

  // 4. Verification: check all flows for kitchen tenant
  const flows = await prisma.botFlow.findMany({
    where: { tenantId: KITCHEN_TENANT_ID },
    select: { id: true, name: true, trigger: true, isActive: true, priority: true },
  })
  console.log("\nAll Bot Flows for tenant 'kitchen' (support@jimcstudio.com):", flows)

  // 5. Verification: check WhatsApp accounts for kitchen tenant
  const accounts = await prisma.whatsAppAccount.findMany({
    where: { tenantId: KITCHEN_TENANT_ID },
    select: { id: true, displayPhone: true, verifiedName: true, status: true, isDefault: true },
  })
  console.log("\nAll WhatsApp Accounts for tenant 'kitchen' (support@jimcstudio.com):", accounts)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
