import QRCode from "qrcode"

export interface QrOptions {
  darkColor?: string
  lightColor?: string
  width?: number
  margin?: number
}

/**
 * Generates a PNG data URL (image/png;base64,...) for a given URL.
 */
export async function generateQrDataUrl(
  content: string,
  options: QrOptions = {},
): Promise<string> {
  const {
    darkColor = "#0f172a",
    lightColor = "#ffffff",
    width = 512,
    margin = 2,
  } = options

  return QRCode.toDataURL(content, {
    width,
    margin,
    color: {
      dark: darkColor,
      light: lightColor,
    },
    errorCorrectionLevel: "H",
  })
}

/**
 * Generates a raw PNG Buffer for streaming via API route.
 */
export async function generateQrPngBuffer(
  content: string,
  options: QrOptions = {},
): Promise<Buffer> {
  const {
    darkColor = "#0f172a",
    lightColor = "#ffffff",
    width = 600,
    margin = 2,
  } = options

  return QRCode.toBuffer(content, {
    width,
    margin,
    color: {
      dark: darkColor,
      light: lightColor,
    },
    errorCorrectionLevel: "H",
  })
}

/**
 * Generates an SVG string representation of the QR code.
 */
export async function generateQrSvg(
  content: string,
  options: QrOptions = {},
): Promise<string> {
  const {
    darkColor = "#0f172a",
    lightColor = "#ffffff",
    width = 512,
    margin = 2,
  } = options

  return QRCode.toString(content, {
    type: "svg",
    width,
    margin,
    color: {
      dark: darkColor,
      light: lightColor,
    },
    errorCorrectionLevel: "H",
  })
}
