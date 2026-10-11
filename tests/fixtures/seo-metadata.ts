import { mock } from 'bun:test'
import assert from 'node:assert/strict'
mock.module('@/lib/app-config', () => ({ getConfigValue: async () => '' }))
const { pageSeo } = await import('../../src/lib/seo-config')
const resource = await pageSeo('/resources/support', 'Technical support', 'Get help')
assert.equal(resource.alternates?.canonical, 'https://app.fizmoh.cloud/resources/support')
assert.equal(resource.alternates?.languages, undefined)
const article = await pageSeo('/blog/example', 'Example', 'Article', undefined, {languages:{en:'https://app.fizmoh.cloud/blog/example', ar:'https://app.fizmoh.cloud/blog/arabic-example'}})
assert.equal(article.alternates?.languages?.ar, 'https://app.fizmoh.cloud/blog/arabic-example')
for (const slug of ['privacy','terms','acceptable-use','cookies','data-deletion']) {
  const { metadata } = await import(`../../src/app/${slug}/page`)
  assert.equal(metadata.alternates.canonical, `/${slug}`)
}
const muscat = await pageSeo('/locations/muscat', 'WhatsApp Business API & Marketing in Muscat, Oman', 'Muscat description')
assert.equal((muscat.title as { absolute: string }).absolute, 'WhatsApp Business API & Marketing in Muscat, Oman | Fizmoh')
assert.ok((muscat.title as { absolute: string }).absolute.length <= 65)

const { generateMetadata: generatePricingMetadata } = await import('../../src/app/pricing/page')
const pricingMeta = await generatePricingMetadata()
assert.equal((pricingMeta.title as { absolute: string }).absolute, 'WhatsApp Business API Pricing & Plans in Oman (OMR) | Fizmoh')

const { SeoStructuredData } = await import('../../src/components/seo-structured-data')
const rootLd = await SeoStructuredData({ isHomepage: false })
const homeLd = await SeoStructuredData({ isHomepage: true })
const rootGraph = JSON.parse(rootLd.props.dangerouslySetInnerHTML.__html)['@graph']
const homeGraph = JSON.parse(homeLd.props.dangerouslySetInnerHTML.__html)['@graph']
assert.deepEqual(rootGraph.map((n: { '@type': string }) => n['@type']), ['Organization', 'WebSite'])
assert.deepEqual(homeGraph.map((n: { '@type': string }) => n['@type']), ['SoftwareApplication', 'FAQPage'])
console.log('Canonical, title length, pricing metadata, and JSON-LD deduplication passed')
