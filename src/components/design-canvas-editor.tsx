"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  Loader2, Type, Square, Circle as CircleIcon, ImagePlus, Trash2, Copy,
  Save, Download, ArrowLeft, Sparkles, Lock, Bold, AlignLeft, AlignCenter, AlignRight,
} from "lucide-react"

type PrintSize = "a4" | "a5" | "table-tent" | "business-card" | "sticker"

const PAPER_SIZES: Record<PrintSize, { w: number; h: number; label: string }> = {
  "a4": { w: 595, h: 842, label: "A4" },
  "a5": { w: 420, h: 595, label: "A5" },
  "table-tent": { w: 288, h: 432, label: "Table Tent (4x6in)" },
  "business-card": { w: 252, h: 144, label: "Business Card" },
  "sticker": { w: 216, h: 216, label: "Sticker (3x3in)" },
}

interface LayerBase { id: string; x: number; y: number; w: number; h: number; z: number }
interface TextLayer extends LayerBase { type: "text"; text: string; fontSizePct: number; color: string; weight: "normal" | "bold"; align: "left" | "center" | "right" }
interface ShapeLayer extends LayerBase { type: "shape"; shapeKind: "rect" | "roundedRect" | "circle"; fill: string; opacity: number }
interface ImageLayer extends LayerBase { type: "image"; src: string; fit?: "contain" | "cover" }
interface QrLayer extends LayerBase { type: "qr" }
type Layer = TextLayer | ShapeLayer | ImageLayer | QrLayer

interface CanvasDesign { paperSize: PrintSize; layers: Layer[] }

const MIN_QR_PCT = 15
let nextId = 1
const newId = (prefix: string) => `${prefix}-${Date.now()}-${nextId++}`

const DEFAULT_DESIGN: CanvasDesign = {
  paperSize: "table-tent",
  layers: [
    { id: "headline", type: "text", x: 10, y: 6, w: 80, h: 10, z: 1, text: "Loved your experience?", fontSizePct: 7, color: "#0b671c", weight: "bold", align: "center" },
    { id: "subtitle", type: "text", x: 10, y: 17, w: 80, h: 8, z: 1, text: "Scan to share your feedback", fontSizePct: 3.6, color: "#78716c", weight: "normal", align: "center" },
    { id: "qr", type: "qr", x: 30, y: 30, w: 40, h: 28, z: 2 },
    { id: "cta", type: "text", x: 10, y: 62, w: 80, h: 8, z: 1, text: "Review Us on Google", fontSizePct: 4.5, color: "#1c1917", weight: "bold", align: "center" },
  ],
}

const CANVAS_PX = 480 // the editor's own on-screen canvas width, in CSS px, independent of paper size

