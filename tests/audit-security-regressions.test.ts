import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
for (const fixture of ['audit-reports', 'audit-billing', 'audit-hospital', 'audit-customers', 'audit-settlement', 'platform-support-api', 'seo-metadata', 'public-plan-catalogue']) {
  test(fixture, () => {
    // Keep module doubles out of the channel/engine regression process.
    const result = spawnSync(process.execPath, ['run', resolve(import.meta.dir, 'fixtures', `${fixture}.ts`)], { encoding: 'utf8', timeout: 20000 })
    expect(result.stderr).toBe('')
    expect(result.status).toBe(0)
  })
}
test('promotion preserves the old backend until candidate health and proxy validation pass', () => {
  const result = spawnSync('bash', [resolve(import.meta.dir, 'deploy-promotion.test.sh')], { encoding: 'utf8', timeout: 20000 })
  expect(result.status).toBe(0)
})
