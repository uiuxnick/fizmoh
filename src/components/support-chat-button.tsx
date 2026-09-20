"use client"
import { useState } from "react"
export function SupportChatButton() {
  const [opened, setOpened] = useState(false)
  return <div><button type="button" className="rounded-xl bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700" onClick={() => { window.dispatchEvent(new Event("fizmoh:open-support")); setOpened(true) }}>Open support chat</button>{opened && <p role="status" className="mt-2 text-sm text-stone-600">Use the support widget to chat or create a ticket. If it does not load, use WhatsApp.</p>}</div>
}
