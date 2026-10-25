import type { NextRequest } from "next/server"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant } from "@/lib/tenant"
import { raw } from "@/lib/db"

export function samePatientPhone(left: string, right: string): boolean {
  const normalize = (value: string) => value.replace(/[\s()+-]/g, "")
  return !!normalize(left) && normalize(left) === normalize(right)
}

export async function verifiedPatientPhone(request: NextRequest, tenantId: string): Promise<string | null> {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "customer" || !session.customerId) return null
  const customer = await raw.customer.findFirst({ where: { id: session.customerId, tenantId }, select: { phone: true } })
  return customer?.phone ?? null
}

export async function canReadPatient(request: NextRequest, tenantId: string, mobile: string): Promise<boolean> {
  const session = await sessionFromRequest(request)
  if (session?.kind === "staff") {
    const tenant = currentTenant()
    if (tenant?.tenantId === tenantId) return true
    if ((session as any).tenantId === tenantId) return true
    if (session.staffId) {
      const member = await raw.tenantMember.findUnique({
        where: { tenantId_staffId: { tenantId, staffId: session.staffId } },
      })
      if (member) return true
      const staff = await raw.staff.findUnique({
        where: { id: session.staffId },
        select: { tenantId: true, role: true },
      })
      if (staff?.tenantId === tenantId || staff?.role === "SUPER_ADMIN") return true
    }
  }
  const phone = await verifiedPatientPhone(request, tenantId)
  return phone !== null && samePatientPhone(phone, mobile)
}
