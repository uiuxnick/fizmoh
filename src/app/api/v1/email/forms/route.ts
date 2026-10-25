import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireEmailMarketingAuth } from "@/lib/email-marketing/guard"

export async function GET(request: NextRequest) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.forms.read")
  if (response) return response

  const tenantId = auth!.tenant.tenantId
  const forms = await db.emailSignupForm.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ forms })
}

export async function POST(request: NextRequest) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.forms.manage")
  if (response) return response

  const tenantId = auth!.tenant.tenantId
  const body = await request.json().catch(() => ({}))
  const { name, formType = "EMBEDDED", targetListId, settings = {}, theme = {} } = body

  if (!name) {
    return NextResponse.json({ error: "Form name is required" }, { status: 400 })
  }

  const form = await db.emailSignupForm.create({
    data: {
      tenantId,
      name,
      formType,
      targetListId: targetListId || null,
      fieldsJson: [
        { field: "email", label: "Email Address", required: true },
        { field: "firstName", label: "First Name", required: false },
      ],
      settingsJson: settings,
      themeJson: theme,
    },
  })

  return NextResponse.json({ form })
}
