import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { sharedRedis, redisNamespace } from '../../src/lib/shared-redis'
import { publish, subscribe } from '../../src/lib/realtime'
import { checkSharedRateLimit } from '../../src/lib/rate-limit'
const redis = sharedRedis()!
if (process.argv[2] === 'receiver') {
  subscribe(event => {
    if (event.type === 'conversation' && event.conversationId === 'request') publish({ type: 'conversation', tenantId: 'test-only', conversationId: 'ack' })
  })
} else {
  const child = spawn(process.execPath, ['run', import.meta.path, 'receiver'], { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] })
  const timeout = setTimeout(() => { child.kill(); process.exit(1) }, 15000)
  try {
    let ownDeliveries = 0
    let ack = false
    subscribe(event => { if (event.type === 'conversation') { if (event.conversationId === 'request') ownDeliveries++; if (event.conversationId === 'ack') ack = true } })
    const channel = `${redisNamespace()}:realtime`
    for (let attempt = 0; attempt < 100; attempt++) {
      if (redis.status === 'ready') {
        const result = await redis.pubsub('NUMSUB', channel) as [string, number]
        if (Number(result[1]) === 2) break
      }
      await Bun.sleep(50)
    }
    assert.equal(Number((await redis.pubsub('NUMSUB', channel) as [string, number])[1]), 2)
    const results = await Promise.all(Array.from({ length: 10 }, () => checkSharedRateLimit('audit-test-only', 3, 60000)))
    assert.equal(results.filter(result => result.allowed).length, 3)
    publish({ type: 'conversation', tenantId: 'test-only', conversationId: 'request' })
    for (let i = 0; i < 100 && !ack; i++) await Bun.sleep(50)
    assert.equal(ack, true)
    assert.equal(ownDeliveries, 1)
    console.log('PASS: atomic shared limits; cross-process events; no duplicate local echo')
    clearTimeout(timeout); child.kill(); process.exit(0)
  } catch (error) { console.error(error); child.kill(); process.exit(1) }
}
