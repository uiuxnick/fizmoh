"use client"

import { useEffect, useState } from "react"

export function HospitalPhoneVerification({ mobile, onVerified }: { mobile: string; onVerified: (mobile: string) => void }) {
  const [workspace, setWorkspace] = useState("")
  const [sentTo, setSentTo] = useState("")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const phone = mobile.replace(/[\s()-]/g, "")

  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/hospital/patient-session", { signal: controller.signal, cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error("Hospital sign-in is unavailable"); return response.json() })
      .then(data => setWorkspace(data.workspace))
      .catch(error => { if (!controller.signal.aborted) setError(error.message) })
    return () => controller.abort()
  }, [])

  const submit = async (verify: boolean) => {
    setBusy(true); setError("")
    try {
      const response = await fetch(`/api/auth/${verify ? "verify-otp" : "otp"}?workspace=${encodeURIComponent(workspace)}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, ...(verify ? { otp: code } : {}) }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Verification failed")
      if (verify) onVerified(mobile)
      else { setSentTo(phone); setCode("") }
    } catch (error) { setError(error instanceof Error ? error.message : "Verification failed") }
    finally { setBusy(false) }
  }

  return <div className="rounded-xl border p-3 space-y-3">
    <p className="text-sm text-stone-600">Verify your registered number with a WhatsApp code before viewing records. Include the country code.</p>
    <button type="button" disabled={busy || !workspace || !/^\+[1-9]\d{7,14}$/.test(phone)} onClick={() => submit(false)} className="text-blue-700 text-sm disabled:opacity-50">{busy ? "Please wait…" : "Send verification code"}</button>
    {sentTo === phone && <>
      <input aria-label="Six-digit verification code" autoComplete="one-time-code" inputMode="numeric" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} className="w-full rounded-lg border p-2" />
      <button type="button" disabled={busy || code.length !== 6} onClick={() => submit(true)} className="text-blue-700 text-sm disabled:opacity-50">Verify number</button>
    </>}
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
  </div>
}
