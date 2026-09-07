import { Prisma, PrismaClient } from '@prisma/client'
import { currentTenant } from '@/lib/tenant-context'

/**
 * The database client, scoped to the business making the request.
 *
 * Every query in this codebase — a hundred routes, a dozen libraries, a
 * webhook, five cron jobs — used to read the whole table. That was correct
 * when the whole table belonged to one business. It is a data breach the
 * moment a second one exists, and the failure mode is silent: the query
 * succeeds, the page renders, and somebody is looking at another company's
 * customers.
 *
 * Scoping is applied here rather than at each call site on purpose. There is
 * no version of "remember to add tenantId" that survives a year of features
 * being added by people who have never read this comment. A query that forgets
 * should be impossible, not discouraged.
 *
 * Outside a workspace — the customer-facing site, a cron run, a webhook that
 * has not yet resolved which business it is for — nothing is injected and the
 * query behaves as it always did. That is deliberate: those paths have no
 * workspace to scope to, and refusing them would take down the parts of the
 * product that have no tenant by nature.
 */

/**
 * Models that manage their own scope and must not be narrowed here.
 *
 * A setting falls back from the workspace's own value to the installation's,
 * which is a query for two scopes at once — exactly what this extension exists
 * to prevent, and correct in this one case. Injecting an equality here would
 * cut off the fallback and take a business's WhatsApp credentials away.
 */
const SELF_SCOPED = new Set(['SystemSetting'])

/** Models that carry a tenantId, read from the schema rather than listed. */
const TENANT_MODELS = new Set(
  Prisma.dmmf.datamodel.models
    .filter(model => model.fields.some(field => field.name === 'tenantId'))
    .map(model => model.name)
    .filter(name => !SELF_SCOPED.has(name)),
)

/** The workspace to scope to, or null when there is none in scope. */
function scope(): string | null {
  const id = currentTenant()?.tenantId
  return id ? id : null
}

function isScoped(model: string | undefined): model is string {
  return !!model && TENANT_MODELS.has(model)
}

/**
 * Scoped queries that ran with no workspace, reported once each.
 *
 * Once per model and operation for the life of the process: this is a census,
 * not an alarm, and a line per query would bury the log it is written to. The
 * stack is trimmed to the frames inside this codebase, which is the only part
 * that says which route did it.
 */
const unscopedSeen = new Set<string>()

function reportUnscoped(model: string, operation: string, args: unknown) {
  /*
   * Only the queries that are actually unfiltered.
   *
   * Several routes run outside a workspace on purpose and pass `tenantId` in
   * the where clause themselves — the public hospital pages do exactly this,
   * and they are correct. Reporting those would bury the ones that filter by
   * nothing at all, which are the only ones that can return another business's
   * rows. So a query that names a tenant is not a finding, wherever it got the
   * name from.
   */
  const clause = (args as { where?: Record<string, unknown> } | null)?.where
  const payload = (args as { data?: Record<string, unknown> } | null)?.data
  if (clause && "tenantId" in clause) return
  if (payload && "tenantId" in payload) return

  const key = `${model}.${operation}`
  if (unscopedSeen.has(key)) return
  unscopedSeen.add(key)

  const where = (new Error().stack ?? "")
    .split("\n")
    .filter(line => line.includes("/src/") && !line.includes("/src/lib/db.ts"))
    .slice(0, 3)
    .map(line => line.trim())
    .join(" | ")

  console.warn(`[tenancy] unscoped query: ${key}${where ? ` — ${where}` : ""}`)
}

