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
console.log('Canonical and explicit language alternate metadata passed')
