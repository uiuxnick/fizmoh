import { describe, test, expect } from "bun:test"
import { localAttachmentName, uploadAttachmentBytes, socialAttachmentPayload } from "../src/lib/social/attachment-upload"

describe("social attachment uploads", () => {
  test("recognizes only this site's local media route", () => {
    const name = "8d4480b2-3125-48e0-9139-4432d5fe9dea.jpg"
    expect(localAttachmentName(`https://app.fizmoh.cloud/api/media/${name}`)).toBe(name)
    expect(localAttachmentName(`https://example.com/api/media/${name}`)).toBeNull()
    expect(() => localAttachmentName("https://app.fizmoh.cloud/api/media/invalid.jpg")).toThrow()
    expect(() => localAttachmentName(`https://app.fizmoh.cloud/api/media/${name}?tenant=other`)).toThrow()
  })
  for (const host of ["graph.facebook.com", "graph.instagram.com"] as const) {
    test(`${host} uploads bytes before returning an attachment ID`, async () => {
      const request = (async (url, init) => {
        expect(String(url)).toBe(`https://${host}/v21.0/me/message_attachments`)
        expect(init?.headers).toEqual({ Authorization: "Bearer test-token" })
        const form = init!.body as FormData
        expect(JSON.parse(String(form.get("message")))).toEqual({ attachment: { type: "image", payload: { is_reusable: true } } })
        expect(await (form.get("filedata") as Blob).text()).toBe("image-bytes")
        return new Response(JSON.stringify({ attachment_id: "123456" }))
      }) as typeof fetch
      expect(await uploadAttachmentBytes(host, "v21.0", "test-token", "IMAGE", new TextEncoder().encode("image-bytes"), "image.jpg", request)).toBe("123456")
    })
  }
  test("cannot read local media without a tenant context", async () => {
    await expect(socialAttachmentPayload("graph.instagram.com", "v21.0", "test", "https://app.fizmoh.cloud/api/media/8d4480b2-3125-48e0-9139-4432d5fe9dea.jpg", "IMAGE")).rejects.toThrow("workspace")
  })
  test("does not include token-bearing provider messages in failures", async () => {
    const request = (async () => new Response(JSON.stringify({ error: { code: 100, message: "test-token" } }), { status: 400 })) as typeof fetch
    await expect(uploadAttachmentBytes("graph.facebook.com", "v21.0", "test-token", "IMAGE", new Uint8Array([1]), "image.jpg", request)).rejects.toThrow("HTTP 400, code 100")
  })
})
