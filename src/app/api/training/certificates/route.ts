import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { currentTenant, PLATFORM } from "@/lib/tenant"
import {
  getTenantCertificates,
  issueAttendeeCertificate,
  updateCertificateRecord,
  verifyCertificateById,
  getCourseByIdOrSlug,
  applyTemplateToAllPastAndFuture,
} from "@/lib/training-service"
import { sendWhatsApp } from "@/lib/flow-delivery"

export const dynamic = "force-dynamic"

export const GET = withErrors(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const certId = searchParams.get("id") || searchParams.get("verify")

  if (certId) {
    const verified = await verifyCertificateById(certId)
    if (!verified) {
      return NextResponse.json({ error: "Certificate not found or invalid" }, { status: 404 })
    }
    return NextResponse.json({ verified: true, certificate: verified })
  }

  const tenant = currentTenant()
  const tenantId = tenant?.tenantId || PLATFORM
  const list = await getTenantCertificates(tenantId)
  return NextResponse.json({ certificates: list, total: list.length })
})

export const POST = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId || PLATFORM
  const body = await request.json()

  if (body.action === "apply-global-template") {
    const res = await applyTemplateToAllPastAndFuture(tenantId, {
      certificateTitle: body.certificateTitle,
      certificateSubtitle: body.certificateSubtitle,
      certificateBodyText: body.certificateBodyText,
      trainerCompany: body.trainerCompany,
      trainerName: body.trainerName,
      trainerDesignation: body.trainerDesignation,
      showTrainerDesignation: body.showTrainerDesignation,
      showCourseDates: body.showCourseDates,
      templateTheme: body.templateTheme,
      borderStyle: body.borderStyle,
      sealType: body.sealType,
      accentColor: body.accentColor,
    })
    return NextResponse.json({
      success: true,
      propagatedCount: res.propagatedCertificates,
      coursesUpdated: res.updatedCourses,
    })
  }

  const { registrationId, attendeeId, sendWhatsAppNotice, overrides } = body
  if (!registrationId || !attendeeId) {
    return NextResponse.json(
      { error: "registrationId and attendeeId are required" },
      { status: 400 },
    )
  }

  const certificate = await issueAttendeeCertificate(tenantId, registrationId, attendeeId, overrides)

  // Send WhatsApp delivery if requested
  let whatsappDelivered = false
  if (sendWhatsAppNotice && body.recipientPhone) {
    try {
      const msg =
        `🎓 *${certificate.certificateTitle || "Certificate of Completion"} — ${certificate.courseName}*\n\n` +
        `Congratulations *${certificate.recipientName}*!\n\n` +
        `Your official training credential has been generated and cryptographically verified:\n\n` +
        `• *Credential ID:* ${certificate.id}\n` +
        (certificate.courseDates ? `• *Course Dates:* ${certificate.courseDates}\n` : "") +
        `• *Issue Date:* ${certificate.issueDate}\n` +
        `• *Instructor:* ${certificate.trainerName}\n\n` +
        `🔗 View & Download your Verifiable Certificate:\n` +
        `${certificate.credentialUrl}\n\n` +
        `We wish you continued professional excellence!`

      const cleanPhone = body.recipientPhone.replace(/[^0-9+]/g, "")
      const res = await sendWhatsApp({
        to: cleanPhone,
        body: msg,
        allowOutsideSession: true,
      })
      whatsappDelivered = !!res?.success
    } catch (waErr) {
      console.warn("[training] Failed to send WhatsApp certificate notice:", waErr)
    }
  }

  return NextResponse.json({
    success: true,
    certificate,
    whatsappDelivered,
  })
})

export const PUT = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId || PLATFORM
  const body = await request.json()
  const id = body.id || body.certificateId
  if (!id) {
    return NextResponse.json({ error: "Certificate ID is required" }, { status: 400 })
  }

  const updates = body.updates || body
  const updated = await updateCertificateRecord(tenantId, id, updates)
  if (!updated) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 })
  }

  let propagatedCount = 0
  let coursesUpdated = 0
  if (body.applyToAllPastAndFuture || updates.applyToAllPastAndFuture) {
    const res = await applyTemplateToAllPastAndFuture(tenantId, {
      certificateTitle: updated.certificateTitle,
      certificateSubtitle: updated.certificateSubtitle,
      certificateBodyText: updated.certificateBodyText,
      trainerCompany: updated.trainerCompany,
      trainerName: updated.trainerName,
      trainerDesignation: updated.trainerDesignation,
      showTrainerDesignation: updated.showTrainerDesignation,
      showCourseDates: updated.showCourseDates,
      templateTheme: updated.templateTheme,
      borderStyle: updated.borderStyle,
      sealType: updated.sealType,
      accentColor: updated.accentColor,
    })
    propagatedCount = res.propagatedCertificates
    coursesUpdated = res.updatedCourses
  }

  return NextResponse.json({
    success: true,
    certificate: updated,
    propagatedCount,
    coursesUpdated,
  })
})
