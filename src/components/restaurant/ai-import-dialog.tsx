"use client"

import React, { useState } from "react"
import {
  Sparkles,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  FileSpreadsheet,
  Download,
  ClipboardPaste,
  ArrowRight,
  Info,
} from "lucide-react"

interface ExtractedItem {
  id?: string | null
  name: string
  nameAr?: string | null
  description?: string | null
  descriptionAr?: string | null
  price: number
  salePrice?: number | null
  allergens?: string | null
  confidence: number
  confidenceNote?: string | null
  variants?: Array<{ name: string; price: number }>
  modifiers?: Array<{ name: string; options: Array<{ name: string; price: number }> }>
}

interface ExtractedCategory {
  id?: string | null
  name: string
  nameAr?: string | null
  description?: string | null
  items: ExtractedItem[]
}

interface AiImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: () => void
  branchId?: string | null
}

const SAMPLE_CSV = `Category,Item Name,Arabic Name,Price,Description,Dietary,Allergens
Appetizers,Traditional Hummus,حمص تقليدي,2.500,Creamy chickpea dip with tahini and olive oil,Vegetarian,Sesame
Appetizers,Moutabal Eggplant,متبل باذنجان,2.800,Smoked roasted eggplant with pomegranate molasses,Vegetarian,Dairy
Main Courses,Mixed Grill Platter,مشاوي مشكلة,6.500,Tender shish tawook lamb tikka and beef kebab,Non-Veg,None
Main Courses,Omani Shuwa Rice,شواء عماني مع الأرز,7.200,Slow-cooked marinated spiced lamb served with scented rice,Non-Veg,Nuts
Beverages,Fresh Lemon Mint,ليمون بالنعناع طازج,1.800,Refreshing crushed ice blended with mint leaves,Vegan,None
Beverages,Karak Spiced Tea,شاي كرك,0.800,Rich black tea boiled with evaporated milk and cardamom,Vegetarian,Dairy`

