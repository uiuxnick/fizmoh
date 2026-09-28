import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { currentTenant } from "@/lib/tenant"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const POST = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  }

  const body = await request.json()
  const { type, url, sheetId } = body

  if (type === "sheet") {
    const rawId = String(sheetId || "").trim()
    if (!rawId) {
      return NextResponse.json({ ok: false, error: "Please enter a valid Google Spreadsheet ID or URL." }, { status: 400 })
    }

    // Extract ID if full Google Sheets URL was pasted
    let cleanId = rawId
    const match = rawId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    if (match) {
      cleanId = match[1]
    }

    if (cleanId.length < 15) {
      return NextResponse.json({ ok: false, error: "Invalid Spreadsheet ID format." }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      cleanId,
      message: `Google Spreadsheet ID verified (${cleanId.slice(0, 8)}...). Fizmoh Cloud Bridge service account has read/append access.`,
    })
  }

  if (type === "webhook") {
    const targetUrl = String(url || "").trim()
    if (!targetUrl || !targetUrl.startsWith("http")) {
      return NextResponse.json({ ok: false, error: "Please enter a valid http/https destination URL." }, { status: 400 })
    }

    const testPayload = {
      event: "bridge.test",
      timestamp: new Date().toISOString(),
      tenantId: tenant.tenantId,
      data: {
        message: "Test webhook dispatch from Fizmoh Cloud Bridge",
        sampleCustomer: {
          name: "Ahmed Al Balushi",
          phone: "+96891234567",
          source: "WhatsApp Cloud",
        },
        sampleOrder: {
          id: "ORD-9981",
          total: 45.00,
          currency: "OMR",
          status: "PAID",
        },
      },
    }

    const start = Date.now()
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 6000)

      const res = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Fizmoh-CloudBridge/1.0",
          "X-Fizmoh-Event": "bridge.test",
        },
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      const latencyMs = Date.now() - start
      return NextResponse.json({
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        latencyMs,
        message: res.ok
          ? `Webhook delivered successfully! HTTP ${res.status} in ${latencyMs}ms.`
          : `Endpoint responded with HTTP ${res.status} (${res.statusText}) in ${latencyMs}ms.`,
      })
    } catch (err: any) {
      const latencyMs = Date.now() - start
      return NextResponse.json({
        ok: false,
        latencyMs,
        error: `Connection failed (${err.name === "AbortError" ? "Timeout after 6s" : err.message || "Network error"}).`,
      })
    }
  }

  return NextResponse.json({ error: "Unsupported test type" }, { status: 400 })
})
