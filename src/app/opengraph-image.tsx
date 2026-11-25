import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Fizmoh — Official WhatsApp Business Platform & Cloud API in Oman & GCC"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #071912 0%, #0d2b1f 55%, #064e3b 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "#00E785",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                fontWeight: 900,
                color: "#071912",
              }}
            >
              F
            </div>
            <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em" }}>Fizmoh</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 20px",
              borderRadius: 999,
              border: "1px solid rgba(0, 231, 133, 0.35)",
              background: "rgba(0, 231, 133, 0.12)",
              fontSize: 18,
              fontWeight: 700,
              color: "#6ee7b7",
            }}
          >
            Official Meta Business Partner · Oman & GCC
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 960 }}>
          <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.03em" }}>
            Run your entire business on WhatsApp Cloud API
          </div>
          <div style={{ fontSize: 26, color: "#cbd5e1", lineHeight: 1.4 }}>
            Multi-Agent Team Inbox · Visual AI Bot Builder · Broadcasts · CRM · AmwalPay Checkout
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.14)",
            paddingTop: 24,
            fontSize: 20,
            color: "#94a3b8",
          }}
        >
          <span>app.fizmoh.cloud</span>
          <span style={{ color: "#00E785", fontWeight: 700 }}>Start 14-Day Free Trial →</span>
        </div>
      </div>
    ),
    { ...size },
  )
}
