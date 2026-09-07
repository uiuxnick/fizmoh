/**
 * Free-form print design — the full-page canvas editor's data model and PDF
 * renderer.
 *
 * Every coordinate is a percentage of the canvas (0-100), not a pixel, so the
 * same design renders correctly whichever paper size is picked and whichever
 * screen size the editor is open on.
 *
 * The one rule every layout obeys regardless of what the user arranges: the
 * QR layer is always drawn last, on top of everything else, at full error
 * correction. A user can drag a shape or a logo so it visually sits behind
 * where the QR is — but at render time the QR always wins that spot, so a
 * design that looks like it buries the code under a shape still prints a
 * fully scannable one. This is enforced here, not left to the editor's
 * z-order, because a codebase-wide rule this important cannot depend on a
 * UI interaction never going wrong.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"
import QRCode from "qrcode"

export type PrintSize = "a4" | "a5" | "table-tent" | "business-card" | "sticker"

export const PAPER_SIZES: Record<PrintSize, { width: number; height: number; label: string }> = {
  "a4": { width: 595, height: 842, label: "A4" },
  "a5": { width: 420, height: 595, label: "A5" },
  "table-tent": { width: 288, height: 432, label: "Table Tent (4x6in)" },
  "business-card": { width: 252, height: 144, label: "Business Card" },
  "sticker": { width: 216, height: 216, label: "Sticker (3x3in)" },
}

interface LayerBase { id: string; x: number; y: number; w: number; h: number; z: number }

export interface TextLayer extends LayerBase {
  type: "text"
  text: string
  fontSizePct: number // font size as a percentage of canvas width
  color: string
  weight: "normal" | "bold"
  align: "left" | "center" | "right"
}

export interface ShapeLayer extends LayerBase {
  type: "shape"
  shapeKind: "rect" | "roundedRect" | "circle"
  fill: string
  opacity: number // 0-1
}

export interface ImageLayer extends LayerBase {
  type: "image"
  src: string // data URL, png or jpeg
  /** "cover" is meant for a full-bleed AI-generated background — it can crop, never distort. Defaults to "contain" (a logo must never be cropped). */
  fit?: "contain" | "cover"
}

export interface QrLayer extends LayerBase {
  type: "qr"
}

export type Layer = TextLayer | ShapeLayer | ImageLayer | QrLayer

export interface CanvasDesign {
  paperSize: PrintSize
  layers: Layer[]
}

const MIN_QR_PCT = 15 // never let the QR shrink below this share of the canvas's shorter side

function hexColor(hex: string) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex || "")
  const n = match ? parseInt(match[1], 16) : 0x111111
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

function safe(text: string): string {
  return text
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/…/g, "...")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "").trim()
}

function wrap(value: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = safe(value).split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ""
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) { lines.push(line); line = word }
    else line = next
  }
  if (line) lines.push(line)
  return lines.length ? lines : [""]
}

function drawShape(page: PDFPage, layer: ShapeLayer, px: number, py: number, pw: number, ph: number) {
  const color = hexColor(layer.fill)
  const opacity = Math.min(1, Math.max(0, layer.opacity ?? 1))
  if (layer.shapeKind === "circle") {
    const r = Math.min(pw, ph) / 2
    page.drawEllipse({ x: px + pw / 2, y: py + ph / 2, xScale: r, yScale: r, color, opacity })
  } else {
    // pdf-lib's drawRectangle has no corner-radius option — "roundedRect" reads
    // the same as "rect" here. The distinction still shows in the editor's own
    // CSS preview, which is where a design is actually composed.
    page.drawRectangle({ x: px, y: py, width: pw, height: ph, color, opacity })
  }
}

async function drawText(pdf: PDFDocument, page: PDFPage, layer: TextLayer, px: number, py: number, pw: number, ph: number, pageWidth: number) {
  const font = await pdf.embedFont(layer.weight === "bold" ? StandardFonts.HelveticaBold : StandardFonts.Helvetica)
  const size = Math.max(6, (layer.fontSizePct / 100) * pageWidth)
  const lines = wrap(layer.text, font, size, pw)
  const lineHeight = size * 1.25
  // Vertically centered within the box, top-down.
  let y = py + ph / 2 + (lines.length * lineHeight) / 2 - lineHeight * 0.8
  for (const line of lines) {
    const w = font.widthOfTextAtSize(line, size)
    const x = layer.align === "left" ? px : layer.align === "right" ? px + pw - w : px + (pw - w) / 2
    page.drawText(line, { x, y, size, font, color: hexColor(layer.color) })
    y -= lineHeight
  }
}

