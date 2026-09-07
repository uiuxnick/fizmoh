import { AsyncLocalStorage } from "async_hooks"

/**
 * Which business a request belongs to.
 *
 * Kept apart from everything that touches the database, because the scoped
 * client has to read this and this must not, in turn, need the client. A
 * circular import between the two would be resolved at load time in whichever
 * order the bundler happened to pick.
 *
 * See tenant.ts for how a request is resolved to one of these.
 */

export interface TenantContext {
  tenantId: string
  slug: string
  /** The signed-in person's role inside this workspace, not their global one. */
  role?: string
  staffId?: string
}

/**
 * The installation's own scope, for settings that are ours rather than a
 * business's — our push key, our Meta app, a one-time code for somebody who
 * has not reached a workspace yet.
 */
export const PLATFORM = ""

const storage = new AsyncLocalStorage<TenantContext>()

/** Runs work with a tenant in scope. Everything inside sees it. */
export function withTenant<T>(context: TenantContext, work: () => Promise<T>): Promise<T> {
  return storage.run(context, work)
}

/** The tenant in scope, or null outside one. */
export function currentTenant(): TenantContext | null {
  return storage.getStore() ?? null
}

/**
 * The tenant in scope, or a thrown error.
 *
 * Used by anything that must not silently operate across all businesses. The
 * failure is loud on purpose: a query that quietly returns everything is a
 * data leak that looks like a working feature.
 */
export function requireTenant(): TenantContext {
  const context = storage.getStore()
  if (!context) {
    throw new Error(
      "No tenant in scope. This code path must run inside withTenant() — " +
        "an unscoped query would read every business's data.",
    )
  }
  return context
}

