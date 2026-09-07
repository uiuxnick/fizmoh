import DesignCanvasEditor from "@/components/design-canvas-editor"

/**
 * The full-page QR print-design editor.
 *
 * Deliberately outside the AppShell/sidebar layout — a canvas editor wants
 * the whole viewport, not a panel inside one. Auth still applies: every real
 * read/write goes through /api/qr-codes/[id]/* routes, which are gated the
 * same way as every other Digital QR Addons endpoint (withModule + the
 * staff-session header the reverse proxy attaches). The editor itself checks
 * /api/staff/me on mount purely so a signed-out visitor sees a sign-in
 * prompt instead of a broken, empty canvas.
 */
export const metadata = {
  title: "Design QR",
  robots: { index: false, follow: false },
}

export default async function DesignPage({ params }: { params: Promise<{ qrCodeId: string }> }) {
  const { qrCodeId } = await params
  return <DesignCanvasEditor qrCodeId={qrCodeId} />
}
