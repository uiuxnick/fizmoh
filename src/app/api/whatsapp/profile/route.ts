import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { db } from "@/lib/db"
import { tokenFor } from "@/lib/whatsapp-accounts"
import {
  getWhatsAppBusinessProfile,
  updateWhatsAppBusinessProfile,
  uploadWhatsAppProfilePhoto,
} from "@/lib/whatsapp"

/**
 * Resolves credentials for a specific WhatsApp account or the active workspace default.
 */
async function resolveAccountCredentials(accountId?: string | null) {
  if (accountId) {
    const acc = await db.whatsAppAccount.findUnique({ where: { id: accountId } })
    if (acc) {
      return {
        phoneNumberId: acc.phoneNumberId,
        accessToken: tokenFor(acc),
        verifiedName: acc.verifiedName,
        displayPhone: acc.displayPhone,
        account: acc,
      }
    }
  }

  // Fallback to default connected WhatsApp account
  const defaultAcc = await db.whatsAppAccount.findFirst({
    where: { isDefault: true },
  }) ?? await db.whatsAppAccount.findFirst({
    orderBy: { createdAt: "desc" },
  })

  if (defaultAcc) {
    return {
      phoneNumberId: defaultAcc.phoneNumberId,
      accessToken: tokenFor(defaultAcc),
      verifiedName: defaultAcc.verifiedName,
      displayPhone: defaultAcc.displayPhone,
      account: defaultAcc,
    }
  }

  return {
    phoneNumberId: undefined,
    accessToken: undefined,
    verifiedName: undefined,
    displayPhone: undefined,
    account: null,
  }
}

/**
 * GET /api/whatsapp/profile
 * Retrieves the WhatsApp Business Profile from Meta Graph API.
 */
export const GET = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get("accountId")

  const creds = await resolveAccountCredentials(accountId)
  const result = await getWhatsAppBusinessProfile({
    phoneNumberId: creds.phoneNumberId,
    accessToken: creds.accessToken,
  })

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "Failed to fetch WhatsApp profile from Meta" },
      { status: 400 },
    )
  }

  return NextResponse.json({
    success: true,
    profile: result.profile,
    account: creds.account ? {
      id: creds.account.id,
      displayPhone: creds.displayPhone,
      verifiedName: creds.verifiedName,
      qualityRating: creds.account.qualityRating,
      messagingLimit: creds.account.messagingLimit,
    } : null,
  })
})

/**
 * POST /api/whatsapp/profile
 * Updates the WhatsApp Business Profile fields or uploads a new profile picture.
 */
export const POST = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const contentType = request.headers.get("content-type") || ""

  // 1. Multipart Form Data (Photo Upload or FormData fields)
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData()
    const accountId = formData.get("accountId") as string | null
    const creds = await resolveAccountCredentials(accountId)

    const file = formData.get("file") as File | null
    if (file) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "Please upload an image file (PNG, JPG, WEBP)" }, { status: 400 })
      }
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "Image file size exceeds 5 MB limit" }, { status: 400 })
      }

      const bytes = Buffer.from(await file.arrayBuffer())
      const photoResult = await uploadWhatsAppProfilePhoto({
        bytes,
        contentType: file.type,
        phoneNumberId: creds.phoneNumberId,
        accessToken: creds.accessToken,
      })

      if (!photoResult.success) {
        return NextResponse.json({ error: photoResult.error || "Failed to upload profile photo to Meta" }, { status: 400 })
      }

      return NextResponse.json({ success: true, message: "Profile photo updated on WhatsApp" })
    }

    // FormData fields update
    const about = formData.get("about") as string | null
    const description = formData.get("description") as string | null
    const address = formData.get("address") as string | null
    const email = formData.get("email") as string | null
    const vertical = formData.get("vertical") as string | null
    const website1 = formData.get("website1") as string | null
    const website2 = formData.get("website2") as string | null

    const websites = [website1, website2].filter(Boolean) as string[]

    const updateRes = await updateWhatsAppBusinessProfile({
      about: about ?? undefined,
      description: description ?? undefined,
      address: address ?? undefined,
      email: email ?? undefined,
      vertical: vertical ?? undefined,
      websites: websites.length ? websites : undefined,
      phoneNumberId: creds.phoneNumberId,
      accessToken: creds.accessToken,
    })

    if (!updateRes.success) {
      return NextResponse.json({ error: updateRes.error || "Failed to update profile on Meta" }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: "WhatsApp Business profile updated successfully" })
  }

  // 2. JSON Body
  const body = await request.json().catch(() => ({}))
  const accountId = body.accountId as string | undefined
  const creds = await resolveAccountCredentials(accountId)

  const updateRes = await updateWhatsAppBusinessProfile({
    about: body.about,
    description: body.description,
    address: body.address,
    email: body.email,
    vertical: body.vertical,
    websites: body.websites,
    phoneNumberId: creds.phoneNumberId,
    accessToken: creds.accessToken,
  })

  if (!updateRes.success) {
    return NextResponse.json({ error: updateRes.error || "Failed to update profile on Meta" }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    message: "WhatsApp Business profile updated on Meta successfully",
  })
})
