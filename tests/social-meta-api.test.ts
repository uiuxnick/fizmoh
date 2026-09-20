import { expect, test, describe } from "bun:test"
import { classifyMetaError as classifyMessengerError } from "../src/lib/social/messenger-adapter"
import { classifyMetaError as classifyInstagramError } from "../src/lib/social/instagram-adapter"

describe("Meta error classification — Messenger", () => {
  test("code 10/200 is a messaging-window or permission restriction, not a generic failure", () => {
    expect(classifyMessengerError({ error: { code: 10 } })).toMatch(/window|permission/i)
    expect(classifyMessengerError({ error: { code: 200 } })).toMatch(/window|permission/i)
  })
  test("rate-limit codes are recognised", () => {
    expect(classifyMessengerError({ error: { code: 4 } })).toMatch(/rate/i)
    expect(classifyMessengerError({ error: { code: 613 } })).toMatch(/rate/i)
  })
  test("190 is an expired/revoked token", () => {
    expect(classifyMessengerError({ error: { code: 190 } })).toMatch(/expired|revoked/i)
  })
  test("an unrecognised code returns no restriction label — the raw error message is used instead", () => {
    expect(classifyMessengerError({ error: { code: 9999 } })).toBeUndefined()
  })
})

describe("Meta error classification — Instagram", () => {
  test("mirrors the same codes on the Instagram host", () => {
    expect(classifyInstagramError({ error: { code: 10 } })).toMatch(/window|permission/i)
    expect(classifyInstagramError({ error: { code: 190 } })).toMatch(/expired|revoked/i)
    expect(classifyInstagramError({ error: {} })).toBeUndefined()
  })
})