async function drawImage(pdf: PDFDocument, page: PDFPage, layer: ImageLayer, px: number, py: number, pw: number, ph: number) {
  const match = /^data:image\/(png|jpe?g);base64,([a-z0-9+/=]+)$/i.exec(layer.src || "")
  if (!match) return
  const bytes = Buffer.from(match[2], "base64")
  try {
    const image = match[1].toLowerCase().startsWith("jpe") ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes)
    // "cover" (a full-bleed AI background) can crop to fill the box — any
    // overflow past the page edge is clipped by the page itself, since a
    // background layer's box is the whole page. "contain" (a logo) never
    // crops; a logo cut off at the edges looks broken, so it letterboxes
    // instead.
    const scale = layer.fit === "cover"
      ? Math.max(pw / image.width, ph / image.height)
      : Math.min(pw / image.width, ph / image.height)
    const w = image.width * scale
    const h = image.height * scale
    page.drawImage(image, { x: px + (pw - w) / 2, y: py + (ph - h) / 2, width: w, height: h })
  } catch {
    // A corrupt upload should not block the rest of the design from printing.
  }
}

export interface RenderOptions {
  design: CanvasDesign
  reviewUrl: string
}

/** Renders one saved/submitted canvas design to a print-ready PDF. */
export async function renderCanvasDesignPDF({ design, reviewUrl }: RenderOptions): Promise<Uint8Array> {
  const dims = PAPER_SIZES[design.paperSize] || PAPER_SIZES["table-tent"]
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([dims.width, dims.height])
  const { width, height } = page.getSize()

  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) })

  const toPoints = (l: LayerBase) => ({
    px: (l.x / 100) * width,
    // Canvas y grows downward; PDF y grows upward.
    py: height - (l.y / 100) * height - (l.h / 100) * height,
    pw: (l.w / 100) * width,
    ph: (l.h / 100) * height,
  })

  const qrLayer = design.layers.find((l): l is QrLayer => l.type === "qr")
  const otherLayers = design.layers.filter(l => l.type !== "qr").sort((a, b) => a.z - b.z)

  for (const layer of otherLayers) {
    const { px, py, pw, ph } = toPoints(layer)
    if (layer.type === "shape") drawShape(page, layer, px, py, pw, ph)
    else if (layer.type === "text") await drawText(pdf, page, layer, px, py, pw, ph, width)
    else if (layer.type === "image") await drawImage(pdf, page, layer, px, py, pw, ph)
  }

  // The QR: always last, always square, always at full error correction —
  // regardless of what any other layer's z-order or position claims.
  const base = qrLayer || { id: "qr", x: 40, y: 60, w: 20, h: 20, z: 0, type: "qr" as const }
  const minSide = Math.max(base.w, base.h, MIN_QR_PCT)
  const { px, py, pw, ph } = toPoints({ ...base, w: minSide, h: minSide })
  const side = Math.min(pw, ph)
  const qrPng = await QRCode.toBuffer(reviewUrl, { errorCorrectionLevel: "H", margin: 2, width: 800 })
  const qrImage = await pdf.embedPng(qrPng)
  page.drawImage(qrImage, { x: px + (pw - side) / 2, y: py + (ph - side) / 2, width: side, height: side })

  return pdf.save()
}

/** A sane starting layout for a QR code that has never been customised. */
export function defaultCanvasDesign(paperSize: PrintSize = "table-tent"): CanvasDesign {
  return {
    paperSize,
    layers: [
      { id: "headline", type: "text", x: 10, y: 6, w: 80, h: 10, z: 1, text: "Loved your experience?", fontSizePct: 7, color: "#0b671c", weight: "bold", align: "center" },
      { id: "subtitle", type: "text", x: 10, y: 17, w: 80, h: 8, z: 1, text: "Scan to share your feedback", fontSizePct: 3.6, color: "#78716c", weight: "normal", align: "center" },
      { id: "qr", type: "qr", x: 30, y: 30, w: 40, h: 28, z: 2 },
      { id: "cta", type: "text", x: 10, y: 62, w: 80, h: 8, z: 1, text: "Review Us on Google", fontSizePct: 4.5, color: "#1c1917", weight: "bold", align: "center" },
    ],
  }
}
