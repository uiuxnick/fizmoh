"use client"

import { PaymentProof } from "@/components/payment-proof"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { CreditCard, ShieldCheck, ShieldAlert, Check, X, FileImage, Clock, Banknote, AlertTriangle, Upload } from "lucide-react"
import { formatCurrency, formatDateTime, timeAgo, prettifyStatus } from "@/lib/helpers"

interface Payment {
  id: string; amount: number; method: string; status: string; bankReference: string | null; bankName: string | null
  transferDate: string | null; screenshotUrl: string | null; screenshotOcr: any; fraudScore: number | null; fraudFlags: string | null
  verifiedAt: string | null; verifierComment: string | null; rejectionReason: string | null
  order?: { orderNumber: string; customerName: string; customerPhone: string; totalAmount: number; tour: { name: string }; slot: { date: string; startTime: string } } | null
  gatewayReference?: string | null
}

export default function PaymentsView() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("SUBMITTED")
  const [action, setAction] = useState<{ payment: Payment; type: "APPROVE" | "REJECT" } | null>(null)
  const [comment, setComment] = useState("")
  const [reason, setReason] = useState("")

  const load = () => {
    fetch(`/api/payments${filter !== "all" ? `?status=${filter}` : ""}`).then(r => r.json()).then(d => { setPayments(d.payments || []) }).catch(() => {})
  }
  useEffect(() => {
    fetch(`/api/payments${filter !== "all" ? `?status=${filter}` : ""}`).then(r => r.json()).then(d => { setPayments(d.payments || []); setLoading(false) }).catch(() => setLoading(false))
  }, [filter])

  const pending = payments.filter(p => p.status === "SUBMITTED").length
  const doAction = async () => {
    if (!action) return
    const staffId = "cmsdfk9dv0000nkf6tfezvl0j"
    const body: any = { action: action.type, staffId, comment }
    if (action.type === "REJECT") body.reason = reason
    const res = await fetch(`/api/payments/${action.payment.id}/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    if (res.ok) {
      toast.success(action.type === "APPROVE" ? "Payment approved! Confirmation sent." : "Payment rejected. Customer notified.")
      setAction(null); setComment(""); setReason("")
      load()
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-none space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center"><CreditCard className="h-5 w-5 text-amber-600" /></div>
          Payment Verification
        </h2>
        <p className="text-sm text-stone-500 mt-0.5">Manual bank transfer screenshot verification · <Badge className="bg-emerald-100 text-emerald-700 ml-1">Phase 1 — Live</Badge></p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><div className="text-[10px] text-stone-500">Pending</div><div className="text-xl font-bold text-amber-600">{pending}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-[10px] text-stone-500">Approved</div><div className="text-xl font-bold text-emerald-600">{payments.filter(p => p.status === "APPROVED").length}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-[10px] text-stone-500">Rejected</div><div className="text-xl font-bold text-rose-600">{payments.filter(p => p.status === "REJECTED").length}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-[10px] text-stone-500">Total Value</div><div className="text-xl font-bold text-stone-900">{formatCurrency(payments.reduce((s, p) => s + p.amount, 0))}</div></CardContent></Card>
      </div>

      <div className="flex gap-2">
        {["SUBMITTED", "APPROVED", "REJECTED", "all"].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === f ? "bg-emerald-600 text-white" : "bg-white border text-stone-600"}`}>{f === "all" ? "All" : prettifyStatus(f)}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
      ) : payments.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-16 text-center"><Check className="h-10 w-10 text-emerald-300 mx-auto mb-3" /><p className="text-stone-500">All caught up! No payments pending verification 🎉</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {payments.map(p => {
            const fraudScore = p.fraudScore || 0
            const flags = p.fraudFlags ? JSON.parse(p.fraudFlags) : []
            const ocr = p.screenshotOcr
            return (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-900">{p.order?.orderNumber || p.gatewayReference || p.bankReference || `#${p.id.slice(0, 8)}`}</span>
                        <Badge className={p.status === "SUBMITTED" ? "bg-amber-100 text-amber-700" : p.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}>{prettifyStatus(p.status)}</Badge>
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5">{p.order ? `${p.order.customerName} · ${p.order.customerPhone}` : (p.gatewayReference ? `Reference: ${p.gatewayReference}` : "Online Payment")}</div>
                      <div className="text-xs text-stone-500">{p.order?.tour?.name ? `${p.order.tour.name} · ${formatDateTime(p.order.slot.date)}` : "Verified Online Payment"}</div>
                    </div>
                    <div className="text-right"><div className="text-lg font-bold text-stone-900">{formatCurrency(p.amount)}</div><div className="text-[10px] text-stone-400">{p.method === "BANK_TRANSFER" ? "Bank Transfer" : "AmwalPay"}</div></div>
                  </div>

                  {p.bankReference && (
                    <div className="flex items-center gap-2 text-xs text-stone-600 p-2 rounded bg-stone-50">
                      <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Ref: <code className="font-mono">{p.bankReference}</code></span>
                      {p.bankName && <span>· {p.bankName}</span>}
                      {p.transferDate && <span>· {formatDateTime(p.transferDate)}</span>}
                    </div>
                  )}

                  {p.screenshotUrl && (
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-wide text-stone-400">Payment proof</div>
                      <PaymentProof url={p.screenshotUrl} />
                    </div>
                  )}

                  {ocr && (
                    <div className="p-3 rounded-lg bg-stone-50 border space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-stone-700"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />AI Fraud Analysis</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>Detected: <span className={`font-bold ${ocr.matchesExpected ? "text-emerald-600" : "text-rose-600"}`}>{ocr.detectedAmount ? formatCurrency(ocr.detectedAmount) : "—"}</span></div>
                        <div>Confidence: <span className="font-bold text-stone-700">{((ocr.confidence || 0) * 100).toFixed(0)}%</span></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-stone-500">Risk:</span>
                        <div className="flex-1 h-1.5 rounded-full bg-stone-200 overflow-hidden"><div className={`h-full rounded-full ${fraudScore < 0.3 ? "bg-emerald-500" : fraudScore < 0.6 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${fraudScore * 100}%` }} /></div>
                        <span className={`text-[10px] font-bold ${fraudScore < 0.3 ? "text-emerald-600" : fraudScore < 0.6 ? "text-amber-600" : "text-rose-600"}`}>{fraudScore < 0.3 ? "LOW" : fraudScore < 0.6 ? "MEDIUM" : "HIGH"}</span>
                      </div>
                      {flags.length > 0 && (
                        <div className="flex flex-wrap gap-1">{flags.map((f: string, i: number) => <Badge key={i} variant="outline" className="text-[9px] bg-rose-50 text-rose-600 border-rose-200"><AlertTriangle className="h-2.5 w-2.5 mr-0.5" />{f}</Badge>)}</div>
                      )}
                    </div>
                  )}

                  {p.status === "SUBMITTED" && (
                    <div className="flex gap-2 pt-2">
                      <Button onClick={() => setAction({ payment: p, type: "APPROVE" })} className="flex-1 bg-emerald-600 hover:bg-emerald-700"><Check className="h-4 w-4 mr-1.5" />Approve</Button>
                      <Button onClick={() => setAction({ payment: p, type: "REJECT" })} variant="destructive" className="flex-1"><X className="h-4 w-4 mr-1.5" />Reject</Button>
                    </div>
                  )}
                  {p.verifiedAt && <div className="text-[10px] text-stone-400 flex items-center gap-1"><Clock className="h-3 w-3" />Verified {timeAgo(p.verifiedAt)}</div>}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {action && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setAction(null)}>
          <Card className="max-w-md w-full" onClick={e => e.stopPropagation()}>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2">{action.type === "APPROVE" ? <><Check className="h-5 w-5 text-emerald-600" />Approve Payment</> : <><X className="h-5 w-5 text-rose-600" />Reject Payment</>}</h3>
              <div className="p-3 rounded-lg bg-stone-50 text-sm">
                <div>Order/Ref: <strong>{action.payment.order?.orderNumber || action.payment.gatewayReference || `#${action.payment.id.slice(0, 8)}`}</strong></div>
                <div>Customer: {action.payment.order?.customerName || "Online Customer"}</div>
                <div>Amount: <strong>{formatCurrency(action.payment.amount)}</strong></div>
              </div>
              {action.type === "REJECT" && (
                <div>
                  <Label className="text-xs">Reason for rejection</Label>
                  <select value={reason} onChange={e => setReason(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border bg-white text-sm">
                    <option value="">Select reason...</option>
                    <option value="Screenshot unclear">Screenshot unclear</option>
                    <option value="Amount mismatch">Amount mismatch</option>
                    <option value="Transfer not received">Transfer not received</option>
                    <option value="Duplicate submission">Duplicate submission</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}
              <div>
                <Label className="text-xs">Comment (optional)</Label>
                <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a note..." className="mt-1 bg-white" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setAction(null)}>Cancel</Button>
                <Button onClick={doAction} disabled={action.type === "REJECT" && !reason} className={`flex-1 ${action.type === "APPROVE" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}>{action.type === "APPROVE" ? "Approve" : "Reject"}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
