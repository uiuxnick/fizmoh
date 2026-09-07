"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { ArrowRight, Loader2, UserPlus } from "lucide-react"
import { Brand } from "@/components/brand"

/**
 * Where an invitation link lands.
 *
 * Says who invited them and to what before asking for anything — a page that
 * opens with a password field and no explanation is one people close.
 */
export default function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter()
  const { token } = use(params)
  const [invitation, setInvitation] = useState<{
    email: string; name: string | null; role: string; workspace: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then(async response => {
        const data = await response.json()
        if (!response.ok) { setError(data.error || "That invitation cannot be used"); return }
        setInvitation(data.invitation)
        setName(data.invitation.name ?? "")
      })
      .catch(() => setError("Could not reach the server"))
  }, [token])

  async function accept() {
    setBusy(true)
    try {
      const response = await fetch(`/api/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      })
      const data = await response.json()
      if (!response.ok) { toast.error(data.error || "That did not work"); return }
      // Straight in: they have just proved who they are and set a password.
      router.push("/dashboard")
    } finally {
      setBusy(false)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center bg-stone-50 px-4 text-center">
        <div className="max-w-sm">
          <h1 className="text-xl font-bold text-stone-900">{error}</h1>
          <p className="mt-2 text-sm text-stone-600">
            Ask whoever invited you to send another one.
          </p>
          <a href="/"><Button variant="outline" className="mt-6">Go to Fizmoh</Button></a>
        </div>
      </div>
    )
  }

  if (!invitation) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
  }

  return (
    <div className="min-h-screen grid place-items-center bg-stone-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8"><Brand size="lg" /></div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 grid place-items-center">
            <UserPlus className="h-5 w-5 text-emerald-600" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-stone-900">
            Join {invitation.workspace}
          </h1>
          <p className="mt-1.5 text-sm text-stone-600">
            You have been invited as {invitation.role.toLowerCase().replace(/_/g, " ")}. Choose a
            password and you are in.
          </p>

          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Your name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ahmed" className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Email</Label>
              <Input value={invitation.email} disabled className="h-11 bg-stone-50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Choose a password</Label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && name.length >= 2 && password.length >= 8) accept() }}
                placeholder="At least 8 characters"
                className="h-11"
              />
            </div>
            <Button
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700"
              disabled={busy || name.trim().length < 2 || password.length < 8}
              onClick={accept}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Join <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
