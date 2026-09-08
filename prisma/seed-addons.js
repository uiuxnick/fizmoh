const { PrismaClient } = require("@prisma/client")
const db = new PrismaClient()
const addons = [
  ["smart-menu-ordering", "Smart Restaurant & Hotel Ordering", "Multi-branch digital menus, AI menu import, QR table & room ordering, KDS, waiter calls & live tracking.", "RESTAURANT", 19, 190, {}],
  ["restaurant-pos", "Restaurant POS", "QR ordering, kitchen operations, inventory and sales reports.", "RESTAURANT", 19, 190, {}],
  ["hospital-operations", "Hospital Operations", "Beds, doctors, treatments, reminders and clinical access controls.", "HOSPITAL", 49, 490, {}],
  ["woocommerce-connector", "WooCommerce Connector", "Sync products and orders from WooCommerce.", "WOOCOMMERCE", 15, 150, {}],
  ["ai-message-credits", "AI Message Credits", "Additional AI replies for the WhatsApp assistant.", "AI", 10, 100, { messagesPerMonth: 5000 }],
  ["extra-whatsapp-number", "Extra WhatsApp Number", "Connect another WhatsApp Business number.", "INBOX", 12, 120, { numbers: 1 }],
  ["extra-staff-seat", "Extra Staff Seat", "Add one more team member.", "STAFF", 5, 50, { staff: 1 }],
  ["digital-vcard", "Digital Business Card", "Smart digital business card with vCard, WhatsApp, QR, services, payments and analytics.", "DIGITAL_VCARD", 12, 120, { cards: 1, featuredServices: 5, galleryItems: 10, analyticsRetentionDays: 90 }],
  ["website-live-chat", "Website Live Chat & WhatsApp Widget", "Embeddable dual-mode website chat widget, WhatsApp direct chat, AI smart replies, lead capture and live team inbox sync.", "LIVE_CHAT", 15, 150, {}],
  ["extra-message-volume", "Extra Message Volume", "Add 10,000 outbound messages per month.", "INBOX", 20, 200, { messagesPerMonth: 10000 }],
]

async function main() {
  for (const [sortOrder, [slug, name, description, module, priceMonthly, priceYearly, limits]] of addons.entries()) {
    await db.planAddon.upsert({ where: { slug }, create: { slug, name, description, module, priceMonthly, priceYearly, limits, currency: "OMR", sortOrder, isPublic: true }, update: { name, description, module, priceMonthly, priceYearly, limits, sortOrder, isPublic: true } })
  }

  // Ensure LIVE_CHAT is present, but RESTAURANT is an optional addon/module (not forced on all plans)
  const plans = await db.plan.findMany()
  for (const plan of plans) {
    const currentMods = Array.isArray(plan.modules) ? plan.modules : []
    let updatedMods = currentMods
    // Remove RESTAURANT from standard non-restaurant plans so it is strictly an optional addon / toggleable module
    if (["tour", "starter", "growth", "free"].includes(plan.slug)) {
      updatedMods = updatedMods.filter(m => m !== "RESTAURANT")
    }
    const toAdd = ["LIVE_CHAT"].filter(m => !updatedMods.includes(m))
    const finalMods = [...updatedMods, ...toAdd]
    if (JSON.stringify(finalMods) !== JSON.stringify(currentMods)) {
      await db.plan.update({
        where: { id: plan.id },
        data: { modules: finalMods },
      })
    }
  }

  const subs = await db.subscription.findMany()
  for (const sub of subs) {
    if (Array.isArray(sub.moduleSnapshot)) {
      const cleanedSnapshot = sub.moduleSnapshot.filter(m => m !== "RESTAURANT")
      const toAdd = ["LIVE_CHAT"].filter(m => !cleanedSnapshot.includes(m))
      const finalSnapshot = [...cleanedSnapshot, ...toAdd]
      if (JSON.stringify(finalSnapshot) !== JSON.stringify(sub.moduleSnapshot)) {
        await db.subscription.update({
          where: { id: sub.id },
          data: { moduleSnapshot: finalSnapshot },
        })
      }
    }
  }
}

main().finally(() => db.$disconnect())
