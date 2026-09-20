import { expect, test, describe } from "bun:test"
import { Prisma } from "@prisma/client"

/**
 * Tenant isolation for these three new models is not a bespoke check in each
 * route — it is the same generic Prisma `$extends` auto-scoping every other
 * tenant-owned model in this app already gets (db.ts): any model with a
 * `tenantId` field is automatically scoped on every read and write. That
 * only works if the field is actually declared on the model, so this test
 * guards the one thing that would silently break it — someone removing
 * `tenantId` from the schema (or misspelling it) without noticing that the
 * new model had just opted itself out of every tenant boundary in the app.
 */
describe("tenant isolation — schema contract", () => {
  const models = ["ReviewReplySettings", "GoogleReview", "ReplyLog"]

  for (const modelName of models) {
    test(`${modelName} declares tenantId, so db.ts's auto-scoping extension applies to it`, () => {
      const model = Prisma.dmmf.datamodel.models.find(m => m.name === modelName)
      expect(model).toBeDefined()
      const field = model?.fields.find(f => f.name === "tenantId")
      expect(field).toBeDefined()
      expect(field?.type).toBe("String")
      expect(field?.isRequired).toBe(true)
    })
  }

  test("ReviewReplySettings is one row per tenant — a unique tenantId, not a list", () => {
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === "ReviewReplySettings")
    const field = model?.fields.find(f => f.name === "tenantId")
    expect(field?.isUnique).toBe(true)
  })

  test("ReplyLog carries its own tenantId rather than relying only on a join through GoogleReview", () => {
    // If a route ever queried ReplyLog without going through the scoped
    // client (a raw query, a script), the row itself still names its tenant —
    // it is not only inferable via the review relation.
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === "ReplyLog")
    const field = model?.fields.find(f => f.name === "tenantId")
    expect(field).toBeDefined()
  })
})
