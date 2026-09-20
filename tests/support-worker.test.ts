import { test, expect } from "bun:test"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"

test("support script bypasses stale worker cache and activation preserves unrelated caches", async () => {
  const listeners: Record<string, (event: any) => void> = {}
  const deleted: string[] = []
  runInNewContext(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), {
    importScripts() {}, URL,
    self: { location: { origin: "https://app.fizmoh.cloud" }, clients: { claim: async () => {} }, addEventListener: (name: string, callback: (event: any) => void) => { listeners[name] = callback } },
    caches: { keys: async () => ["shell-v2", "shell-v3", "onesignal-cache"], delete: async (key: string) => { deleted.push(key) } },
  })
  let intercepted = false
  listeners.fetch({ request: { method: "GET", url: "https://app.fizmoh.cloud/widget.js" }, respondWith() { intercepted = true } })
  expect(intercepted).toBe(false)
  let complete: Promise<void> = Promise.resolve()
  listeners.activate({ waitUntil: (promise: Promise<void>) => { complete = promise } })
  await complete
  expect(deleted).toEqual(["shell-v2"])
})
