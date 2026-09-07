"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  Loader2, Receipt, Search, CheckCircle2, BellRing, Edit2,
  Calendar, RefreshCw, AlertTriangle, ExternalLink, ArrowUpDown, FileText, Printer, Download, Share2, Send, CreditCard,
  PenTool, Upload, Trash2, Check
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"

interface Invoice {
  id: string
  reference: string
  tenantName?: string
  amount: number
  currency: string
  status: string
  periodStart: string
  periodEnd: string | null
  paidAt: string | null
  dunningStep: number
  gatewayReference?: string | null
  createdAt: string
}

export function InvoicesDunningPanel() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [editStatus, setEditStatus] = useState("")
  const [editGatewayRef, setEditGatewayRef] = useState("")
  const [saving, setSaving] = useState(false)

  const loadInvoices = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/platform/invoices?page=${page}&limit=50`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      const list = Array.isArray(data.invoices) ? data.invoices : Array.isArray(data.data) ? data.data : []
      setInvoices(list)
    } catch {
      setInvoices([])
      toast.error("Failed to load invoices")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvoices()
  }, [page])

  const openEdit = (inv: Invoice) => {
    setSelectedInvoice(inv)
    setEditStatus(inv.status)
    setEditGatewayRef(inv.gatewayReference || "")
  }

  const markAsPaid = async (inv: Invoice) => {
    try {
      const res = await fetch(`/api/platform/invoices/${inv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PAID",
          paidAt: new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Invoice ${inv.reference} marked as PAID`)
      await loadInvoices()
    } catch {
      toast.error("Failed to mark invoice as paid")
    }
  }

  const sendReminder = async (inv: Invoice) => {
    try {
      const nextStep = Math.min(3, (inv.dunningStep || 0) + 1)
      const res = await fetch(`/api/platform/invoices/${inv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dunningStep: nextStep,
          lastDunnedAt: new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Dunning reminder level ${nextStep} sent to ${inv.tenantName}`)
      await loadInvoices()
    } catch {
      toast.error("Failed to update dunning status")
    }
  }

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInvoice) return
    setSaving(true)
    try {
      const res = await fetch(`/api/platform/invoices/${selectedInvoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          gatewayReference: editGatewayRef || null,
          paidAt: editStatus === "PAID" && !selectedInvoice.paidAt ? new Date().toISOString() : selectedInvoice.paidAt,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success("Invoice updated successfully")
      setSelectedInvoice(null)
      await loadInvoices()
    } catch {
      toast.error("Failed to update invoice")
    } finally {
      setSaving(false)
    }
  }

  // Signature Modal State
  const [sigModalOpen, setSigModalOpen] = useState(false)
  const [sigLoading, setSigLoading] = useState(false)
  const [sigUrl, setSigUrl] = useState("")
  const [sigName, setSigName] = useState("")
  const [sigFile, setSigFile] = useState<File | null>(null)
  const [sigPreview, setSigPreview] = useState<string | null>(null)
  const [sigSaving, setSigSaving] = useState(false)

  const openSignatureModal = async () => {
    setSigModalOpen(true)
    setSigLoading(true)
    setSigFile(null)
    setSigPreview(null)
    try {
      const res = await fetch("/api/platform/invoice-signature")
      if (res.ok) {
        const data = await res.json()
        setSigUrl(data.signatureUrl || "")
        setSigName(data.signatoryName || "")
      }
    } catch {
      // ignore
    } finally {
      setSigLoading(false)
    }
  }

  const handleSaveSignature = async (e: React.FormEvent) => {
    e.preventDefault()
    setSigSaving(true)
    try {
      const form = new FormData()
      if (sigFile) form.append("file", sigFile)
      form.append("signatoryName", sigName)
      const res = await fetch("/api/platform/invoice-signature", {
        method: "POST",
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save signature")
      toast.success("Authorized signature updated successfully")
      setSigUrl(data.signatureUrl || "")
      setSigFile(null)
      setSigPreview(null)
      setSigModalOpen(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to save signature")
    } finally {
      setSigSaving(false)
    }
  }

  const handleDeleteSignature = async () => {
    if (!confirm("Are you sure you want to remove the current authorized signature?")) return
    setSigSaving(true)
    try {
      const res = await fetch("/api/platform/invoice-signature", { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Signature removed")
      setSigUrl("")
      setSigPreview(null)
      setSigFile(null)
    } catch {
      toast.error("Failed to remove signature")
    } finally {
      setSigSaving(false)
    }
  }

  const safeInvoices = Array.isArray(invoices) ? invoices : []
  const filtered = safeInvoices.filter(inv => {
    const s = search.toLowerCase()
    const matchesSearch =
      (inv.reference || "").toLowerCase().includes(s) ||
      (inv.tenantName || "").toLowerCase().includes(s) ||
      (inv.gatewayReference || "").toLowerCase().includes(s)
    const matchesStatus = statusFilter === "ALL" || inv.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase()
    if (s === "PAID") return "bg-emerald-100 text-emerald-800 border-emerald-300"
    if (s === "PENDING") return "bg-amber-100 text-amber-800 border-amber-300 font-bold"
    if (s === "FAILED") return "bg-rose-100 text-rose-800 border-rose-300"
    if (s === "REFUNDED") return "bg-slate-100 text-slate-700 border-slate-300"
    return "bg-stone-100 text-stone-700 border-stone-200"
  }

  const getDunningBadge = (step: number) => {
    if (step === 0) return <span className="text-stone-400 font-mono text-[10px]">None (0)</span>
    if (step === 1) return <span className="bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold px-1.5 py-0.5 rounded">1st Reminder</span>
    if (step === 2) return <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-1.5 py-0.5 rounded">2nd Notice</span>
    return <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-black px-1.5 py-0.5 rounded">Final Warning (3)</span>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-900">Invoices & Dunning</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Monitor SaaS subscription invoices, overdue payments, and automated dunning follow-ups.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={openSignatureModal}
            className="text-xs rounded-xl h-9 gap-1.5 bg-white border-stone-300 text-stone-700 hover:bg-stone-50 font-semibold"
          >
            <PenTool className="h-3.5 w-3.5 text-emerald-600" /> Authorized Signature
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={loadInvoices}
            disabled={loading}
            className="text-xs rounded-xl h-9 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {/* Filters */}
        <div className="p-4 bg-stone-50/60 border-b border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
            <Input
              placeholder="Search reference, tenant, or gateway ref..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs rounded-xl bg-white border-stone-200"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-9 px-3 text-xs font-semibold rounded-xl border border-stone-200 bg-white text-stone-700 w-full sm:w-auto"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending (Unpaid)</option>
              <option value="PAID">Paid</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
        </div>

        {loading && safeInvoices.length === 0 ? (
          <div className="py-14 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600 mx-auto" />
            <p className="text-xs text-stone-500 mt-2 font-medium">Loading invoices...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center space-y-2">
            <div className="h-12 w-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
              <Receipt className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-stone-700">No invoices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Workspace</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Dunning Escalation</th>
                  <th className="px-4 py-3">Created / Paid</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-stone-900">{inv.reference}</div>
                      {inv.gatewayReference && (
                        <div className="text-[10px] text-stone-400 font-mono">GW: {inv.gatewayReference}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-stone-800">
                      {inv.tenantName || "Workspace"}
                    </td>
                    <td className="px-4 py-3.5 font-black text-stone-900">
                      OMR {(inv.amount / 1000).toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {getDunningBadge(inv.dunningStep || 0)}
                    </td>
                    <td className="px-4 py-3.5 text-stone-500">
                      <div>{new Date(inv.createdAt).toLocaleDateString()}</div>
                      {inv.paidAt && (
                        <div className="text-[10px] text-emerald-700 font-semibold">
                          Paid: {new Date(inv.paidAt).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-1.5">
                      {inv.status === "PENDING" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => markAsPaid(inv)}
                            className="h-7 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Mark Paid
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendReminder(inv)}
                            className="h-7 text-xs rounded-lg text-amber-800 border-amber-200 hover:bg-amber-50 font-bold gap-1"
                          >
                            <BellRing className="h-3 w-3" /> Send Reminder
                          </Button>
                        </>
                      )}
                      {/*
                        * View, print and download all open the same PDF: the
                        * browser's own viewer already prints and saves, and a
                        * second rendering path would be a second thing to keep
                        * in step with the invoice design.
                        */}
                      {/*
                        * View and Print open the real reference page — the
                        * actual HTML/CSS the design was built from, rendered
                        * with this invoice's data — rather than the pdf-lib
                        * approximation. "Save as PDF" from the browser's print
                        * dialog is an exact match to the design.
                        */}
                      <Button size="sm" variant="ghost" title="View invoice"
                        onClick={() => window.open(`/api/platform/invoices/${inv.id}/view`, "_blank", "noopener")}
                        className="h-7 text-xs rounded-lg text-stone-600 font-semibold">
                        <FileText className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" title="Print"
                        onClick={() => window.open(`/api/platform/invoices/${inv.id}/view?print=1`, "_blank", "noopener")}
                        className="h-7 text-xs rounded-lg text-stone-600 font-semibold">
                        <Printer className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" title="Download"
                        onClick={() => {
                          const a = document.createElement("a")
                          a.href = `/api/platform/invoices/${inv.id}/pdf`
                          a.download = `${inv.reference}.pdf`
                          a.click()
                        }}
                        className="h-7 text-xs rounded-lg text-stone-600 font-semibold">
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" title="Copy share link"
                        onClick={async () => {
                          const url = `${window.location.origin}/api/invoices/${inv.id}/pdf`
                          try {
                            await navigator.clipboard.writeText(url)
                            toast.success("Invoice link copied")
                          } catch {
                            toast.error("Could not copy — the link is " + url)
                          }
                        }}
                        className="h-7 text-xs rounded-lg text-stone-600 font-semibold">
                        <Share2 className="h-3 w-3" />
                      </Button>
                      {inv.status !== "PAID" && (
                        <>
                          <Button size="sm" variant="ghost" title="Pay with Paymob (Cards, OmanNet, Wallets)"
                            onClick={() => window.open(`/api/paymob/pay/${encodeURIComponent(inv.reference)}`, "_blank", "noopener")}
                            className="h-7 px-2 text-[11px] rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold gap-1">
                            <CreditCard className="h-3 w-3" /> Paymob
                          </Button>
                          <Button size="sm" variant="ghost" title="Pay with AmwalPay (SmartBox, Cards, Apple Pay)"
                            onClick={() => window.open(`/api/amwalpay/pay/${encodeURIComponent(inv.reference)}`, "_blank", "noopener")}
                            className="h-7 px-2 text-[11px] rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-semibold gap-1">
                            <CreditCard className="h-3 w-3" /> AmwalPay
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" title="Send on WhatsApp"
                        onClick={async () => {
                          if (!confirm(`Send invoice ${inv.reference} to ${inv.tenantName || "this workspace"} on WhatsApp?`)) return
                          try {
                            const res = await fetch(`/api/platform/invoices/${inv.id}/send`, { method: "POST" })
                            const data = await res.json().catch(() => ({}))
                            if (!res.ok) throw new Error(data.error || "Could not send")
                            toast.success(`Sent to ${data.to}`)
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Could not send")
                          }
                        }}
                        className="h-7 text-xs rounded-lg text-emerald-700 font-semibold">
                        <Send className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Edit"
                        onClick={() => openEdit(inv)}
                        className="h-7 text-xs rounded-lg text-stone-600 font-semibold"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Invoice Dialog */}
      {selectedInvoice && (
        <Dialog open={!!selectedInvoice} onOpenChange={open => !open && setSelectedInvoice(null)}>
          <DialogContent className="sm:max-w-md p-6 bg-white rounded-3xl border-stone-200">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-stone-900">
                Edit Invoice: {selectedInvoice.reference}
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-500">
                Workspace: {selectedInvoice.tenantName} · Amount: OMR {(selectedInvoice.amount / 1000).toFixed(2)}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveInvoice} className="space-y-4 mt-2">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Invoice Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-semibold rounded-xl border border-stone-200 bg-white text-stone-800"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="PAID">PAID</option>
                  <option value="FAILED">FAILED</option>
                  <option value="REFUNDED">REFUNDED</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Payment Gateway Reference</label>
                <Input
                  placeholder="e.g. AMW-12345678"
                  value={editGatewayRef}
                  onChange={e => setEditGatewayRef(e.target.value)}
                  className="text-xs rounded-xl h-9 font-mono"
                />
              </div>

              <DialogFooter className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
                <Button type="button" variant="outline" onClick={() => setSelectedInvoice(null)} className="rounded-xl text-xs">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Authorized Signature Management Dialog */}
      <Dialog open={sigModalOpen} onOpenChange={open => !open && setSigModalOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-stone-900 flex items-center gap-2">
              <PenTool className="h-5 w-5 text-emerald-600" />
              Manage Authorized Signature
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Upload an authorized signature image (PNG, JPG, or WEBP) and set the signatory title to display on all generated invoices.
            </DialogDescription>
          </DialogHeader>

          {sigLoading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              <p className="text-xs text-stone-500">Loading signature configuration...</p>
            </div>
          ) : (
            <form onSubmit={handleSaveSignature} className="space-y-4 py-2">
              {/* Current or Preview Signature Display */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1.5">Current Signature</label>
                <div className="rounded-xl border-2 border-dashed border-stone-200 bg-stone-50/60 p-4 flex flex-col items-center justify-center min-h-[90px]">
                  {sigPreview || sigUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={sigPreview || sigUrl}
                        alt="Authorized Signature"
                        className="max-h-16 max-w-full object-contain"
                      />
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-emerald-700 font-medium">✓ Signature active</span>
                        {sigUrl && !sigPreview && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={handleDeleteSignature}
                            disabled={sigSaving}
                            className="h-6 px-2 text-[10px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1"
                          >
                            <Trash2 className="h-3 w-3" /> Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <PenTool className="h-8 w-8 text-stone-300 mx-auto mb-1.5" />
                      <p className="text-xs text-stone-400 font-medium">No signature image uploaded yet.</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">Falls back to stylized cursive company name.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Input */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Upload New Signature File
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) {
                        setSigFile(f)
                        setSigPreview(URL.createObjectURL(f))
                      }
                    }}
                    className="text-xs rounded-xl h-9 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                </div>
                <p className="text-[10px] text-stone-400 mt-1">
                  Recommended: Transparent PNG image (approx. 400×120px) under 5MB.
                </p>
              </div>

              {/* Signatory Name / Title */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Signatory Title / Designation
                </label>
                <Input
                  placeholder="e.g. Authorised Signature or Fizmoh Technologies"
                  value={sigName}
                  onChange={e => setSigName(e.target.value)}
                  className="text-xs rounded-xl h-9"
                />
                <p className="text-[10px] text-stone-400 mt-1">
                  Printed directly below the signature line on official A4 invoices.
                </p>
              </div>

              <DialogFooter className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSigModalOpen(false)
                    setSigPreview(null)
                    setSigFile(null)
                  }}
                  disabled={sigSaving}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={sigSaving}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
                >
                  {sigSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Save Signature
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
