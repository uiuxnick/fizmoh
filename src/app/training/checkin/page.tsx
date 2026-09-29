"use client"

import React, { useState } from "react"
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  Search,
  Users,
  Award,
  ArrowLeft,
  Building,
  Calendar,
} from "lucide-react"

export default function TrainingCheckinPage() {
  const [tokenInput, setTokenInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [recentCheckIns, setRecentCheckIns] = useState<any[]>([])

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenInput.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch("/api/training/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken: tokenInput.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to process check-in")
      }

      setResult(data)
      setRecentCheckIns(prev => [data, ...prev.slice(0, 9)])
      setTokenInput("")
    } catch (err: any) {
      setError(err.message || "Failed to verify check-in token")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 font-sans p-4 sm:p-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center mx-auto font-bold shadow-lg shadow-amber-500/20">
            <QrCode className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Executive Check-in Scanner</h1>
          <p className="text-xs text-stone-400">
            Scan attendee badge QR code or enter Attendee Token / Registration ID
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-stone-800/90 border border-stone-700/80 rounded-2xl p-6 shadow-xl space-y-4">
          <form onSubmit={handleCheckIn} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block mb-1.5">
                Attendee QR Token / Ticket Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="Paste or scan token (e.g. att_12345...)"
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                  className="w-full h-12 pl-4 pr-10 rounded-xl bg-stone-950 border border-stone-700 text-sm font-mono text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 top-2 h-8 px-3 rounded-lg bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Checking..." : "Verify"}
                </button>
              </div>
            </div>
          </form>

          {/* Feedback messages */}
          {error && (
            <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
              <div>
                <div className="font-bold">Check-in Rejected</div>
                <div className="text-[11px] mt-0.5 text-red-200">{error}</div>
              </div>
            </div>
          )}

          {result && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-2 animate-in fade-in ${
                result.alreadyCheckedIn
                  ? "bg-amber-950/40 border-amber-800 text-amber-200"
                  : "bg-emerald-950/50 border-emerald-700 text-emerald-200"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2
                  className={`h-5 w-5 ${
                    result.alreadyCheckedIn ? "text-amber-400" : "text-emerald-400"
                  }`}
                />
                <span>{result.alreadyCheckedIn ? "Already Checked In" : "Check-in Successful! 🎉"}</span>
              </div>
              <p className="text-xs">{result.message}</p>

              {result.attendee && (
                <div className="p-3 rounded-lg bg-stone-900/60 border border-stone-800/80 space-y-1 text-[11px] text-stone-300 mt-2">
                  <div>
                    <strong>Attendee:</strong> {result.attendee.name}
                  </div>
                  {result.attendee.designation && (
                    <div>
                      <strong>Designation:</strong> {result.attendee.designation}
                    </div>
                  )}
                  {result.attendee.company && (
                    <div>
                      <strong>Company:</strong> {result.attendee.company}
                    </div>
                  )}
                  <div>
                    <strong>Seat Type:</strong>{" "}
                    {result.attendee.isFreeSeat ? "Free Guest Seat (BOGO)" : "Paid Delegate"}
                  </div>
                  {result.course && (
                    <div>
                      <strong>Course:</strong> {result.course.name}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Check-ins */}
        {recentCheckIns.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Live Verified Reception Log ({recentCheckIns.length})
            </div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {recentCheckIns.map((ci, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-stone-800/60 border border-stone-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="font-semibold text-stone-200">
                      {ci.attendee?.name || "Participant"}
                    </span>
                    <span className="text-[10px] text-stone-500">
                      ({ci.attendee?.company || "Guest"})
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-stone-400">
                    {ci.attendee?.checkInTime ? new Date(ci.attendee.checkInTime).toLocaleTimeString() : "Checked In"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center pt-2">
          <a
            href="/training"
            className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Training Admin Portal</span>
          </a>
        </div>
      </div>
    </div>
  )
}
