import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { requirePlatformAdmin } from "@/app/api/platform/tenants/route"
import { saveConfigValues, getConfigValue, clearConfigValue } from "@/lib/app-config"
import { writeFile, unlink, mkdir } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { storeMedia } from "@/lib/media-store"

const MAX_SIG_BYTES = 5 * 1024 * 1024 // 5MB

export const GET = withErrors(async (request: NextRequest) => {
  const admin = await requirePlatformAdmin(request)
  if (!admin) return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 })

  const [sigUrl, sigName] = await Promise.all([
    getConfigValue("invoice_signature_url").catch(() => ""),
    getConfigValue("invoice_signatory_name").catch(() => ""),
  ])

  let effectiveUrl = sigUrl || ""
  if (!effectiveUrl) {
    const defaultFile = path.join(process.cwd(), "public", "invoice", "signature.png")
    if (existsSync(defaultFile)) {
      effectiveUrl = "/invoice/signature.png"
    }
  }

  return NextResponse.json({
    signatureUrl: effectiveUrl,
    signatoryName: sigName || "Authorised Signature",
  })
})

export const POST = withErrors(async (request: NextRequest) => {
  const admin = await requirePlatformAdmin(request)
  if (!admin) return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 })

  const form = await request.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: "Invalid form data" }, { status: 400 })

  const file = form.get("file") as File | null
  const signatoryName = (form.get("signatoryName") as string | null)?.trim()

  if (signatoryName !== undefined && signatoryName !== null && signatoryName !== "") {
    await saveConfigValues({ invoice_signatory_name: signatoryName })
  }

  let finalUrl = ""

  if (file && typeof file === "object" && file.size > 0) {
    if (file.size > MAX_SIG_BYTES) {
      return NextResponse.json({ error: "Signature image must be under 5MB" }, { status: 400 })
    }

    const mime = (file.type || "").toLowerCase()
    if (!["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"].includes(mime)) {
      return NextResponse.json({ error: "Signature must be an image (PNG, JPG, WEBP, or SVG)" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 1. Save to public/invoice/signature.png for direct static serving
    const invoiceDir = path.join(process.cwd(), "public", "invoice")
    await mkdir(invoiceDir, { recursive: true })
    const targetFile = path.join(invoiceDir, "signature.png")
    await writeFile(targetFile, buffer)

    // 2. Also save to persistent media store if possible
    let mediaUrl = ""
    try {
      const stored = await storeMedia(buffer, mime, "invoice-signature.png")
      mediaUrl = stored.url
    } catch {
      // ignore media store fallback
    }

    finalUrl = `/invoice/signature.png?v=${Date.now()}`
    await saveConfigValues({ invoice_signature_url: mediaUrl || finalUrl })
  }

  const [savedUrl, savedName] = await Promise.all([
    getConfigValue("invoice_signature_url").catch(() => ""),
    getConfigValue("invoice_signatory_name").catch(() => ""),
  ])

  return NextResponse.json({
    ok: true,
    signatureUrl: finalUrl || savedUrl || "/invoice/signature.png",
    signatoryName: savedName || signatoryName || "Authorised Signature",
  })
})

export const DELETE = withErrors(async (request: NextRequest) => {
  const admin = await requirePlatformAdmin(request)
  if (!admin) return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 })

  await clearConfigValue("invoice_signature_url")
  const targetFile = path.join(process.cwd(), "public", "invoice", "signature.png")
  if (existsSync(targetFile)) {
    await unlink(targetFile).catch(() => {})
  }

  return NextResponse.json({ ok: true })
})
