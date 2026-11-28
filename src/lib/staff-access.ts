import { raw } from "@/lib/db"
import { hasPermission, maskPhoneNumber, resolveStaffPermissions } from "@/lib/permissions"

export interface ResolvedStaffAccess {
  role: string
  permissions: Record<string, boolean>
  canViewPhoneNumbers: boolean
}

/**
 * Resolves effective role, granular permissions, and phone visibility for a staff
 * member within a workspace, falling back to the staff's base role if no
 * tenant membership override exists.
 */
export async function resolveStaffAccess(
  staffId: string,
  tenantId: string | null | undefined,
  fallbackRole?: string | null,
): Promise<ResolvedStaffAccess> {
  const membership = tenantId
    ? await raw.tenantMember.findUnique({
        where: { tenantId_staffId: { tenantId, staffId } },
        select: { role: true, permissions: true },
      })
    : null

  const role = membership?.role || fallbackRole || "CHAT_AGENT"
  const rawOverrides = (membership?.permissions as Record<string, boolean>) || null
  const permissions = resolveStaffPermissions(role, rawOverrides)
  const canViewPhoneNumbers = hasPermission({ role, permissions }, "view_phone_numbers")
  return { role, permissions, canViewPhoneNumbers }
}

/**
 * Masks customer phone fields on a conversation payload when the caller lacks
 * `view_phone_numbers` permission so raw numbers never leave the server.
 */
export function sanitizeConversationPhone<T extends { customerPhone: string; customer?: { phone?: string | null } | null }>(
  conversation: T,
  canViewPhoneNumbers: boolean,
): T {
  if (canViewPhoneNumbers) return conversation
  return {
    ...conversation,
    customerPhone: maskPhoneNumber(conversation.customerPhone, false),
    ...(conversation.customer
      ? {
          customer: {
            ...conversation.customer,
            phone: conversation.customer.phone
              ? maskPhoneNumber(conversation.customer.phone, false)
              : conversation.customer.phone,
          },
        }
      : {}),
  }
}
