import { expect, test, describe } from "bun:test"
import { Prisma } from "@prisma/client"

/**
 * Same reasoning as review-reply's tenant-isolation test: the actual
 * isolation mechanism is db.ts's generic `$extends` auto-scoping, which
 * applies to any model with a `tenantId` field. This guards the one thing
 * that would silently defeat it for these new models.
 */
describe("social add-on — tenant isolation schema contract", () => {
  const tenantScopedModels = ["SocialAccount", "SocialAutomationSettings", "SocialKeywordReply"]

  for (const modelName of tenantScopedModels) {
    test(`${modelName} declares a required tenantId`, () => {
      const model = Prisma.dmmf.datamodel.models.find(m => m.name === modelName)
      expect(model).toBeDefined()
      const field = model?.fields.find(f => f.name === "tenantId")
      expect(field).toBeDefined()
      expect(field?.type).toBe("String")
      expect(field?.isRequired).toBe(true)
    })
  }

  test("SocialAccount is unique per tenant+channel+external account — one tenant cannot claim a Page another tenant already connected under a different id, and the same Page cannot silently double-connect within a tenant", () => {
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === "SocialAccount")
    const uniqueIndex = model?.uniqueIndexes.find(i => i.fields.includes("tenantId") && i.fields.includes("channel") && i.fields.includes("externalAccountId"))
    expect(uniqueIndex).toBeDefined()
  })

  test("SocialAutomationSettings is one row per tenant per channel, not a free-for-all list", () => {
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === "SocialAutomationSettings")
    const uniqueIndex = model?.uniqueIndexes.find(i => i.fields.includes("tenantId") && i.fields.includes("channel"))
    expect(uniqueIndex).toBeDefined()
  })

  test("Message.externalId stays globally unique — the same dedup key WhatsApp's wamid already relies on, now also covering Messenger mids and Instagram message ids", () => {
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === "Message")
    const field = model?.fields.find(f => f.name === "externalId")
    expect(field?.isUnique).toBe(true)
  })

  test("Customer.socialId is unique per tenant, so two different tenants' customers with the same PSID never collide", () => {
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === "Customer")
    const uniqueIndex = model?.uniqueIndexes.find(i => i.fields.includes("tenantId") && i.fields.includes("socialId"))
    expect(uniqueIndex).toBeDefined()
  })
})
