import { notFound, redirect } from "next/navigation"
import { resolveTableByToken } from "@/lib/restaurant"
import { raw } from "@/lib/db"
import { QrReviewFlow } from "@/components/qr-review-flow"

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function QrRedirectPage({ params }: PageProps) {
  const { token } = await params

  // 1. Check if token is a restaurant table QR
  const resolved = await resolveTableByToken(token)
  if (resolved && resolved.tenant) {
    const { tenant, branch } = resolved
    const branchPart = branch?.slug ? `&branch=${branch.slug}` : ""
    redirect(`/menu/${tenant.slug}?tableToken=${token}${branchPart}`)
  }

  // 2. Check if token is a Digital QR review campaign
  const qr = await raw.qrCode.findUnique({
    where: { token },
    select: { id: true, isActive: true },
  })

  if (qr && qr.isActive) {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-md">
          <QrReviewFlow token={token} />
        </div>
      </main>
    )
  }

  notFound()
}
