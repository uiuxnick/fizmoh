// Dry-run by default. Only the exact legacy seeded amounts are eligible.
const { PrismaClient } = require('@prisma/client')
const { writeFileSync } = require('node:fs')
const db = new PrismaClient()
const prices = { 'smart-menu-ordering': 19, 'restaurant-pos': 19, 'hospital-operations': 49, 'woocommerce-connector': 15, 'ai-message-credits': 10, 'extra-whatsapp-number': 12, 'extra-staff-seat': 5, 'digital-vcard': 12, 'website-live-chat': 15, 'extra-message-volume': 20 }
async function main() {
  const rows = await db.planAddon.findMany({ where: { slug: { in: Object.keys(prices) }, currency: 'OMR' }, select: { id: true, slug: true, currency: true, priceMonthly: true, priceYearly: true } })
  const changes = rows.filter(row => row.priceMonthly === prices[row.slug] && row.priceYearly === prices[row.slug] * 10)
  console.log(JSON.stringify(changes.map(row => ({ slug: row.slug, fromMonthly: row.priceMonthly, toMonthly: prices[row.slug] * 1000, fromYearly: row.priceYearly, toYearly: prices[row.slug] * 10000 })), null, 2))
  if (!process.argv.includes('--apply')) { console.log('Dry run: no prices changed. Custom prices and historical invoices are preserved.'); return }
  const backupPath = process.env.ADDON_PRICE_BACKUP
  if (!backupPath) throw new Error('ADDON_PRICE_BACKUP must name a new backup file before applying')
  writeFileSync(backupPath, JSON.stringify(changes, null, 2), { flag: 'wx', mode: 0o600 })
  await db.$transaction(async tx => {
    for (const row of changes) {
      const result = await tx.planAddon.updateMany({ where: { id: row.id, currency: 'OMR', priceMonthly: row.priceMonthly, priceYearly: row.priceYearly }, data: { priceMonthly: prices[row.slug] * 1000, priceYearly: prices[row.slug] * 10000 } })
      if (result.count !== 1) throw new Error('Catalog changed since preview; transaction rolled back')
    }
  })
  console.log(`Corrected ${changes.length} catalog entries. Backup: ${backupPath}`)
}
main().catch(error => { console.error(error.message); process.exitCode = 1 }).finally(() => db.$disconnect())
