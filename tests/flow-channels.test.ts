import { describe, test, expect } from "bun:test"
import { flowChannels, supportsFlowNode } from "../src/lib/flow-channels"

describe("shared channel builder", () => {
 test("old flows remain WhatsApp-only for both stored JSON shapes", () => {
  expect(flowChannels(null)).toEqual(["WHATSAPP"])
  expect(flowChannels(JSON.stringify({keywords:["hi"]}))).toEqual(["WHATSAPP"])
 })
 test("channel lists work with Prisma JSON and serialized JSON", () => {
  const config={channels:["INSTAGRAM","FACEBOOK","INVALID"]}
  expect(flowChannels(config)).toEqual(["FACEBOOK","INSTAGRAM"])
  expect(flowChannels(JSON.stringify(config))).toEqual(["FACEBOOK","INSTAGRAM"])
 })
  test("mixed-channel flows use only jointly supported steps", () => {
   expect(supportsFlowNode("QUESTION",["WHATSAPP","INSTAGRAM"])).toBe(true)
   expect(supportsFlowNode("AI",["FACEBOOK","INSTAGRAM"])).toBe(true)
   expect(supportsFlowNode("APPOINTMENT",["WHATSAPP","FACEBOOK","INSTAGRAM"])).toBe(true)
   expect(supportsFlowNode("DELAY",["WHATSAPP","INSTAGRAM"])).toBe(true)
   expect(supportsFlowNode("PAYMENT",["WHATSAPP","FACEBOOK"])).toBe(true)
   expect(supportsFlowNode("TEMPLATE",["WHATSAPP","INSTAGRAM"])).toBe(false)
   expect(supportsFlowNode("TEMPLATE",["WHATSAPP"])).toBe(true)
  })
})
