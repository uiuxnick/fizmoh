"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Table,
  Layers,
  Sparkles,
  GitMerge,
  CopyCheck,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"
import { parseCsvText, guessColumnMapping, type ParsedCsv } from "@/lib/csv-parser"

interface CsvImportWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: () => void
  customFieldDefs?: Array<{ key: string; label: string; type: string }>
}

type Step = "upload" | "mapping" | "settings" | "results"

const TARGET_FIELDS = [
  { value: "skip", label: "— Do not import (Skip) —" },
  { value: "phone", label: "📱 Phone (WhatsApp Primary) *" },
  { value: "name", label: "👤 Full Name" },
  { value: "email", label: "✉️ Email Address" },
  { value: "channel", label: "🌐 Channel (WhatsApp/Facebook/Instagram)" },
  { value: "socialUsername", label: "📸 Instagram Handle (@username)" },
  { value: "tags", label: "🏷️ Tags / Labels (comma-separated)" },
  { value: "stage", label: "🎯 CRM Stage" },
  { value: "loyaltyTier", label: "⭐ Loyalty Tier" },
  { value: "totalSpent", label: "💰 Total Spent" },
]

export function CsvImportWizard({
  open,
  onOpenChange,
  onImportComplete,
  customFieldDefs = [],
}: CsvImportWizardProps) {
  const [step, setStep] = useState<Step>("upload")
  const [csvContent, setCsvContent] = useState("")
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [columnMapping, setColumnMapping] = useState<Record<number, string>>({})
  const [dedupStrategy, setDedupStrategy] = useState<"merge" | "overwrite" | "skip">("merge")
  const [globalTag, setGlobalTag] = useState("")
  const [optIn, setOptIn] = useState(true)
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<{
    created: number
    updated: number
    skipped: number
    total: number
    skipDetails?: any[]
  } | null>(null)

  // Reset wizard on open
  useEffect(() => {
    if (open) {
      setStep("upload")
      setCsvContent("")
      setParsed(null)
      setColumnMapping({})
      setResults(null)
      setGlobalTag(`Import-${new Date().toLocaleDateString("en-GB", { month: "short", day: "numeric" })}`)
    }
  }, [open])

  // Custom fields options
  const customFieldKeys = useMemo(() => customFieldDefs.map(c => c.key), [customFieldDefs])

  // Handle file drop / upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = evt => {
      const text = String(evt.target?.result || "")
      setCsvContent(text)
      parseAndPrepareMapping(text)
    }
    reader.readAsText(file)
  }

  const parseAndPrepareMapping = (text: string) => {
    const res = parseCsvText(text)
    if (res.headers.length === 0 || res.rows.length === 0) {
      toast.error("CSV must contain a header row and at least 1 contact record")
      return false
    }

    setParsed(res)

    // Auto guess mappings
    const mapping: Record<number, string> = {}
    res.headers.forEach((h, idx) => {
      mapping[idx] = guessColumnMapping(h, customFieldKeys)
    })
    setColumnMapping(mapping)
    setStep("mapping")
    return true
  }

  const handleManualParse = () => {
    if (!csvContent.trim()) {
      toast.error("Please paste or upload CSV content")
      return
    }
    parseAndPrepareMapping(csvContent)
  }

  const executeImport = async () => {
    if (!parsed || !csvContent) return

    setImporting(true)
    try {
      const res = await fetch("/api/subscribers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv: csvContent,
          columnMapping,
          dedupStrategy,
          globalTag: globalTag.trim(),
          optIn,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Import failed")

      setResults(data)
      setStep("results")
      toast.success(`Import complete! ${data.created} added, ${data.updated} updated`)
      onImportComplete()
    } catch (err: any) {
      toast.error(err.message || "Failed to process import")
    } finally {
      setImporting(false)
    }
  }

  // Check validity of mapping
  const mappingHasIdentifier = useMemo(() => {
    const targets = Object.values(columnMapping)
    return targets.includes("phone") || targets.includes("socialUsername") || targets.includes("email")
  }, [columnMapping])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-stone-900">
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            Smart CSV Subscriber Import &amp; Merge
          </DialogTitle>
        </DialogHeader>

        {/* Wizard Step Progress */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3 pt-1 text-xs">
          <div className="flex items-center gap-2">
            {[
              { id: "upload", label: "1. Upload CSV" },
              { id: "mapping", label: "2. Column Mapping" },
              { id: "settings", label: "3. Deduplication" },
              { id: "results", label: "4. Summary" },
            ].map(s => (
              <span
                key={s.id}
                className={`font-semibold px-2 py-0.5 rounded-full ${
                  step === s.id
                    ? "bg-emerald-100 text-emerald-800"
                    : "text-stone-400"
                }`}
              >
                {s.label}
              </span>
            ))}
          </div>
          {parsed && (
            <Badge variant="outline" className="bg-stone-50 text-stone-600 text-[11px]">
              {parsed.rowCount} rows detected
            </Badge>
          )}
        </div>

        {/* ─── STEP 1: UPLOAD / PASTE CSV ─── */}
        {step === "upload" && (
          <div className="space-y-4 pt-2">
            <div className="border-2 border-dashed border-stone-200 hover:border-emerald-500/50 rounded-2xl p-6 text-center bg-stone-50/50 transition-colors">
              <Upload className="h-8 w-8 mx-auto text-stone-400 mb-2" />
              <div className="text-xs font-bold text-stone-800">
                Upload your CSV file
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Drag and drop your subscriber file or browse below
              </p>
              <label className="mt-3 inline-block cursor-pointer">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="text-xs font-semibold px-3 py-1.5 bg-white border border-stone-200 rounded-lg shadow-2xs hover:bg-stone-50 text-stone-700">
                  Select CSV File
                </span>
              </label>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-stone-700">Or Paste Raw CSV Data</Label>
                <button
                  type="button"
                  onClick={() => {
                    setCsvContent(
                      "Phone,Full Name,Email,Tags,City\n+96898821965,Salim Al-Habsi,salim@example.com,VIP,Muscat\n+96891234567,Fatma Al-Lawati,fatma@example.com,Wholesale,Sohar"
                    )
                  }}
                  className="text-[11px] text-emerald-600 hover:underline font-semibold"
                >
                  Insert Sample Data
                </button>
              </div>
              <Textarea
                placeholder={"phone,name,email,tags\n+96898821965,Ahmed,ahmed@example.com,VIP"}
                value={csvContent}
                onChange={e => setCsvContent(e.target.value)}
                className="font-mono text-xs min-h-[140px] bg-white"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleManualParse}
                disabled={!csvContent.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5"
              >
                <span>Continue to Column Mapping</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ─── STEP 2: SMART COLUMN MAPPING ─── */}
        {step === "mapping" && parsed && (
          <div className="space-y-4 pt-1">
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-start gap-2.5 text-xs">
              <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-950">Smart Column Matcher</span>
                <p className="text-emerald-800 text-[11px] mt-0.5">
                  We automatically matched your columns. Verify the mapping below and assign any custom fields.
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-stone-500 uppercase px-2 pb-1 border-b border-stone-100">
                <div className="col-span-4">CSV Header &amp; Sample</div>
                <div className="col-span-8">Destination Property</div>
              </div>

              {parsed.headers.map((header, idx) => {
                const currentTarget = columnMapping[idx] || "skip"
                const sampleValues = parsed.rows.slice(0, 2).map(r => r[idx]).filter(Boolean).join(", ")

                return (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-colors text-xs"
                  >
                    <div className="col-span-4 min-w-0">
                      <div className="font-bold text-stone-800 truncate" title={header}>
                        {header}
                      </div>
                      <div className="text-[10px] text-stone-400 truncate mt-0.5" title={sampleValues}>
                        e.g. {sampleValues || "(empty)"}
                      </div>
                    </div>

                    <div className="col-span-8">
                      <select
                        value={currentTarget}
                        onChange={e => {
                          setColumnMapping(prev => ({ ...prev, [idx]: e.target.value }))
                        }}
                        className={`w-full h-8 text-xs border rounded-lg px-2 bg-white font-medium ${
                          currentTarget === "phone"
                            ? "border-emerald-300 bg-emerald-50/30 text-emerald-900 font-bold"
                            : currentTarget !== "skip"
                              ? "border-stone-300 text-stone-900 font-semibold"
                              : "border-stone-200 text-stone-400"
                        }`}
                      >
                        {TARGET_FIELDS.map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                        {customFieldDefs.length > 0 && (
                          <optgroup label="Custom CRM Properties">
                            {customFieldDefs.map(cf => (
                              <option key={cf.key} value={`customField:${cf.key}`}>
                                🧩 {cf.label || cf.key} ({cf.key})
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>

            {!mappingHasIdentifier && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                <span>You must map at least one contact identifier: <strong>Phone</strong>, <strong>Instagram Handle</strong>, or <strong>Email</strong>.</span>
              </div>
            )}

            <DialogFooter className="flex items-center justify-between sm:justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("upload")}
                className="text-xs gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
              <Button
                size="sm"
                onClick={() => setStep("settings")}
                disabled={!mappingHasIdentifier}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5"
              >
                <span>Deduplication &amp; Tags</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ─── STEP 3: DEDUPLICATION & SETTINGS ─── */}
        {step === "settings" && (
          <div className="space-y-4 pt-1 text-xs">
            {/* Deduplication Strategy Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <GitMerge className="h-3.5 w-3.5 text-emerald-600" />
                Deduplication Strategy (If Contact Already Exists)
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    id: "merge" as const,
                    title: "Smart Merge (Recommended)",
                    desc: "Fills in blank fields, merges custom properties, and adds new tags without overwriting existing data.",
                  },
                  {
                    id: "overwrite" as const,
                    title: "Overwrite Existing",
                    desc: "Replaces existing contact names, emails, and properties with new values from this CSV.",
                  },
                  {
                    id: "skip" as const,
                    title: "Skip Duplicates",
                    desc: "Leaves existing contacts completely untouched. Only creates brand new contacts.",
                  },
                ].map(strat => (
                  <button
                    key={strat.id}
                    type="button"
                    onClick={() => setDedupStrategy(strat.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      dedupStrategy === strat.id
                        ? "border-emerald-600 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-600/30"
                        : "border-stone-200 bg-white hover:border-stone-300"
                    }`}
                  >
                    <div className="font-bold text-stone-900 flex items-center justify-between">
                      <span>{strat.title}</span>
                      {dedupStrategy === strat.id && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      )}
                    </div>
                    <p className="text-[10px] text-stone-500 mt-1 leading-tight">{strat.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Global Tag Assignment */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-stone-700">
                Apply Tag to All Imported Contacts (Optional)
              </Label>
              <Input
                placeholder="e.g. Webinar-Leads, Import-Sep24..."
                value={globalTag}
                onChange={e => setGlobalTag(e.target.value)}
                className="h-9 text-xs bg-white"
              />
              <p className="text-[10px] text-stone-400">
                Helps you quickly filter or create dynamic segments for this specific import batch.
              </p>
            </div>

            {/* Consent / Opt-in Box */}
            <label className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/60 p-3 cursor-pointer">
              <Checkbox
                checked={optIn}
                onCheckedChange={v => setOptIn(v === true)}
                className="mt-0.5"
              />
              <span className="text-xs text-amber-950">
                <span className="font-bold block flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                  Mark contacts as subscribed (Opted-in)
                </span>
                <span className="text-[11px] text-amber-800/80 block mt-0.5">
                  Confirm you hold verified messaging consent for contacts in this list under Meta messaging policies and local regulations.
                </span>
              </span>
            </label>

            <DialogFooter className="flex items-center justify-between sm:justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("mapping")}
                className="text-xs gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Mapping
              </Button>
              <Button
                size="sm"
                onClick={executeImport}
                disabled={importing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5"
              >
                {importing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Start Import ({parsed?.rowCount ?? 0} contacts)</span>
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ─── STEP 4: RESULTS SUMMARY ─── */}
        {step === "results" && results && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 text-center space-y-1">
              <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-emerald-950">
                Import Processed Successfully
              </h3>
              <p className="text-[11px] text-emerald-800">
                Your subscriber database has been updated with the mapped CSV records.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-white border border-stone-200 shadow-2xs">
                <div className="text-2xl font-black text-emerald-600">{results.created}</div>
                <div className="text-[11px] font-semibold text-stone-700 mt-0.5">New Contacts Created</div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-stone-200 shadow-2xs">
                <div className="text-2xl font-black text-blue-600">{results.updated}</div>
                <div className="text-[11px] font-semibold text-stone-700 mt-0.5">Existing Contacts Merged</div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-stone-200 shadow-2xs">
                <div className="text-2xl font-black text-stone-500">{results.skipped}</div>
                <div className="text-[11px] font-semibold text-stone-700 mt-0.5">Duplicates / Skipped</div>
              </div>
            </div>

            {results.skipDetails && results.skipDetails.length > 0 && (
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
                <div className="text-[10px] font-bold uppercase text-stone-400 tracking-wider">
                  Skipped Row Details:
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {results.skipDetails.map((s, idx) => (
                    <div key={idx} className="text-[11px] text-stone-600 flex items-center justify-between">
                      <span>Row #{s.row}: {s.reason}</span>
                      {s.data?.phone && <span className="font-mono text-stone-400">{s.data.phone}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                size="sm"
                onClick={() => onOpenChange(false)}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs"
              >
                Close &amp; View Subscribers
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
