import { notFound, redirect } from "next/navigation"
import { resolveTableByToken } from "@/lib/restaurant"

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function TableQrRedirectPage({ params }: PageProps) {
  const { token } = await params

  const resolved = await resolveTableByToken(token)
  if (!resolved || !resolved.tenant) {
    notFound()
  }

  const { tenant, branch } = resolved
  const branchPart = branch?.slug ? `&branch=${branch.slug}` : ""

  redirect(`/menu/${tenant.slug}?tableToken=${token}${branchPart}`)
}