function base() {
  return new PrismaClient({ log: ['error', 'warn'] }).$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query: typedQuery }) {
          const query = typedQuery as (a: unknown) => Promise<unknown>
          const tenantId = scope()
          if (!tenantId || !isScoped(model)) {
            // A scoped model queried with no workspace in scope runs across
            // every tenant. Sometimes that is correct — cron, signup and the
            // payment webhooks legitimately run outside a workspace — and
            // sometimes it is a leak, as it was in the WhatsApp webhook, which
            // searched every business's customers by phone number.
            //
            // Which is which cannot be settled by reading 230 routes and
            // guessing; flipping the default to refuse without knowing would
            // stop payments. So this records what actually happens in
            // production, once per model and operation, and the default is
            // tightened afterwards against evidence rather than a hunch.
            if (!tenantId && isScoped(model)) reportUnscoped(model, operation, args)
            return query(args)
          }

          const input = (args ?? {}) as Record<string, any>

          switch (operation) {
            // Plain reads: narrowed to this workspace before they run.
            case 'findMany':
            case 'findFirst':
            case 'findFirstOrThrow':
            case 'count':
            case 'aggregate':
            case 'groupBy':
              return query({ ...input, where: { ...(input.where ?? {}), tenantId } })

            /*
             * A lookup by unique key cannot be narrowed — Prisma only accepts
             * unique fields in the where of a findUnique, and tenantId is not
             * one. So the row is fetched and then checked. The id is
             * unguessable, but "unguessable" is not an access rule, and one
             * leaked id should not be enough.
             */
            case 'findUnique':
            case 'findUniqueOrThrow': {
              const row = (await query(input)) as { tenantId?: string | null } | null
              if (!row) return row
              if (row.tenantId && row.tenantId !== tenantId) {
                if (operation === 'findUniqueOrThrow') {
                  throw new Error(`No ${model} found`)
                }
                return null
              }
              return row
            }

            // Anything created inside a workspace belongs to it. An explicit
            // tenantId is left alone so the platform can still place a row
            // deliberately.
            case 'create':
              return query({
                ...input,
                data: { tenantId, ...(input.data ?? {}) },
              })

            case 'createMany':
            case 'createManyAndReturn': {
              const rows = Array.isArray(input.data) ? input.data : [input.data]
              return query({
                ...input,
                data: rows.map((row: Record<string, any>) => ({ tenantId, ...row })),
              })
            }

            // Bulk writes are filtered the same way reads are.
            case 'updateMany':
            case 'updateManyAndReturn':
            case 'deleteMany':
              return query({ ...input, where: { ...(input.where ?? {}), tenantId } })

            /*
             * Single-row writes by unique key have the same problem as
             * findUnique and the same answer, except that here getting it
             * wrong means editing or deleting another business's record. The
             * row is read first and the write refused if it is not theirs.
             */
            case 'update':
            case 'delete': {
              const owner = await ownerOf(model, input.where)
              if (owner && owner !== tenantId) {
                throw new Error(`No ${model} found`)
              }
              return query(input)
            }

            case 'upsert': {
              const owner = await ownerOf(model, input.where)
              if (owner && owner !== tenantId) {
                throw new Error(`No ${model} found`)
              }
              // Cast because the union of every model's argument type is not
              // narrowable here; the shape is the caller's own, with one
              // field added.
              return query({
                ...input,
                create: { tenantId, ...(input.create ?? {}) },
              })
            }

            default:
              // Operations with no tenant meaning of their own: raw queries,
              // $transaction plumbing, aggregate variants Prisma adds later.
              return query(args)
          }
        },
      },
    },
  })
}

/**
 * Which workspace owns the row a unique where points at.
 *
 * Uses the unscoped client on purpose: the question being asked is "whose is
 * this", and a scoped read would answer by hiding the row, which is the same
 * answer for "not yours" and "does not exist" — the caller could not then tell
 * a refusal from a missing record.
 */
async function ownerOf(model: string, where: unknown): Promise<string | null> {
  if (!where) return null
  try {
    const delegate = (raw as any)[lowerFirst(model)]
    const row = await delegate.findUnique({ where, select: { tenantId: true } })
    return row?.tenantId ?? null
  } catch {
    // A model without the field, or a where Prisma will reject anyway. Let the
    // real query produce the real error.
    return null
  }
}

function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1)
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof base> | undefined
  prismaRaw: PrismaClient | undefined
}

/**
 * The unscoped client.
 *
 * For the few things that are genuinely about every business at once —
 * resolving which workspace a request belongs to, the platform's own billing,
 * a migration. Reach for it only when the scoped client would be wrong, and
 * say why at the call site.
 */
export const raw =
  globalForPrisma.prismaRaw ?? new PrismaClient({ log: ['error', 'warn'] })

export const db = globalForPrisma.prisma ?? base()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
  globalForPrisma.prismaRaw = raw
}
