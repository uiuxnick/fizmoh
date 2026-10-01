import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
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
 * Persists WhatsApp business profile fields locally into the tenant system settings.
 */
async function persistProfileSettings(
  tenantId: string,
  fields: {
    about?: string | null
    description?: string | null
    address?: string | null
    email?: string | null
    vertical?: string | null
    websites?: string[] | null
  },
) {
  if (!tenantId) return
  const upserts: { key: string; value: string }[] = []

  if (fields.about !== undefined) {
    upserts.push({ key: "whatsapp_profile_about", value: fields.about || "" })
  }
  if (fields.description !== undefined) {
    upserts.push({ key: "whatsapp_profile_description", value: fields.description || "" })
    if (fields.description) upserts.push({ key: "business_about", value: fields.description })
  }
  if (fields.address !== undefined) {
    upserts.push({ key: "whatsapp_profile_address", value: fields.address || "" })
    if (fields.address) upserts.push({ key: "business_address", value: fields.address })
  }
  if (fields.email !== undefined) {
    upserts.push({ key: "whatsapp_profile_email", value: fields.email || "" })
    if (fields.email) upserts.push({ key: "business_email", value: fields.email })
  }
  if (fields.vertical !== undefined) {
    upserts.push({ key: "whatsapp_profile_vertical", value: fields.vertical || "" })
  }
  if (fields.websites !== undefined) {
    upserts.push({ key: "whatsapp_profile_websites", value: JSON.stringify(fields.websites || []) })
    if (fields.websites?.[0]) upserts.push({ key: "business_website", value: fields.websites[0] })
  }

  await Promise.all(
    upserts.map(u =>
      db.systemSetting.upsert({
        where: { tenantId_key: { tenantId, key: u.key } },
        update: { value: u.value, type: "STRING", category: "WHATSAPP" },
        create: { tenantId, key: u.key, value: u.value, type: "STRING", category: "WHATSAPP" },
      }).catch(() => null),
    ),
  )
}

/**
 * GET /api/whatsapp/profile
 * Retrieves the WhatsApp Business Profile from Meta Graph API, falling back to local tenant settings.
 */
export const GET = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get("accountId")

  const creds = await resolveAccountCredentials(accountId)
  const tenantId = creds.account?.tenantId || currentTenant()?.tenantId || ""

  // 1. Fetch locally saved profile settings
  const localSettings = tenantId
    ? await db.systemSetting.findMany({
        where: {
          tenantId,
          key: {
            in: [
              "whatsapp_profile_about",
              "whatsapp_profile_description",
              "whatsapp_profile_address",
              "whatsapp_profile_email",
              "whatsapp_profile_vertical",
              "whatsapp_profile_websites",
              "business_address",
              "business_email",
              "business_website",
              "business_about",
            ],
          },
        },
      }).catch(() => [])
    : []

  const settingMap = new Map(localSettings.map(s => [s.key, s.value]))
  let localWebsites: string[] = []
  try {
    const rawSites = settingMap.get("whatsapp_profile_websites")
    if (rawSites) localWebsites = JSON.parse(rawSites)
  } catch {}
  if (!localWebsites.length && settingMap.get("business_website")) {
    localWebsites = [settingMap.get("business_website")!]
  }

  // 2. Fetch live profile from Meta
  let metaProfile: any = null
  let metaError: string | undefined
  if (creds.phoneNumberId && creds.accessToken) {
    const result = await getWhatsAppBusinessProfile({
      phoneNumberId: creds.phoneNumberId,
      accessToken: creds.accessToken,
    })
    if (result.success && result.profile) {
      metaProfile = result.profile
    } else {
      metaError = result.error
    }
  }

  // 3. Compose merged profile
  const profile = {
    about: (settingMap.get("whatsapp_profile_about") || (metaProfile?.about && metaProfile.about.trim() ? metaProfile.about : "")).trim(),
    description: (settingMap.get("whatsapp_profile_description") || metaProfile?.description || settingMap.get("business_about") || "").trim(),
    address: (settingMap.get("whatsapp_profile_address") || metaProfile?.address || settingMap.get("business_address") || "").trim(),
    email: (settingMap.get("whatsapp_profile_email") || metaProfile?.email || settingMap.get("business_email") || "").trim(),
    vertical: settingMap.get("whatsapp_profile_vertical") || metaProfile?.vertical || "TRAVEL",
    websites: localWebsites.length ? localWebsites : (metaProfile?.websites || []),
    profilePictureUrl: metaProfile?.profilePictureUrl || "",
    messagingProduct: "whatsapp",
  }

  return NextResponse.json({
    success: true,
    profile,
    metaSynced: !metaError,
    metaError,
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
    const tenantId = creds.account?.tenantId || currentTenant()?.tenantId || ""

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
        const isPerm = photoResult.error?.includes("#200") || photoResult.error?.toLowerCase().includes("permission")
        const friendlyErr = isPerm
          ? "Meta requires phone management permissions to change profile pictures via API. You can upload it directly in Meta WhatsApp Manager."
          : (photoResult.error || "Failed to upload profile photo to Meta")
        return NextResponse.json({ error: friendlyErr }, { status: 400 })
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

    // Persist locally first
    await persistProfileSettings(tenantId, {
      about,
      description,
      address,
      email,
      vertical,
      websites,
    })

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
      const isPermissionErr =
        updateRes.error?.includes("#200") ||
        updateRes.error?.toLowerCase().includes("permission") ||
        updateRes.error?.toLowerCase().includes("scope")

      const userNotice = isPermissionErr
        ? "Profile saved in Fizmoh! Direct Meta API sync requires Phone Management permissions in your Meta Business Suite, or you can edit it directly in WhatsApp Manager."
        : `Profile saved in Fizmoh! (Meta sync notice: ${updateRes.error})`

      return NextResponse.json({
        success: true,
        metaSynced: false,
        warning: userNotice,
        message: userNotice,
        metaError: updateRes.error,
      })
    }

    return NextResponse.json({ success: true, metaSynced: true, message: "WhatsApp Business profile updated successfully" })
  }

  // 2. JSON Body
  const body = await request.json().catch(() => ({}))
  const accountId = body.accountId as string | undefined
  const creds = await resolveAccountCredentials(accountId)
  const tenantId = creds.account?.tenantId || currentTenant()?.tenantId || ""

  // Persist locally first so data is never lost
  await persistProfileSettings(tenantId, {
    about: body.about,
    description: body.description,
    address: body.address,
    email: body.email,
    vertical: body.vertical,
    websites: body.websites,
  })

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
    const isPermissionErr =
      updateRes.error?.includes("#200") ||
      updateRes.error?.toLowerCase().includes("permission") ||
      updateRes.error?.toLowerCase().includes("scope")

    const userNotice = isPermissionErr
      ? "Profile saved in Fizmoh! Direct Meta API sync requires Phone Management permissions in your Meta Business Suite, or you can edit it directly in WhatsApp Manager."
      : `Profile saved in Fizmoh! (Meta sync notice: ${updateRes.error})`

    return NextResponse.json({
      success: true,
      metaSynced: false,
      warning: userNotice,
      message: userNotice,
      metaError: updateRes.error,
    })
  }

  return NextResponse.json({
    success: true,
    metaSynced: true,
    message: "WhatsApp Business profile updated on Meta successfully",
  })
})
