import { describe, expect, test } from "bun:test"
import {
  assertSupportedGroupMessageType,
  createGroupsMetaClient,
  extractGroupMessageText,
  GroupFeatureError,
  isGroupInboundMessage,
  isGroupWebhookField,
  isWhatsAppGroupsEnabled,
  MAX_GROUP_PARTICIPANTS,
  normalizeE164NoPlus,
} from "../src/modules/whatsapp-groups"

const MOCK_CONFIG = {
  accessToken: "test_token_never_logged",
  phoneNumberId: "1234567890",
  wabaId: "9988776655",
  phoneNumber: "+96890000000",
  webhookVerifyToken: "verify",
  appSecret: "secret",
}

describe("WhatsApp Groups Module", () => {
  test("feature flag defaults to false and toggles cleanly", () => {
    const prev = process.env.WHATSAPP_GROUPS_ENABLED
    delete process.env.WHATSAPP_GROUPS_ENABLED
    expect(isWhatsAppGroupsEnabled()).toBe(false)

    process.env.WHATSAPP_GROUPS_ENABLED = "true"
    expect(isWhatsAppGroupsEnabled()).toBe(true)

    if (prev === undefined) delete process.env.WHATSAPP_GROUPS_ENABLED
    else process.env.WHATSAPP_GROUPS_ENABLED = prev
  })

  test("normalizes E.164 numbers without '+' and rejects invalid phones", () => {
    expect(normalizeE164NoPlus("+968 9123-4567")).toBe("96891234567")
    expect(normalizeE164NoPlus("96891234567")).toBe("96891234567")
    expect(() => normalizeE164NoPlus("0123")).toThrow(GroupFeatureError)
    expect(() => normalizeE164NoPlus("abc")).toThrow(GroupFeatureError)
  })

  test("enforces max 8 participant constant and supported/unsupported message types", () => {
    expect(MAX_GROUP_PARTICIPANTS).toBe(8)

    for (const ok of ["text", "image", "document", "video", "audio", "template"]) {
      expect(() => assertSupportedGroupMessageType(ok)).not.toThrow()
    }

    for (const bad of ["interactive", "commerce", "calling", "edit", "delete", "disappearing", "view_once"]) {
      expect(() => assertSupportedGroupMessageType(bad)).toThrow(GroupFeatureError)
    }
  })

  test("webhook field & group message detection isolates group traffic from 1:1 flow", () => {
    expect(isGroupWebhookField("group_lifecycle_update")).toBe(true)
    expect(isGroupWebhookField("group_participants_update")).toBe(true)
    expect(isGroupWebhookField("group_settings_update")).toBe(true)
    expect(isGroupWebhookField("group_status_update")).toBe(true)
    expect(isGroupWebhookField("messages")).toBe(false)
    expect(isGroupWebhookField("history")).toBe(false)

    expect(isGroupInboundMessage({ id: "wamid.1", group_id: "grp_123", type: "text" })).toBe(true)
    expect(isGroupInboundMessage({ id: "wamid.2", from: "120363000000@g.us", type: "text" })).toBe(true)
    expect(isGroupInboundMessage({ id: "wamid.3", context: { group_id: "grp_1" } })).toBe(true)
    expect(isGroupInboundMessage({ id: "wamid.4", from: "96891234567", type: "text" })).toBe(false)

    expect(extractGroupMessageText({ type: "text", text: { body: "Hello group" } })).toEqual({
      type: "text",
      body: "Hello group",
      mediaRef: null,
    })
  })

  test("Meta API client creates group, retries on 429, and maps OBA 403 error", async () => {
    let calls = 0
    const client = createGroupsMetaClient({
      getConfig: async () => MOCK_CONFIG,
      sleepImpl: async () => {},
      fetchImpl: (async (url: string, init?: RequestInit) => {
        calls++
        if (calls === 1) {
          return new Response(JSON.stringify({ error: { message: "Rate limit", code: 130429 } }), {
            status: 429,
            headers: { "retry-after": "0" },
          })
        }
        expect(url).toContain("/1234567890/groups")
        const body = JSON.parse(String(init?.body || "{}"))
        expect(body.messaging_product).toBe("whatsapp")
        expect(body.subject).toBe("VIP Tour Group")
        expect(body.join_approval_mode).toBe("approval_required")
        return new Response(JSON.stringify({ id: "grp_abc", invite_link: "https://chat.whatsapp.com/test" }), {
          status: 200,
        })
      }) as typeof fetch,
    })

    const res = await client.createGroup({
      subject: "VIP Tour Group",
      description: "Updates",
      joinApprovalMode: "approval_required",
    })
    expect(calls).toBe(2)
    expect(res.groupId).toBe("grp_abc")
    expect(res.inviteLink).toBe("https://chat.whatsapp.com/test")

    // OBA error mapping
    const obaClient = createGroupsMetaClient({
      getConfig: async () => MOCK_CONFIG,
      sleepImpl: async () => {},
      fetchImpl: (async () =>
        new Response(
          JSON.stringify({ error: { message: "Official Business Account required", code: 131000 } }),
          { status: 403 },
        )) as typeof fetch,
    })
    await expect(obaClient.createGroup({ subject: "Test" })).rejects.toThrow(/Official Business Account/i)
  })
})