export default function AiImportDialog({
  isOpen,
  onClose,
  onImportComplete,
  branchId,
}: AiImportDialogProps) {
  const [activeTab, setActiveTab] = useState<"AI" | "DIRECT">("AI")
  const [file, setFile] = useState<File | null>(null)
  const [csvText, setCsvText] = useState("")
  const [isExtracting, setIsExtracting] = useState(false)
  const [importId, setImportId] = useState<string | null>(null)
  const [categories, setCategories] = useState<ExtractedCategory[]>([])
  const [averageConfidence, setAverageConfidence] = useState<number>(0.9)
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState("")
  const [isApproving, setIsApproving] = useState(false)
  const [step, setStep] = useState<"INPUT" | "REVIEW">("INPUT")

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      if (selected.size > 35 * 1024 * 1024) {
        setError(`"${selected.name}" is ${(selected.size / 1024 / 1024).toFixed(1)} MB. The maximum file size is 35 MB. Please compress your PDF or upload images of menu pages.`)
        setFile(null)
        return
      }
      setFile(selected)
      setError("")
    }
  }

  const handleDirectCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        setCsvText(text || "")
        handleParseSpreadsheet(text || "")
      }
      reader.readAsText(selected)
    }
  }

  const handleDownloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "menu_import_template.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleParseSpreadsheet = async (contentToParse?: string) => {
    const text = contentToParse ?? csvText
    if (!text.trim()) {
      setError("Please paste spreadsheet rows or upload a CSV file.")
      return
    }

    setIsExtracting(true)
    setError("")

    try {
      const res = await fetch("/api/restaurant/import/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          csvText: text,
          parseOnly: true,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to parse spreadsheet.")

      setImportId(null) // Direct import doesn't require an import record id
      setCategories(data.result?.categories || [])
      setAverageConfidence(1.0)
      setWarnings(data.result?.warnings || [])
      setStep("REVIEW")
    } catch (err: any) {
      setError(err.message || "Spreadsheet parsing error. Please check formatting.")
    } finally {
      setIsExtracting(false)
    }
  }

  const handleStartAiExtraction = async () => {
    if (!file) return
    setIsExtracting(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("file", file)
      if (branchId) formData.append("branchId", branchId)

      const res = await fetch("/api/restaurant/import", {
        method: "POST",
        body: formData,
      })

      let data: any = {}
      try {
        data = await res.json()
      } catch {
        throw new Error("The server response timed out or the file exceeds payload limits. Please compress your PDF or try the Direct CSV import.")
      }

      if (!res.ok) throw new Error(data.error || "AI extraction failed. Please ensure the menu text is legible.")

      setImportId(data.importId)
      setCategories(data.result?.categories || [])
      setAverageConfidence(data.result?.averageConfidence || 0.9)
      setWarnings(data.result?.warnings || [])
      setStep("REVIEW")
    } catch (err: any) {
      setError(err.message || "Failed to process menu with AI")
    } finally {
      setIsExtracting(false)
    }
  }

  const handleUpdateItemPrice = (catIdx: number, itemIdx: number, newPrice: number) => {
    setCategories((prev) => {
      const copy = [...prev]
      copy[catIdx].items[itemIdx].price = newPrice
      return copy
    })
  }

  const handleUpdateItemName = (catIdx: number, itemIdx: number, newName: string) => {
    setCategories((prev) => {
      const copy = [...prev]
      copy[catIdx].items[itemIdx].name = newName
      return copy
    })
  }

  const handleApproveAndPublish = async () => {
    if (categories.length === 0) return
    setIsApproving(true)
    setError("")

    try {
      if (importId) {
        // AI Import Approval
        const res = await fetch(`/api/restaurant/import/${importId}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            branchId,
            categories,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Approval failed")
      } else {
        // Direct System Import
        const res = await fetch("/api/restaurant/import/direct", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            branchId,
            categories,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Direct import failed")
      }

      onImportComplete()
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to publish dishes to your menu.")
    } finally {
      setIsApproving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150 border border-slate-100">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${activeTab === "AI" ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"}`}>
              {activeTab === "AI" ? <Sparkles className="w-5 h-5" /> : <FileSpreadsheet className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {step === "INPUT" ? "Menu Importer" : "Review Dishes Before Publishing"}
              </h3>
              <p className="text-xs text-slate-500">
                {step === "INPUT"
                  ? "Import your restaurant menu via ChatGPT AI Scanner or Direct CSV/Excel."
                  : `Review and refine ${categories.reduce((s, c) => s + c.items.length, 0)} dishes found across ${categories.length} categories.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs (Only in INPUT step) */}
        {step === "INPUT" && (
          <div className="px-6 pt-4 pb-0 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setActiveTab("AI"); setError("") }}
              className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
                activeTab === "AI"
                  ? "border-purple-600 text-purple-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>AI Menu Scanner (ChatGPT / OpenAI)</span>
              <span className="text-[10px] bg-purple-100 text-purple-700 font-extrabold px-1.5 py-0.5 rounded-full">GPT-4o</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab("DIRECT"); setError("") }}
              className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
                activeTab === "DIRECT"
                  ? "border-emerald-600 text-emerald-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Direct System Import (CSV / Excel)</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded-full">No AI</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === "INPUT" ? (
            activeTab === "AI" ? (
              /* ── AI TAB ── */
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 text-purple-950 text-xs flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Powered by ChatGPT (OpenAI GPT-4o):</span> Upload your existing printed menu PDF or high-resolution photos. The AI extracts bilingual titles, portion variants, descriptions, dietary indicators (Veg/Vegan/GF), allergens, and prices.
                  </div>
                </div>

                <label className="border-2 border-dashed border-slate-300 hover:border-purple-500 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-50/50 hover:bg-purple-50/20 group">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    {file ? file.name : "Select or Drop Menu PDF / Photos"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md">
                    Supports multi-page PDFs, high-res photos, and scans up to 35 MB.
                  </p>
                </label>

                {file && (
                  <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-xs text-purple-950 font-medium truncate">
                      <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                      <span className="truncate font-semibold">{file.name}</span>
                      <span className="text-purple-600/70 text-[11px] shrink-0 font-mono">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <span className="text-[11px] bg-purple-200/80 text-purple-800 px-2 py-0.5 rounded-full font-bold shrink-0">
                      Ready for Analysis
                    </span>
                  </div>
                )}
              </div>
            ) : (
              /* ── DIRECT SPREADSHEET TAB ── */
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-emerald-950 text-xs">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Direct Instant Import (100% Deterministic & Free):</span> Upload a CSV file or paste rows copied straight from Microsoft Excel or Google Sheets.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shrink-0 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV Template</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option A: Upload CSV */}
                  <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-50/50 hover:bg-emerald-50/20">
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleDirectCsvUpload}
                      className="hidden"
                    />
                    <FileSpreadsheet className="w-8 h-8 text-emerald-600 mb-2" />
                    <span className="text-xs font-bold text-slate-800">Upload CSV File</span>
                    <span className="text-[11px] text-slate-400 mt-0.5">Click to browse your .csv file</span>
                  </label>

                  {/* Option B: Direct Copy-Paste info */}
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                        <ClipboardPaste className="w-4 h-4 text-slate-500" />
                        <span>Quick Copy-Paste Format</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Expected columns: <code>Category, Dish Name, Arabic Name, Price, Description, Dietary, Allergens</code>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCsvText(SAMPLE_CSV)}
                      className="mt-3 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 text-left underline"
                    >
                      Fill with sample restaurant dishes &rarr;
                    </button>
                  </div>
                </div>

                {/* Spreadsheet Textarea */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Or Paste Spreadsheet Data (CSV / Tab-Separated)
                  </label>
                  <textarea
                    rows={6}
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder="Paste rows from Excel here or write CSV..."
                    className="w-full p-3 font-mono text-xs rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  />
                </div>
              </div>
            )
          ) : (
            /* ── REVIEW STEP ── */
            <div className="space-y-5">
              {/* Confidence Banner */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-900">
                      {importId ? `AI Confidence Rating: ${Math.round(averageConfidence * 100)}%` : "Direct System Import (100% Precision)"}
                    </span>
                    <span className="text-[10px] bg-emerald-200/70 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">
                      Verified
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    You can edit any dish title, category name, or price inline before approving to your live menu.
                  </p>
                </div>
              </div>

              {/* Categories & Items List */}
              <div className="space-y-4">
                {categories.map((cat, catIdx) => (
                  <div key={catIdx} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <span>{cat.name}</span>
                        {cat.nameAr && <span className="text-slate-400 font-normal">({cat.nameAr})</span>}
                      </h4>
                      <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        {cat.items.length} items
                      </span>
                    </div>

                    <div className="space-y-2">
                      {cat.items.map((item, itemIdx) => {
                        const isLowConf = item.confidence < 0.75

                        return (
                          <div
                            key={itemIdx}
                            className={`bg-white rounded-xl p-3 border text-xs flex items-center justify-between gap-3 ${
                              isLowConf ? "border-amber-300 bg-amber-50/20" : "border-slate-200"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => handleUpdateItemName(catIdx, itemIdx, e.target.value)}
                                  className="font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 focus:outline-none text-xs"
                                />
                                {item.nameAr && (
                                  <span className="text-slate-500 font-normal truncate">
                                    • {item.nameAr}
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                  {item.description}
                                </p>
                              )}
                              {isLowConf && (
                                <p className="text-[10px] text-amber-600 font-semibold mt-1 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>{item.confidenceNote || "Double check price against original"}</span>
                                </p>
                              )}
                            </div>

                            {/* Price Editor */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-xs font-bold text-slate-500">OMR</span>
                              <input
                                type="number"
                                step="0.05"
                                value={item.price}
                                onChange={(e) =>
                                  handleUpdateItemPrice(catIdx, itemIdx, parseFloat(e.target.value) || 0)
                                }
                                className="w-20 p-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold text-right focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-b-3xl">
          {step === "INPUT" ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
              >
                Cancel
              </button>

              {activeTab === "AI" ? (
                <button
                  type="button"
                  disabled={!file || isExtracting}
                  onClick={handleStartAiExtraction}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>ChatGPT is Extracting Menu...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Scan Menu with ChatGPT</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!csvText.trim() || isExtracting}
                  onClick={() => handleParseSpreadsheet()}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Parsing Dishes...</span>
                    </>
                  ) : (
                    <>
                      <span>Parse & Preview Dishes</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep("INPUT")}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
              >
                &larr; Back to Input
              </button>

              <button
                type="button"
                disabled={isApproving || categories.length === 0}
                onClick={handleApproveAndPublish}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publishing to Live Menu...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Publish to Menu ({categories.reduce((s, c) => s + c.items.length, 0)} Dishes)</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
