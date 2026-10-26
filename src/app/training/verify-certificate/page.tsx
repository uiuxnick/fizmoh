import { redirect } from "next/navigation"
import { raw } from "@/lib/db"
import { verifyCertificateById } from "@/lib/training-service"
import AcademyVerification from "@/components/training/academy-verification"
export const metadata = { title: { absolute: "Certificate verification" }, robots: { index: false, follow: false } }
export const dynamic = "force-dynamic"
export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string; workspace?: string; tenantId?: string }> }) {
  const q = await searchParams, id = typeof q.id === "string" ? q.id.trim().slice(0,160) : ""
  const cert = id ? await verifyCertificateById(id) : null
  const tenantId = q.tenantId || cert?.tenantId
  // This link has been published by the Tanfidh academy before tenant-aware
  // URLs existed. Keep it valid and send it to the same branded verifier.
  const tenant = q.workspace || tenantId
    ? await raw.tenant.findUnique({ where: q.workspace ? { slug: q.workspace } : { id: tenantId! }, select: { slug: true } })
    : await raw.tenant.findUnique({ where: { slug: "tanfidh" }, select: { slug: true } })
  if (tenant) redirect(`/${encodeURIComponent(tenant.slug)}/verify-certificate${id ? `?id=${encodeURIComponent(id)}` : ""}`)
  return <div className="min-h-screen bg-stone-50"><AcademyVerification action="/training/verify-certificate" query={id} /></div>
}
