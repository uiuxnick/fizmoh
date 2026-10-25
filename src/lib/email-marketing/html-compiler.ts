import type { EmailDesignJson, EmailBlock, EmailSection } from "./types"

export function renderEmailHtml(design: EmailDesignJson, isRtl = false): { html: string; plainText: string } {
  const theme = design.theme || {
    primaryColor: "#059669",
    accentColor: "#10b981",
    backgroundColor: "#f8fafc",
    contentWidth: 600,
    fontFamily: "Arial, sans-serif",
    isRtl: false,
  }

  const direction = isRtl || theme.isRtl ? "rtl" : "ltr"
  const textAlign = direction === "rtl" ? "right" : "left"

  let plainTextAcc = ""

  const sectionsHtml = design.sections
    .map((section: EmailSection) => {
      const secBg = section.backgroundColor || "transparent"
      const secPadding = section.padding || "16px 20px"

      const blocksHtml = section.blocks
        .map((block: EmailBlock) => {
          switch (block.type) {
            case "heading": {
              const text = (isRtl && block.contentAr ? block.contentAr : block.content) || ""
              plainTextAcc += `${text}\n\n`
              const size = block.style?.fontSize || "24px"
              const color = block.style?.color || "#0f172a"
              return `<h2 style="margin: 0 0 14px 0; font-size: ${size}; color: ${color}; font-weight: 700; line-height: 1.3; text-align: ${textAlign};">${escapeHtml(text)}</h2>`
            }
            case "text": {
              const text = (isRtl && block.contentAr ? block.contentAr : block.content) || ""
              plainTextAcc += `${text}\n\n`
              const size = block.style?.fontSize || "15px"
              const color = block.style?.color || "#334155"
              const lineHeight = block.style?.lineHeight || "1.6"
              return `<p style="margin: 0 0 16px 0; font-size: ${size}; color: ${color}; line-height: ${lineHeight}; text-align: ${textAlign};">${escapeHtml(text).replace(/\n/g, "<br/>")}</p>`
            }
            case "image": {
              const imgUrl = block.imageUrl || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800"
              const alt = block.altText || "Image"
              const linkUrl = block.url
              const imgHtml = `<img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(alt)}" style="display: block; width: 100%; max-width: 100%; height: auto; border: 0; border-radius: 8px; margin: 0 auto 16px;" />`
              return linkUrl ? `<a href="${escapeHtml(linkUrl)}" target="_blank">${imgHtml}</a>` : imgHtml
            }
            case "button": {
              const label = (isRtl && block.contentAr ? block.contentAr : block.content) || "Click Here"
              plainTextAcc += `[${label}] (${block.url || "#"})\n\n`
              const bg = block.style?.backgroundColor || theme.primaryColor || "#059669"
              const textColor = block.style?.color || "#ffffff"
              const radius = block.style?.borderRadius || "8px"
              return `
                <div style="margin: 20px 0; text-align: ${textAlign};">
                  <a href="${escapeHtml(block.url || "#")}" target="_blank" style="display: inline-block; background-color: ${bg}; color: ${textColor}; padding: 12px 28px; text-decoration: none; border-radius: ${radius}; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">${escapeHtml(label)}</a>
                </div>
              `
            }
            case "divider": {
              return `<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />`
            }
            case "spacer": {
              const height = block.style?.height || "24px"
              return `<div style="height: ${height}; line-height: ${height}; font-size: 1px;">&nbsp;</div>`
            }
            case "social": {
              return `
                <div style="text-align: center; padding: 12px 0;">
                  <span style="font-size: 13px; color: #64748b; font-weight: 500;">Follow Us &bull; تواصل معنا</span>
                </div>
              `
            }
            case "footer": {
              const text = (isRtl && block.contentAr ? block.contentAr : block.content) || "You received this email because you are a registered subscriber."
              plainTextAcc += `${text}\nUnsubscribe: {{unsubscribe_url}}\n\n`
              return `
                <div style="padding: 20px 0; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">
                  <p style="margin: 0 0 8px 0;">${escapeHtml(text)}</p>
                  <p style="margin: 0;">
                    <a href="{{unsubscribe_url}}" style="color: #64748b; text-decoration: underline;">Unsubscribe / إلغاء الاشتراك</a>
                    &bull;
                    <a href="{{preferences_url}}" style="color: #64748b; text-decoration: underline;">Manage Preferences</a>
                  </p>
                </div>
              `
            }
            case "html": {
              return block.content || ""
            }
            default:
              return ""
          }
        })
        .join("\n")

      return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${secBg};">
          <tr>
            <td style="padding: ${secPadding};">
              ${blocksHtml}
            </td>
          </tr>
        </table>
      `
    })
    .join("\n")

  const fullHtml = `<!DOCTYPE html>
<html lang="${isRtl ? "ar" : "en"}" dir="${direction}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title></title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: ${theme.backgroundColor}; font-family: ${theme.fontFamily}; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${theme.backgroundColor};">
  <center style="width: 100%; background-color: ${theme.backgroundColor};">
    <div style="max-width: ${theme.contentWidth || 600}px; margin: 0 auto; padding: 24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: ${theme.contentWidth || 600}px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); margin: 0 auto;">
        <tr>
          <td>
            ${sectionsHtml}
          </td>
        </tr>
      </table>
    </div>
  </center>
</body>
</html>`

  return { html: fullHtml, plainText: plainTextAcc.trim() }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
