import { mock } from 'bun:test'
import assert from 'node:assert/strict'
mock.module('@/lib/app-config', () => ({ getConfigValue: async () => '' }))
mock.module('next/font/google', () => ({
  DM_Sans: () => ({ variable: '--font-dm-sans' }),
  Plus_Jakarta_Sans: () => ({ variable: '--font-plus-jakarta' }),
  Instrument_Serif: () => ({ variable: '--font-instrument-serif' }),
  Cairo: () => ({ variable: '--font-cairo' }),
}))
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

assert.equal(muscat.openGraph?.locale, 'en_US')
assert.deepEqual(muscat.openGraph?.alternateLocale, ['ar_OM', 'ar_SA', 'ar_AE'])
assert.equal((muscat.twitter as { site?: string })?.site, '@fizmohcloud')

const { generateMetadata: generateRootMetadata } = await import('../../src/app/layout')
const rootMeta = await generateRootMetadata()
assert.equal(rootMeta.manifest, '/manifest.webmanifest')
assert.ok(rootMeta.icons)

const { generateMetadata: generateMenuMetadata } = await import('../../src/app/menu/[slug]/page')
const menuMeta = await generateMenuMetadata({ params: Promise.resolve({ slug: 'demo-bistro' }), searchParams: Promise.resolve({}) })
assert.equal(menuMeta.alternates?.canonical, 'https://app.fizmoh.cloud/menu/demo-bistro')
console.log('Canonical, title length, pricing metadata, icons/manifest, og:locale, twitter:site, and JSON-LD deduplication passed')