export default function DesignCanvasEditor({ qrCodeId }: { qrCodeId: string }) {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [label, setLabel] = useState("")
  const [design, setDesign] = useState<CanvasDesign>(DEFAULT_DESIGN)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [suggesting, setSuggesting] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/staff/me").then(r => setAuthed(r.ok)).catch(() => setAuthed(false))
  }, [])

  useEffect(() => {
    if (!authed) return
    fetch(`/api/qr-codes/${qrCodeId}/canvas-design`).then(async r => {
      const data = await r.json()
      if (r.ok) { setDesign(data.design); setLabel(data.label) }
      else toast.error(data.error || "Could not load this design")
    }).catch(() => toast.error("Could not load this design"))
      .finally(() => setLoading(false))
  }, [authed, qrCodeId])

  const dims = PAPER_SIZES[design.paperSize]
  const canvasH = CANVAS_PX * (dims.h / dims.w)

  const updateLayer = useCallback((id: string, patch: Partial<Layer>) => {
    setDesign(d => ({ ...d, layers: d.layers.map(l => l.id === id ? { ...l, ...patch } as Layer : l) }))
  }, [])

  const selected = design.layers.find(l => l.id === selectedId) || null

  // ── Drag & resize — plain pointer events, percentage coordinates ──────────
  const dragState = useRef<{ id: string; mode: "move" | "resize"; startX: number; startY: number; layer: Layer } | null>(null)

  function beginDrag(e: React.PointerEvent, layer: Layer, mode: "move" | "resize") {
    if (layer.type === "qr" && mode === "resize") { /* QR resize still allowed, just floor-limited on release */ }
    e.stopPropagation()
    setSelectedId(layer.id)
    dragState.current = { id: layer.id, mode, startX: e.clientX, startY: e.clientY, layer: { ...layer } }
    window.addEventListener("pointermove", onDragMove)
    window.addEventListener("pointerup", onDragEnd)
  }

  const onDragMove = useCallback((e: PointerEvent) => {
    const state = dragState.current
    const canvas = canvasRef.current
    if (!state || !canvas) return
    const rect = canvas.getBoundingClientRect()
    const dxPct = ((e.clientX - state.startX) / rect.width) * 100
    const dyPct = ((e.clientY - state.startY) / rect.height) * 100

    if (state.mode === "move") {
      const x = Math.min(100 - state.layer.w, Math.max(0, state.layer.x + dxPct))
      const y = Math.min(100 - state.layer.h, Math.max(0, state.layer.y + dyPct))
      updateLayer(state.id, { x, y })
    } else {
      let w = Math.max(4, Math.min(100 - state.layer.x, state.layer.w + dxPct))
      let h = Math.max(4, Math.min(100 - state.layer.y, state.layer.h + dyPct))
      if (state.layer.type === "qr") {
        // Keep it square, and never let it shrink past the printable minimum.
        const side = Math.max(MIN_QR_PCT, Math.min(w, h))
        w = side; h = side
      }
      updateLayer(state.id, { w, h })
    }
  }, [updateLayer])

  const onDragEnd = useCallback(() => {
    dragState.current = null
    window.removeEventListener("pointermove", onDragMove)
    window.removeEventListener("pointerup", onDragEnd)
  }, [onDragMove])

  // ── Toolbox actions ────────────────────────────────────────────────────────
  function addText() {
    const id = newId("text")
    setDesign(d => ({ ...d, layers: [...d.layers, { id, type: "text", x: 20, y: 40, w: 60, h: 10, z: (Math.max(0, ...d.layers.map(l => l.z)) + 1), text: "New text", fontSizePct: 5, color: "#1c1917", weight: "normal", align: "center" }] }))
    setSelectedId(id)
  }

  function addShape(shapeKind: ShapeLayer["shapeKind"]) {
    const id = newId("shape")
    setDesign(d => ({ ...d, layers: [...d.layers, { id, type: "shape", x: 15, y: 15, w: 30, h: 20, z: (Math.max(0, ...d.layers.map(l => l.z)) + 1), shapeKind, fill: "#d1fae5", opacity: 1 }] }))
    setSelectedId(id)
  }

  function addImage(file: File) {
    if (!["image/png", "image/jpeg"].includes(file.type)) { toast.error("Image must be PNG or JPEG"); return }
    if (file.size > 4 * 1024 * 1024) { toast.error("Image is too large — 4MB max"); return }
    const reader = new FileReader()
    reader.onload = () => {
      const id = newId("image")
      setDesign(d => ({ ...d, layers: [...d.layers, { id, type: "image", x: 30, y: 5, w: 25, h: 12, z: (Math.max(0, ...d.layers.map(l => l.z)) + 1), src: String(reader.result) }] }))
      setSelectedId(id)
    }
    reader.readAsDataURL(file)
  }

  function deleteSelected() {
    if (!selected || selected.type === "qr") return
    setDesign(d => ({ ...d, layers: d.layers.filter(l => l.id !== selected.id) }))
    setSelectedId(null)
  }

  function duplicateSelected() {
    if (!selected || selected.type === "qr") return
    const id = newId(selected.type)
    setDesign(d => ({ ...d, layers: [...d.layers, { ...selected, id, x: Math.min(90, selected.x + 4), y: Math.min(90, selected.y + 4), z: Math.max(0, ...d.layers.map(l => l.z)) + 1 }] }))
    setSelectedId(id)
  }

  /**
   * One "Generate" click, two independent AI calls: a full background image
   * (OpenAI images) and the headline/subtitle/CTA/accent copy (the chat
   * provider). Either can fail without the other — a workspace with only a
   * chat key configured still gets real copy, just no generated background,
   * told plainly rather than silently skipped.
   */
  async function generateFullDesign() {
    if (!prompt.trim()) return
    setSuggesting(true)
    const [imageResult, copyResult] = await Promise.allSettled([
      fetch(`/api/qr-codes/${qrCodeId}/design-image`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, paperSize: design.paperSize }),
      }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Image generation failed"); return d.dataUrl as string }),
      fetch(`/api/qr-codes/${qrCodeId}/design-copy`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }),
      }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Could not generate design copy"); return d }),
    ])
    setSuggesting(false)

    setDesign(d => {
      let layers = d.layers.filter(l => !["ai-bg", "ai-panel-top", "ai-panel-bottom"].includes(l.id))

      if (imageResult.status === "fulfilled") {
        const headline = layers.find(l => l.id === "headline")
        const subtitle = layers.find(l => l.id === "subtitle")
        const cta = layers.find(l => l.id === "cta")
        const topBox = headline && subtitle
          ? { x: Math.min(headline.x, subtitle.x) - 5, y: headline.y - 3, w: Math.max(headline.w, subtitle.w) + 10, h: (subtitle.y + subtitle.h) - headline.y + 6 }
          : { x: 5, y: 3, w: 90, h: 24 }
        const bottomBox = cta ? { x: cta.x - 8, y: cta.y - 4, w: cta.w + 16, h: cta.h + 8 } : { x: 10, y: 58, w: 80, h: 14 }

        layers = [
          { id: "ai-bg", type: "image", x: 0, y: 0, w: 100, h: 100, z: 0, src: imageResult.value, fit: "cover" },
          { id: "ai-panel-top", type: "shape", shapeKind: "roundedRect", fill: "#ffffff", opacity: 0.88, z: 0.5, ...topBox },
          { id: "ai-panel-bottom", type: "shape", shapeKind: "roundedRect", fill: "#ffffff", opacity: 0.88, z: 0.5, ...bottomBox },
          ...layers,
        ]
      }

      if (copyResult.status === "fulfilled") {
        const data = copyResult.value
        layers = layers.map(l => {
          if (l.id === "headline" && l.type === "text") return { ...l, text: data.headline, color: data.accentColor || l.color }
          if (l.id === "subtitle" && l.type === "text") return { ...l, text: data.subtitle }
          if (l.id === "cta" && l.type === "text") return { ...l, text: data.cta }
          return l
        })
      }

      return { ...d, layers }
    })

    if (imageResult.status === "rejected") toast.error(imageResult.reason instanceof Error ? imageResult.reason.message : "Background image failed")
    if (copyResult.status === "rejected") toast.error(copyResult.reason instanceof Error ? copyResult.reason.message : "Design copy failed")
    if (imageResult.status === "fulfilled" || copyResult.status === "fulfilled") toast.success("AI design applied — review before printing")
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/qr-codes/${qrCodeId}/canvas-design`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ design }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not save")
      toast.success("Design saved")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save")
    } finally {
      setSaving(false)
    }
  }

  async function exportPdf() {
    setExporting(true)
    try {
      const res = await fetch(`/api/qr-codes/${qrCodeId}/canvas-render`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ design }),
      })
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || "Could not export") }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank", "noopener")
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not export")
    } finally {
      setExporting(false)
    }
  }

  if (authed === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center space-y-3">
          <p className="text-sm text-stone-600">Sign in to design this QR code.</p>
          <Link href="/admin"><Button className="bg-emerald-600 hover:bg-emerald-700">Sign in</Button></Link>
        </div>
      </div>
    )
  }
  if (authed === null || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>
  }

  const sortedForRender = [...design.layers].sort((a, b) => a.z - b.z)

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      <div className="h-14 shrink-0 bg-white border-b border-stone-200 flex items-center justify-between px-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/digital-qr"><Button size="sm" variant="ghost"><ArrowLeft className="h-4 w-4 mr-1.5" />Digital QR Addons</Button></Link>
          <span className="text-sm font-semibold text-stone-900 truncate">Design — {label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={design.paperSize}
            onChange={e => setDesign(d => ({ ...d, paperSize: e.target.value as PrintSize }))}
            className="h-9 px-2 text-sm rounded-lg border border-stone-200 bg-white"
          >
            {Object.entries(PAPER_SIZES).map(([key, d]) => <option key={key} value={key}>{d.label}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}Save
          </Button>
          <Button size="sm" onClick={exportPdf} disabled={exporting} className="bg-emerald-600 hover:bg-emerald-700">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Download className="h-4 w-4 mr-1.5" />}Export PDF
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: toolbox */}
        <div className="w-56 shrink-0 bg-white border-r border-stone-200 p-3 space-y-4 overflow-y-auto">
          <div>
            <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-2">Add</p>
            <div className="grid grid-cols-2 gap-1.5">
              <Button size="sm" variant="outline" onClick={addText}><Type className="h-3.5 w-3.5 mr-1" />Text</Button>
              <Button size="sm" variant="outline" onClick={() => addShape("rect")}><Square className="h-3.5 w-3.5 mr-1" />Rect</Button>
              <Button size="sm" variant="outline" onClick={() => addShape("roundedRect")}><Square className="h-3.5 w-3.5 mr-1 rounded" />Rounded</Button>
              <Button size="sm" variant="outline" onClick={() => addShape("circle")}><CircleIcon className="h-3.5 w-3.5 mr-1" />Circle</Button>
            </div>
            <label className="mt-1.5 flex items-center justify-center gap-1.5 text-xs border border-dashed border-stone-300 rounded-lg px-3 py-2 cursor-pointer hover:border-emerald-400">
              <ImagePlus className="h-3.5 w-3.5" />Upload image / logo
              <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) addImage(f) }} />
            </label>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-2">AI design</p>
            <div className="space-y-1.5">
              <Input placeholder="e.g. premium restaurant QR stand" value={prompt} onChange={e => setPrompt(e.target.value)} className="text-xs" />
              <Button size="sm" variant="outline" onClick={generateFullDesign} disabled={suggesting || !prompt.trim()} className="w-full">
                {suggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}Generate
              </Button>
            </div>
            <p className="text-[10px] text-stone-400 mt-1.5">Generates a full background image plus headline, subtitle, CTA and accent colour. Image generation needs an OpenAI key configured. Review before printing.</p>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-2">Layers</p>
            <div className="space-y-1">
              {sortedForRender.slice().reverse().map(l => (
                <button
                  key={l.id}
                  onClick={() => setSelectedId(l.id)}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded-lg border flex items-center gap-1.5 ${selectedId === l.id ? "border-emerald-400 bg-emerald-50" : "border-transparent hover:bg-stone-50"}`}
                >
                  {l.type === "qr" && <Lock className="h-3 w-3 text-stone-400 shrink-0" />}
                  <span className="truncate">{l.type === "text" ? l.text || "Text" : l.type === "qr" ? "QR code" : l.type === "image" ? "Image" : `Shape · ${l.shapeKind}`}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center: canvas */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-8">
          <div
            ref={canvasRef}
            onPointerDown={() => setSelectedId(null)}
            className="relative bg-white shadow-lg border border-stone-200"
            style={{ width: CANVAS_PX, height: canvasH }}
          >
            {sortedForRender.map(layer => {
              const isQr = layer.type === "qr"
              const style: React.CSSProperties = {
                position: "absolute",
                left: `${layer.x}%`, top: `${layer.y}%`, width: `${layer.w}%`, height: `${layer.h}%`,
                zIndex: isQr ? 9999 : layer.z,
                outline: selectedId === layer.id ? "2px solid #10b981" : "none",
                cursor: "move",
              }
              return (
                <div key={layer.id} style={style} onPointerDown={e => beginDrag(e, layer, "move")}>
                  {layer.type === "text" && (
                    <div
                      className="w-full h-full flex items-center pointer-events-none"
                      style={{
                        justifyContent: layer.align === "left" ? "flex-start" : layer.align === "right" ? "flex-end" : "center",
                        fontSize: (layer.fontSizePct / 100) * CANVAS_PX,
                        color: layer.color,
                        fontWeight: layer.weight === "bold" ? 700 : 400,
                        textAlign: layer.align,
                        lineHeight: 1.2,
                      }}
                    >
                      {layer.text}
                    </div>
                  )}
                  {layer.type === "shape" && (
                    <div
                      className="w-full h-full pointer-events-none"
                      style={{
                        background: layer.fill, opacity: layer.opacity,
                        borderRadius: layer.shapeKind === "circle" ? "50%" : layer.shapeKind === "roundedRect" ? 12 : 0,
                      }}
                    />
                  )}
                  {layer.type === "image" && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={layer.src} alt="" className={`w-full h-full pointer-events-none ${layer.fit === "cover" ? "object-cover" : "object-contain"}`} />
                  )}
                  {layer.type === "qr" && (
                    <div className="w-full h-full bg-white border border-stone-200 flex items-center justify-center pointer-events-none">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/qr-codes/${qrCodeId}/image`} alt="QR code" className="w-full h-full p-1" />
                    </div>
                  )}
                  <div
                    onPointerDown={e => beginDrag(e, layer, "resize")}
                    className="absolute -right-1.5 -bottom-1.5 h-3 w-3 rounded-full bg-emerald-500 border border-white cursor-se-resize"
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: properties */}
        <div className="w-64 shrink-0 bg-white border-l border-stone-200 p-3 space-y-3 overflow-y-auto">
          {!selected ? (
            <p className="text-xs text-stone-400 pt-6 text-center">Select a layer to edit it.</p>
          ) : selected.type === "qr" ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-stone-700 flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" />QR code</p>
              <p className="text-[11px] text-stone-500">
                Position and resize it freely — it always renders on top of everything else and stays a perfect square at full error correction, no matter what you place near it. It cannot be deleted.
              </p>
            </div>
          ) : (
            <>
              {selected.type === "text" && (
                <>
                  <p className="text-xs font-semibold text-stone-700">Text</p>
                  <textarea
                    value={selected.text}
                    onChange={e => updateLayer(selected.id, { text: e.target.value })}
                    className="w-full text-sm border border-stone-200 rounded-lg p-2 resize-none"
                    rows={2}
                  />
                  <div className="flex items-center gap-2">
                    <input type="color" value={selected.color} onChange={e => updateLayer(selected.id, { color: e.target.value })} className="h-8 w-8 rounded border border-stone-200 cursor-pointer" />
                    <input
                      type="range" min={2} max={12} step={0.5} value={selected.fontSizePct}
                      onChange={e => updateLayer(selected.id, { fontSizePct: Number(e.target.value) })}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant={selected.weight === "bold" ? "default" : "outline"} onClick={() => updateLayer(selected.id, { weight: selected.weight === "bold" ? "normal" : "bold" })}><Bold className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant={selected.align === "left" ? "default" : "outline"} onClick={() => updateLayer(selected.id, { align: "left" })}><AlignLeft className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant={selected.align === "center" ? "default" : "outline"} onClick={() => updateLayer(selected.id, { align: "center" })}><AlignCenter className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant={selected.align === "right" ? "default" : "outline"} onClick={() => updateLayer(selected.id, { align: "right" })}><AlignRight className="h-3.5 w-3.5" /></Button>
                  </div>
                </>
              )}
              {selected.type === "shape" && (
                <>
                  <p className="text-xs font-semibold text-stone-700">Shape</p>
                  <select value={selected.shapeKind} onChange={e => updateLayer(selected.id, { shapeKind: e.target.value as ShapeLayer["shapeKind"] })} className="w-full h-8 text-xs px-2 rounded border border-stone-200">
                    <option value="rect">Rectangle</option>
                    <option value="roundedRect">Rounded rectangle</option>
                    <option value="circle">Circle</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <input type="color" value={selected.fill} onChange={e => updateLayer(selected.id, { fill: e.target.value })} className="h-8 w-8 rounded border border-stone-200 cursor-pointer" />
                    <input type="range" min={0.1} max={1} step={0.05} value={selected.opacity} onChange={e => updateLayer(selected.id, { opacity: Number(e.target.value) })} className="flex-1" />
                  </div>
                </>
              )}
              {selected.type === "image" && <p className="text-xs text-stone-500">Drag to move, use the corner handle to resize.</p>}

              <div className="flex gap-1.5 pt-2 border-t border-stone-100">
                <Button size="sm" variant="outline" onClick={duplicateSelected}><Copy className="h-3.5 w-3.5 mr-1" />Duplicate</Button>
                <Button size="sm" variant="outline" onClick={deleteSelected} className="text-red-600 hover:text-red-700"><Trash2 className="h-3.5 w-3.5 mr-1" />Delete</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
