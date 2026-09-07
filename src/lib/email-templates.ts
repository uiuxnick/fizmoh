/**
 * Professional HTML Email Template System for Fizmoh
 * 
 * Generates fully responsive, cross-client compatible (Gmail, Apple Mail, Outlook, Yahoo)
 * HTML emails with unified brand styling, elevation cards, and clear typography.
 */

export interface EmailShellOptions {
  brandName?: string
  logoUrl?: string
  headerTitle?: string
  badgeText?: string
  badgeVariant?: "emerald" | "blue" | "amber" | "rose" | "slate"
  preheader?: string
  contentHtml: string
  actionButton?: {
    label: string
    url: string
    variant?: "primary" | "emerald" | "amber"
  }
  securityNotice?: string
  footerNote?: string
  supportContact?: {
    email?: string
    phone?: string
    url?: string
  }
}

export function renderEmailShell(opts: EmailShellOptions): string {
  const brand = opts.brandName || "Fizmoh"
  const logoUrl = opts.logoUrl || "https://app.fizmoh.cloud/brand/fizmoh-mascot-logo.png"
  const currentYear = new Date().getFullYear()
  const preheader = opts.preheader ? `<span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${escapeHtml(opts.preheader)}</span>` : ""

  const badgeColors = {
    emerald: { bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46" },
    blue: { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
    amber: { bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
    rose: { bg: "#fff1f2", border: "#fecdd3", text: "#9f1239" },
    slate: { bg: "#f1f5f9", border: "#e2e8f0", text: "#334155" },
  }
  const badgeStyle = opts.badgeVariant ? badgeColors[opts.badgeVariant] : badgeColors.emerald

  let actionHtml = ""
  if (opts.actionButton) {
    const btnBg = opts.actionButton.variant === "emerald" ? "#059669" : opts.actionButton.variant === "amber" ? "#d97706" : "#0f172a"
    actionHtml = `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 16px 0;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="border-radius: 12px; background-color: ${btnBg};">
                  <a href="${opts.actionButton.url}" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px; letter-spacing: 0.2px;">
                    ${escapeHtml(opts.actionButton.label)} &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="font-size: 12px; line-height: 18px; color: #94a3b8; text-align: center; margin: 8px 0 0 0; word-break: break-all;">
        Or paste this link into your browser: <br/>
        <a href="${opts.actionButton.url}" style="color: #0284c7; text-decoration: underline;">${opts.actionButton.url}</a>
      </p>
    `
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(opts.headerTitle || brand)}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f8fafc; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  ${preheader}
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 36px 16px 44px 16px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; width: 100%;">
          
          <!-- OFFICIAL BRAND HEADER LOGO -->
          <tr>
            <td align="center" style="padding: 0 0 24px 0;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://app.fizmoh.cloud" target="_blank" style="text-decoration: none; display: inline-block;">
                      <img src="${logoUrl}" alt="${escapeHtml(brand)}" height="56" style="height: 56px; max-height: 62px; width: auto; max-width: 260px; display: block; border: 0; outline: none; margin: 0 auto; -ms-interpolation-mode: bicubic; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 22px; font-weight: 800; color: #059669;" />
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MAIN CARD -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.03); overflow: hidden;">
              
              <!-- CARD ACCENT BAR -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td height="5" style="background: linear-gradient(90deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%);"></td>
                </tr>
              </table>

              <!-- CARD CONTENT -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding: 32px 32px 36px 32px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      
                      ${opts.badgeText ? `
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <span style="display: inline-block; background-color: ${badgeStyle.bg}; border: 1px solid ${badgeStyle.border}; color: ${badgeStyle.text}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 12px; border-radius: 9999px;">
                            ${escapeHtml(opts.badgeText)}
                          </span>
                        </td>
                      </tr>
                      ` : ""}

                      ${opts.headerTitle ? `
                      <tr>
                        <td style="padding-bottom: 20px;">
                          <h1 style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 24px; font-weight: 800; color: #0f172a; line-height: 32px; letter-spacing: -0.5px;">
                            ${escapeHtml(opts.headerTitle)}
                          </h1>
                        </td>
                      </tr>
                      ` : ""}

                      <!-- BODY HTML -->
                      <tr>
                        <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 24px; color: #334155;">
                          ${opts.contentHtml}
                        </td>
                      </tr>

                      <!-- ACTION BUTTON -->
                      ${actionHtml ? `
                      <tr>
                        <td>${actionHtml}</td>
                      </tr>
                      ` : ""}

                      <!-- SECURITY CALLOUT -->
                      ${opts.securityNotice ? `
                      <tr>
                        <td style="padding-top: 24px;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; border-collapse: separate; border-spacing: 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                            <tr>
                              <td style="padding: 14px 18px; font-size: 12px; line-height: 20px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; word-break: break-word;">
                                <strong style="color: #334155; font-weight: 700;">Security Tip:</strong> ${escapeHtml(opts.securityNotice)}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ` : ""}

                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding: 28px 16px 0 16px; text-align: center;">
              ${opts.footerNote ? `
              <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 20px; color: #64748b;">
                ${escapeHtml(opts.footerNote)}
              </p>
              ` : ""}

              ${opts.supportContact?.email || opts.supportContact?.phone ? `
              <p style="margin: 0 0 12px 0; font-size: 12px; line-height: 18px; color: #94a3b8;">
                Need assistance? Contact our team at 
                ${opts.supportContact.email ? `<a href="mailto:${opts.supportContact.email}" style="color: #64748b; font-weight: 600; text-decoration: underline;">${opts.supportContact.email}</a>` : ""}
                ${opts.supportContact.phone ? ` or call <span style="color: #64748b; font-weight: 600;">${opts.supportContact.phone}</span>` : ""}
              </p>
              ` : ""}

              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #94a3b8;">
                &copy; ${currentYear} ${escapeHtml(brand)}. Powered by Fizmoh WhatsApp Cloud & Omnichannel Platform.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function escapeHtml(str: string): string {
  if (!str) return ""
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * 1. Staff Sign-in / OTP Code Email
 */
export function getStaffOtpEmailHtml(params: {
  code: string
  brandName?: string
  expiresInMinutes?: number
  magicLoginUrl?: string
  logoUrl?: string
}): string {
  const brand = params.brandName || "Fizmoh"
  const minutes = params.expiresInMinutes || 5
  const magicUrl = params.magicLoginUrl

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 24px; color: #334155;">
      Hello,
    </p>
    <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 24px; color: #334155;">
      Use the secure button below to sign in directly to your <strong>${escapeHtml(brand)}</strong> workspace with 1-click, or enter the 6-digit verification code.
    </p>

    ${magicUrl ? `
    <!-- 1-CLICK MAGIC LOGIN BUTTON -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0 20px 0;">
      <tr>
        <td align="center">
          <table border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="border-radius: 12px; background: linear-gradient(135deg, #059669 0%, #10b981 100%); box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);">
                <a href="${magicUrl}" target="_blank" style="display: inline-block; padding: 15px 36px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 800; color: #ffffff; text-decoration: none; border-radius: 12px; letter-spacing: 0.3px;">
                  ⚡ Sign In with 1-Click &rarr;
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- DIVIDER -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 22px 0 18px 0;">
      <tr>
        <td style="border-bottom: 1px solid #e2e8f0; line-height: 0.1em; text-align: center;">
          <span style="background: #ffffff; padding: 0 14px; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">
            OR ENTER CODE MANUALLY
          </span>
        </td>
      </tr>
    </table>
    ` : ""}

    <!-- CODE BADGE -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 16px 0;">
      <tr>
        <td align="center">
          <div style="display: inline-block; background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 16px 36px;">
            <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0f172a;">
              ${escapeHtml(params.code)}
            </span>
          </div>
        </td>
      </tr>
    </table>

    <p style="margin: 16px 0 0 0; font-size: 13px; line-height: 20px; color: #64748b; text-align: center;">
      ⏰ This code and 1-click link expire in <strong>${minutes} minutes</strong> and can only be used once.
    </p>
  `

  return renderEmailShell({
    brandName: brand,
    logoUrl: params.logoUrl,
    headerTitle: "Your Sign-In Verification Code",
    badgeText: "Security Verification",
    badgeVariant: "blue",
    preheader: `${params.code} is your sign-in verification code for ${brand}`,
    contentHtml,
    securityNotice: "Never share this verification code or 1-click link with anyone, including Fizmoh staff. If you did not attempt to sign in, your account may be compromised.",
  })
}

/**
 * 2. Staff Team Invitation Email
 */
export function getStaffInvitationEmailHtml(params: {
  inviterName: string
  brandName?: string
  role: string
  inviteUrl: string
  expiresInDays?: number
}): string {
  const brand = params.brandName || "Fizmoh Workspace"
  const days = params.expiresInDays || 7

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155;">
      Hello,
    </p>
    <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155;">
      <strong>${escapeHtml(params.inviterName)}</strong> has invited you to join the team on <strong>${escapeHtml(brand)}</strong> as a 
      <span style="background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 13px; color: #0f172a;">
        ${escapeHtml(params.role)}
      </span>.
    </p>
    <p style="margin: 0 0 10px 0; font-size: 15px; color: #334155;">
      Join now to collaborate on WhatsApp live chat, automated workflows, customer reservations, and dining orders.
    </p>
  `

  return renderEmailShell({
    brandName: brand,
    headerTitle: "You've Been Invited to Join the Team",
    badgeText: "Workspace Invitation",
    badgeVariant: "emerald",
    preheader: `${params.inviterName} invited you to join ${brand} on Fizmoh`,
    contentHtml,
    actionButton: {
      label: "Accept Invitation & Set Password",
      url: params.inviteUrl,
      variant: "emerald",
    },
    securityNotice: `This private invitation link is single-use and will expire in ${days} days. If you were not expecting this invitation, you can safely ignore this email.`,
  })
}

/**
 * 3. Booking Confirmation Email (Tours / Safari / Reservations)
 */
export function getBookingConfirmationEmailHtml(params: {
  orderNumber: string
  customerName: string
  tourName: string
  dateStr: string
  timeStr: string
  paxText: string
  meetingPoint?: string
  paymentMethod: string
  paymentRef?: string
  amountStr: string
  voucherCode?: string
  cancellationPolicy?: string
  brandName?: string
  supportContact?: { email?: string; phone?: string }
}): string {
  const brand = params.brandName || "Fizmoh"

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 16px; color: #0f172a;">
      Dear <strong>${escapeHtml(params.customerName)}</strong>,
    </p>
    <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155;">
      Your booking has been confirmed! We have reserved your spot and look forward to welcoming you.
    </p>

    <!-- DETAILS BOX -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin: 20px 0; overflow: hidden;">
      <tr>
        <td style="padding: 16px 20px; background-color: #0f172a; color: #ffffff;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="font-size: 16px; font-weight: 700; color: #ffffff;">
                ${escapeHtml(params.tourName)}
              </td>
              <td align="right" style="font-family: monospace; font-size: 13px; font-weight: 700; color: #38bdf8;">
                ${escapeHtml(params.orderNumber)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px;">
          <table border="0" cellpadding="6" cellspacing="0" width="100%" style="font-size: 14px; color: #475569;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="color: #64748b; width: 35%;">📅 Date:</td>
              <td style="font-weight: 600; color: #0f172a;">${escapeHtml(params.dateStr)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="color: #64748b;">⏰ Time:</td>
              <td style="font-weight: 600; color: #0f172a;">${escapeHtml(params.timeStr)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="color: #64748b;">👥 Guests:</td>
              <td style="font-weight: 600; color: #0f172a;">${escapeHtml(params.paxText)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="color: #64748b;">📍 Meeting Point:</td>
              <td style="font-weight: 600; color: #0f172a;">${escapeHtml(params.meetingPoint || "TBA / See Voucher")}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="color: #64748b;">💳 Payment:</td>
              <td style="font-weight: 600; color: #0f172a;">${escapeHtml(params.paymentMethod)} ${params.paymentRef ? `(${escapeHtml(params.paymentRef)})` : ""}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-size: 15px; font-weight: 700;">💰 Total Paid:</td>
              <td style="font-size: 18px; font-weight: 800; color: #059669;">${escapeHtml(params.amountStr)}</td>
            </tr>
          </table>

          ${params.voucherCode ? `
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 12px 16px;">
            <tr>
              <td align="center">
                <span style="font-size: 12px; font-weight: 600; color: #065f46; text-transform: uppercase; letter-spacing: 0.5px;">Your Check-in Voucher Code</span><br/>
                <strong style="font-family: monospace; font-size: 20px; font-weight: 800; color: #047857; letter-spacing: 2px;">${escapeHtml(params.voucherCode)}</strong>
              </td>
            </tr>
          </table>
          ` : ""}
        </td>
      </tr>
    </table>

    <!-- CANCELLATION POLICY -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px 16px; margin: 16px 0;">
      <tr>
        <td style="font-size: 13px; line-height: 20px; color: #92400e;">
          <strong style="color: #78350f;">📋 Cancellation & Modification:</strong><br/>
          ${escapeHtml(params.cancellationPolicy || "Free cancellation up to 24 hours prior to scheduled departure.")}
        </td>
      </tr>
    </table>

    <p style="margin: 16px 0 0 0; font-size: 13px; color: #64748b;">
      Please arrive 15 minutes before your scheduled departure time and present your confirmation or voucher QR code upon arrival.
    </p>
  `

  return renderEmailShell({
    brandName: brand,
    headerTitle: "Booking Confirmed! 🎉",
    badgeText: `Order #${params.orderNumber}`,
    badgeVariant: "emerald",
    preheader: `Your booking for ${params.tourName} (${params.orderNumber}) is confirmed`,
    contentHtml,
    supportContact: params.supportContact,
    footerNote: "Thank you for choosing us! We hope you have an incredible experience.",
  })
}

/**
 * 4. Payment Verification Update / Failure Email
 */
export function getPaymentVerificationEmailHtml(params: {
  orderNumber: string
  customerName: string
  verified: boolean
  reason?: string
  contactText?: string
  brandName?: string
}): string {
  const brand = params.brandName || "Fizmoh"

  const contentHtml = params.verified
    ? `
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155;">
        Dear <strong>${escapeHtml(params.customerName)}</strong>,
      </p>
      <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155;">
        We are pleased to inform you that your payment for order <strong>#${escapeHtml(params.orderNumber)}</strong> has been successfully verified.
      </p>
    `
    : `
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155;">
        Dear <strong>${escapeHtml(params.customerName)}</strong>,
      </p>
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155;">
        Unfortunately, we could not verify your payment for order <strong>#${escapeHtml(params.orderNumber)}</strong>.
      </p>
      ${params.reason ? `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 14px 16px; margin: 16px 0;">
        <tr>
          <td style="font-size: 13px; line-height: 20px; color: #9f1239;">
            <strong>Verification Note / Reason:</strong><br/>
            ${escapeHtml(params.reason)}
          </td>
        </tr>
      </table>
      ` : ""}
      <p style="margin: 16px 0 0 0; font-size: 14px; color: #475569;">
        Please re-submit your payment receipt or ${escapeHtml(params.contactText || "contact our billing department for help.")}
      </p>
    `

  return renderEmailShell({
    brandName: brand,
    headerTitle: params.verified ? "Payment Verified" : "Payment Verification Issue",
    badgeText: params.verified ? "Payment Approved" : "Action Required",
    badgeVariant: params.verified ? "emerald" : "rose",
    preheader: `Payment update for Order #${params.orderNumber}`,
    contentHtml,
  })
}

/**
 * 5. Billing Alert / Subscription Notice Email
 */
export function getBillingAlertEmailHtml(params: {
  brandName?: string
  subject: string
  message: string
  actionUrl?: string
  warningLevel?: "info" | "warning" | "danger"
}): string {
  const brand = params.brandName || "Fizmoh"
  const variant = params.warningLevel === "danger" ? "rose" : params.warningLevel === "warning" ? "amber" : "blue"

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155;">
      Hello,
    </p>
    <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 24px; color: #334155;">
      ${escapeHtml(params.message)}
    </p>
  `

  return renderEmailShell({
    brandName: brand,
    headerTitle: params.subject,
    badgeText: "Billing Notification",
    badgeVariant: variant,
    preheader: params.message.slice(0, 100),
    contentHtml,
    actionButton: params.actionUrl
      ? {
          label: "View Billing & Invoices",
          url: params.actionUrl,
          variant: variant === "rose" ? "amber" : "primary",
        }
      : undefined,
    securityNotice: "Fizmoh will never ask for your card password or CVV via email. Always verify payment URLs begin with https://app.fizmoh.cloud.",
  })
}

/**
 * 6. Restaurant Order Guest Receipt Email
 */
export function getRestaurantReceiptEmailHtml(params: {
  orderNumber: string
  customerName?: string | null
  orderType: string
  tableNumber?: string | null
  roomNumber?: string | null
  items: Array<{
    name: string
    qty: number
    price: number
    variant?: string | null
    notes?: string | null
  }>
  subtotal: number
  taxAmount: number
  serviceCharge?: number
  tipAmount?: number
  totalAmount: number
  currency: string
  trackingUrl?: string | null
  brandName?: string
}): string {
  const brand = params.brandName || "Smart Restaurant"
  const location = params.orderType === "DINE_IN" && params.tableNumber
    ? `Table ${params.tableNumber}`
    : params.orderType === "ROOM_SERVICE" && params.roomNumber
    ? `Room ${params.roomNumber}`
    : params.orderType

  const itemsRows = params.items.map((item) => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 10px 0; font-size: 14px; color: #1e293b;">
        <strong>${escapeHtml(item.name)}</strong>
        ${item.variant ? `<br/><span style="font-size: 12px; color: #64748b;">${escapeHtml(item.variant)}</span>` : ""}
        ${item.notes ? `<br/><span style="font-size: 11px; color: #d97706; font-style: italic;">"${escapeHtml(item.notes)}"</span>` : ""}
      </td>
      <td align="center" style="padding: 10px 8px; font-size: 14px; font-weight: 600; color: #475569;">
        ${item.qty}x
      </td>
      <td align="right" style="padding: 10px 0; font-family: monospace; font-size: 14px; font-weight: 600; color: #0f172a;">
        ${params.currency} ${(item.price * item.qty).toFixed(2)}
      </td>
    </tr>
  `).join("")

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155;">
      Hello ${escapeHtml(params.customerName || "Valued Guest")},
    </p>
    <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155;">
      Thank you for your order! Here is your itemized receipt for order <strong>#${escapeHtml(params.orderNumber)}</strong> (${escapeHtml(location)}).
    </p>

    <!-- ITEMIZED RECEIPT TABLE -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin: 16px 0;">
      <thead>
        <tr style="border-bottom: 2px solid #e2e8f0;">
          <th align="left" style="padding-bottom: 8px; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Dish / Item</th>
          <th align="center" style="padding-bottom: 8px; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Qty</th>
          <th align="right" style="padding-bottom: 8px; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding-top: 14px; font-size: 13px; color: #64748b;">Subtotal:</td>
          <td align="right" style="padding-top: 14px; font-family: monospace; font-size: 13px; color: #475569;">${params.currency} ${params.subtotal.toFixed(2)}</td>
        </tr>
        ${params.taxAmount > 0 ? `
        <tr>
          <td colspan="2" style="padding-top: 4px; font-size: 13px; color: #64748b;">VAT / Tax:</td>
          <td align="right" style="padding-top: 4px; font-family: monospace; font-size: 13px; color: #475569;">${params.currency} ${params.taxAmount.toFixed(2)}</td>
        </tr>
        ` : ""}
        ${(params.serviceCharge || 0) > 0 ? `
        <tr>
          <td colspan="2" style="padding-top: 4px; font-size: 13px; color: #64748b;">Service Charge:</td>
          <td align="right" style="padding-top: 4px; font-family: monospace; font-size: 13px; color: #475569;">${params.currency} ${(params.serviceCharge || 0).toFixed(2)}</td>
        </tr>
        ` : ""}
        ${(params.tipAmount || 0) > 0 ? `
        <tr>
          <td colspan="2" style="padding-top: 4px; font-size: 13px; color: #64748b;">Tip:</td>
          <td align="right" style="padding-top: 4px; font-family: monospace; font-size: 13px; color: #475569;">${params.currency} ${(params.tipAmount || 0).toFixed(2)}</td>
        </tr>
        ` : ""}
        <tr>
          <td colspan="2" style="padding-top: 12px; font-size: 16px; font-weight: 800; color: #0f172a; border-top: 1px dashed #cbd5e1;">Grand Total:</td>
          <td align="right" style="padding-top: 12px; font-family: monospace; font-size: 18px; font-weight: 800; color: #059669; border-top: 1px dashed #cbd5e1;">${params.currency} ${params.totalAmount.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
  `

  return renderEmailShell({
    brandName: brand,
    headerTitle: "Dining Receipt",
    badgeText: `Order #${params.orderNumber}`,
    badgeVariant: "emerald",
    preheader: `Receipt for Order #${params.orderNumber} at ${brand}`,
    contentHtml,
    actionButton: params.trackingUrl
      ? {
          label: "Track Live Kitchen Status",
          url: params.trackingUrl,
          variant: "emerald",
        }
      : undefined,
    footerNote: "Bon appétit! Thank you for dining with us.",
  })
}
