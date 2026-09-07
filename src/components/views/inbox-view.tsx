"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import {
  Send, Bot, Search, User, Sparkles, Phone, ExternalLink,
  Check, CheckCheck, AlertCircle, Image as ImageIcon, FileText, Music, Video,
  MapPin, Clock, ShieldCheck, MoreVertical, RefreshCw, Paperclip, Smile,
  Facebook, Instagram, MessagesSquare,
} from "lucide-react"
import { timeAgo } from "@/lib/helpers"
import { useApp } from "@/lib/store"
import { useRealtime } from "@/lib/use-realtime"
import { LabelPicker, AssignPicker, CannedPicker, labelClass } from "@/components/views/conversation-tools"
import { TemplatePicker } from "@/components/views/template-picker"
import { CatalogPicker } from "@/components/views/catalog-picker"
import { ConversationDetails } from "@/components/views/conversation-details"
import {
  ComposerAttachments, VoiceRecorder, AttachmentChip, MessageMedia, type Attachment,
} from "@/components/views/composer-tools"

interface Conversation {
  id: string
  customerPhone: string
  customerName: string | null
  status: string
  botActive: boolean
  labels: string | null
  lastMessageAt: string | null
  lastMessageText: string | null
  unreadCount: number
  intent: string | null
  sentiment: string | null
  assignedStaffId?: string | null
  channel?: string
  customer: {
    name: string | null
    loyaltyTier: string
    totalBookings: number
    totalSpent: number
  } | null
}

/** One small icon per channel — used on the avatar badge, the chat header, and the filter chips. */
function ChannelIcon({ channel, className }: { channel?: string; className?: string }) {
  if (channel === "FACEBOOK") return <Facebook className={className} />
  if (channel === "INSTAGRAM") return <Instagram className={className} />
  if (channel === "LIVE_CHAT" || channel === "WEBSITE") return <MessagesSquare className={className} />
  return <WhatsAppIcon className={className} />
}

function channelLabel(channel?: string): string {
  if (channel === "FACEBOOK") return "Messenger"
  if (channel === "INSTAGRAM") return "Instagram"
  if (channel === "LIVE_CHAT" || channel === "WEBSITE") return "Web Live Chat"
  return "WhatsApp"
}

/** A conversation's "display phone" is a synthetic social:facebook:<psid> placeholder for non-WhatsApp channels — never shown as if it were a real number. */
function displayIdentity(c: Conversation): string {
  if (c.customerName) return c.customerName
  if (c.channel === "LIVE_CHAT" || c.channel === "WEBSITE") return "Website Visitor"
  if (c.channel && c.channel !== "WHATSAPP") return "A customer"
  return c.customerPhone
}

interface Message {
  id: string
  direction: string
  type: string
  content: string
  isAiGenerated: boolean
  createdAt: string
  status?: string | null
  mediaUrl?: string | null
  templateName?: string | null
  interactiveData?: any
  caption?: string | null
  aiSuggestions?: string[] | null
}

function FormattedMessageText({ text, isOutgoing }: { text: string; isOutgoing?: boolean }) {
  if (!text) return null
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)

  return (
    <>
      {parts.map((part, i) => {
        if (part.match(/^https?:\/\//i)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline font-semibold hover:opacity-80 break-all inline-flex items-center gap-0.5 ${
                isOutgoing ? "text-emerald-100 hover:text-white" : "text-emerald-700 hover:text-emerald-900"
              }`}
              onClick={e => e.stopPropagation()}
            >
              {part}
              <ExternalLink className="h-3 w-3 inline shrink-0" />
            </a>
          )
        }
        return part
      })}
    </>
  )
}

/** The webhook stores these when media arrives with no caption. */
function previewText(text: string | null) {
  if (!text) return "No messages"
  const clean = text.trim().toLowerCase()
  if (clean === "[image]" || clean.includes("media_placeholder")) return "📷 Photo"
  if (clean === "[audio]" || clean === "[voice]") return "🎤 Voice note"
  if (clean === "[video]") return "🎬 Video"
  if (clean === "[document]") return "📄 Document"
  if (clean === "[sticker]") return "✨ Sticker"
  if (clean === "[location]") return "📍 Location"
  return text
}

function isMediaPlaceholder(text: string) {
  const clean = text.trim().toLowerCase()
  return (
    clean === "[image]" ||
    clean === "[audio]" ||
    clean === "[video]" ||
    clean === "[document]" ||
    clean === "[sticker]" ||
    clean === "[location]" ||
    clean === "[voice]" ||
    clean.includes("media_placeholder")
  )
}

export default function InboxView() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(true)
  const [botTyping, setBotTyping] = useState(false)
  const { currentStaffId } = useApp()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [filter, setFilter] = useState("all")
  const [channelFilter, setChannelFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [session, setSession] = useState<{ open: boolean; expiresAt: string | null; hoursLeft: number } | null>(null)

  const loadConvos = () => {
    fetch("/api/conversations")
      .then(r => r.json())
      .then(d => { setConversations(d.conversations || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    loadConvos()
    const i = setInterval(loadConvos, 60000)
    return () => clearInterval(i)
  }, [])

  const loadMessages = async (id: string) => {
    const res = await fetch(`/api/conversations/${id}/messages`)
    const data = await res.json()
    setMessages(data.conversation?.messages || [])
    setSession(data.session ?? null)
  }

  useEffect(() => {
    if (!selectedId) return
    loadMessages(selectedId)
  }, [selectedId])

  const { focus, setFocus } = useApp()
  useEffect(() => {
    if (focus?.kind !== "conversation") return
    setSelectedId(focus.id)
    setFocus(null)
  }, [focus, setFocus])

  useRealtime(event => {
    if (event.type === "typing" && event.conversationId === selectedId) {
      setBotTyping(true)
      window.setTimeout(() => setBotTyping(false), 30000)
      return
    }
    if (event.type === "message") setBotTyping(false)

    loadConvos()
    if ("conversationId" in event && event.conversationId === selectedId) loadMessages(selectedId)
  })

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, botTyping])

  const openConversation = (conversation: Conversation) => {
    setSelectedId(conversation.id)
    if (conversation.unreadCount > 0) {
      setConversations(prev => prev.map(c => (c.id === conversation.id ? { ...c, unreadCount: 0 } : c)))
    }
  }

  const send = async (content: string, direction: string) => {
    if (!selectedId) return
    if (!content.trim() && !(direction === "OUTBOUND" && attachment)) return

    const body: any = { content, direction, senderId: direction === "OUTBOUND" ? currentStaffId : undefined }
    if (direction === "OUTBOUND" && attachment) {
      if (attachment.kind === "location") {
        body.location = { latitude: attachment.latitude, longitude: attachment.longitude, name: attachment.name }
        body.type = "LOCATION"
      } else {
        body.type = attachment.type
        body.mediaUrl = attachment.url
        body.filename = attachment.filename
      }
    }
    const res = await fetch(`/api/conversations/${selectedId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.message) setMessages(prev => [...prev, data.message])
    if (data.delivered === false) toast.error(data.error || "WhatsApp did not accept the message")
    if (data.aiResponse) {
      setBotTyping(true)
      setTimeout(() => { setMessages(prev => [...prev, data.aiResponse]); setBotTyping(false) }, 500)
    }
    setText("")
    setAttachment(null)
    loadConvos()
  }

  const query = search.trim().toLowerCase()
  const filtered = conversations.filter(c =>
    (filter === "all" || (filter === "bot" && c.botActive) || (filter === "unread" && c.unreadCount > 0) || c.status === filter) &&
    (channelFilter === "all" || (c.channel || "WHATSAPP") === channelFilter) &&
    (!query || (c.customerName || "").toLowerCase().includes(query) || c.customerPhone.includes(query))
  )
  const selected = conversations.find(c => c.id === selectedId)

  return (
    <div className="flex h-full w-full overflow-hidden bg-stone-100/50">
      {/* ── Left Conversation List (Fixed header, scrollable contact numbers) ── */}
      <div className="w-full md:w-84 lg:w-96 border-r border-stone-200/90 bg-white flex flex-col h-full overflow-hidden shrink-0">
        {/* Header & Search */}
        <div className="p-3.5 border-b border-stone-200/80 bg-stone-50/50 space-y-2.5 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-stone-900 flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center">
                <MessagesSquare className="h-5 w-5 text-emerald-600" />
              </div>
              <span>Inbox</span>
            </h2>
            <span className="text-[11px] font-bold text-stone-500 bg-stone-200/60 px-2 py-0.5 rounded-full font-mono">
              {filtered.length} chats
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
            <Input
              placeholder="Search name, phone, or message..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-8.5 text-xs bg-white border-stone-200 rounded-xl shadow-2xs focus-visible:ring-emerald-500"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {[
              ["all", "All channels"],
              ["WHATSAPP", "WhatsApp"],
              ["FACEBOOK", "Messenger"],
              ["INSTAGRAM", "Instagram"],
              ["LIVE_CHAT", "Live Web Chat"],
            ].map(([f, l]) => (
              <button
                key={f}
                onClick={() => setChannelFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                  channelFilter === f
                    ? "bg-stone-900 text-white shadow-xs"
                    : "bg-stone-100/90 text-stone-600 hover:bg-stone-200/70"
                }`}
              >
                {f !== "all" && <ChannelIcon channel={f} className="h-3 w-3" />}
                {l}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {[
              ["all", "All"],
              ["unread", "Unread"],
              ["OPEN", "Open"],
              ["bot", "Bot Active"],
              ["PENDING", "Pending"],
            ].map(([f, l]) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  filter === f
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-stone-100/90 text-stone-600 hover:bg-stone-200/70"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Conversation List */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="p-3 space-y-2.5">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center px-4">
              <MessagesSquare className="h-10 w-10 mx-auto mb-2 opacity-40 text-stone-400" />
              <p className="text-sm font-semibold text-stone-700">No conversations found</p>
              <p className="text-xs text-stone-400 mt-0.5">Incoming WhatsApp, Messenger and Instagram messages will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {filtered.map(c => {
                const labels = c.labels ? JSON.parse(c.labels) : []
                const isSelected = selectedId === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => openConversation(c)}
                    className={`w-full p-3.5 text-left transition-colors relative flex items-start gap-3 hover:bg-stone-50/90 ${
                      isSelected ? "bg-emerald-50/80 border-r-3 border-emerald-600" : ""
                    }`}
                  >
                    <div className="relative shrink-0 mt-0.5">
                      <Avatar className="h-11 w-11 rounded-2xl border border-stone-200/70 shadow-2xs">
                        <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-sm">
                          {displayIdentity(c)[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className="absolute -top-1 -left-1 h-4.5 w-4.5 rounded-full bg-white border border-stone-200 flex items-center justify-center shadow-xs"
                        title={channelLabel(c.channel)}
                      >
                        <ChannelIcon channel={c.channel} className="h-2.5 w-2.5" />
                      </div>
                      {c.botActive && (
                        <div
                          className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center shadow-xs"
                          title="Bot Automation Active"
                        >
                          <Bot className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-xs font-bold truncate ${isSelected ? "text-emerald-950" : "text-stone-900"}`}>
                          {displayIdentity(c)}
                        </span>
                        {c.lastMessageAt && (
                          <span className="text-[10px] font-medium text-stone-400 shrink-0 font-mono">
                            {timeAgo(c.lastMessageAt)}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-stone-500 truncate leading-relaxed">
                        {previewText(c.lastMessageText)}
                      </p>

                      <div className="flex items-center justify-between gap-1 mt-1.5">
                        <div className="flex items-center gap-1 overflow-hidden">
                          {labels.slice(0, 2).map((l: string) => (
                            <Badge key={l} className={`text-[9px] font-semibold h-4 px-1.5 rounded ${labelClass(l)}`}>
                              {l}
                            </Badge>
                          ))}
                        </div>
                        {c.unreadCount > 0 && (
                          <Badge className="bg-emerald-600 text-white text-[10px] font-black h-4.5 min-w-4.5 px-1.5 rounded-full shadow-xs">
                            {c.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Center Chat Pane (Screen stays stuck, messages scroll) ── */}
      <div className="hidden md:flex flex-1 flex-col h-full min-w-0 overflow-hidden bg-white">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center bg-stone-50/50 p-6">
            <div className="text-center max-w-sm">
              <div className="h-16 w-16 rounded-3xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/10">
                <WhatsAppIcon className="h-10 w-10" />
              </div>
              <h3 className="text-base font-bold text-stone-900">Select a Conversation</h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Choose a customer from the left sidebar to view messages, send replies, or assign human operators.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Top Header */}
            <div className="px-5 py-3.5 border-b border-stone-200/80 bg-white flex items-center justify-between shadow-2xs z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <Avatar className="h-10 w-10 rounded-2xl border border-stone-200 shadow-2xs">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-sm">
                      {displayIdentity(selected)[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className="absolute -top-1 -left-1 h-4.5 w-4.5 rounded-full bg-white border border-stone-200 flex items-center justify-center shadow-xs"
                    title={channelLabel(selected.channel)}
                  >
                    <ChannelIcon channel={selected.channel} className="h-2.5 w-2.5" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-stone-900 leading-tight">
                      {displayIdentity(selected)}
                    </span>
                    <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0">{channelLabel(selected.channel)}</Badge>
                    {selected.customer?.loyaltyTier && (
                      <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 bg-emerald-50 text-emerald-800 border-emerald-200">
                        {selected.customer.loyaltyTier}
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5">
                    {(!selected.channel || selected.channel === "WHATSAPP") && (
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="h-3 w-3 text-stone-400" />
                        {selected.customerPhone}
                      </span>
                    )}
                    {(!selected.channel || selected.channel === "WHATSAPP") && (
                      session?.open ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/70">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          24h window open ({session.hoursLeft}h left)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/70">
                          Template window required
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Chat Header Actions */}
              <div className="flex items-center gap-2">
                <LabelPicker conversationId={selected.id} labels={selected.labels} onChanged={loadConvos} />
                <AssignPicker conversationId={selected.id} assignedStaffId={selected.assignedStaffId ?? null} onChanged={loadConvos} />

                <div className="flex items-center gap-1.5 pl-2 border-l border-stone-200 ml-1">
                  <span className="text-xs font-semibold text-stone-600">Bot</span>
                  <Switch
                    checked={selected.botActive}
                    onCheckedChange={async v => {
                      await fetch(`/api/conversations/${selected.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ botActive: v }),
                      })
                      loadConvos()
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Chat Messages Body with WhatsApp Texture Background */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-[#e5ddd5]/25 bg-[radial-gradient(#0000000a_1px,transparent_1px)] [background-size:16px_16px]"
            >
              {messages.map(m => {
                const outgoing = m.direction !== "INBOUND"
                const isBot = m.direction === "BOT"
                const isTemplate = m.type === "TEMPLATE" || Boolean(m.templateName)
                const isCatalog = m.type === "CATALOG"

                let displayText = m.content || m.caption || ""
                const isPlaceholder = isMediaPlaceholder(displayText)

                if (!displayText.trim() && !isPlaceholder) {
                  if (isTemplate) displayText = `[Template: ${m.templateName || "Meta Template"}]`
                  else if (isCatalog) displayText = "🛍️ Meta Catalog & Product Showcase"
                  else if (m.type === "INTERACTIVE") displayText = "[Interactive Bot Response]"
                  else if (m.type === "CALL") displayText = "📞 Call Event"
                  else if (m.mediaUrl) displayText = ""
                  else displayText = "[Message]"
                }

                let interactiveItems: string[] = []
                let carouselCards: any[] = []
                let catalogData: any = null

                if (m.interactiveData) {
                  try {
                    const parsed = typeof m.interactiveData === "string" ? JSON.parse(m.interactiveData) : m.interactiveData
                    if (Array.isArray(parsed?.buttons)) {
                      interactiveItems = parsed.buttons.map((b: any) => b.title || b.text || b.id || "Option")
                    } else if (Array.isArray(parsed?.rows)) {
                      interactiveItems = parsed.rows.map((r: any) => r.title || r.id || "Option")
                    }
                    if (Array.isArray(parsed?.cards)) {
                      carouselCards = parsed.cards
                    }
                    if (parsed?.catalog) {
                      catalogData = parsed
                    }
                  } catch {}
                }

                return (
                  <div key={m.id} className={`flex ${outgoing ? "justify-end" : "justify-start"} animate-in fade-in-50 duration-150`}>
                    <div
                      className={`max-w-[85%] sm:max-w-[72%] rounded-2xl px-4 py-2.5 shadow-xs relative transition-all ${
                        outgoing
                          ? isBot
                            ? "bg-gradient-to-br from-teal-800 to-emerald-900 text-white rounded-tr-xs"
                            : "bg-gradient-to-br from-emerald-700 to-emerald-800 text-white rounded-tr-xs"
                          : "bg-white text-stone-900 border border-stone-200/80 rounded-tl-xs"
                      }`}
                    >
                      {/* Sender Meta Badges */}
                      {m.isAiGenerated ? (
                        <div className={`flex items-center gap-1 text-[10px] font-bold mb-1 ${outgoing ? "text-emerald-200" : "text-amber-600"}`}>
                          <Sparkles className="h-3 w-3" /> Najwa AI Assistant
                        </div>
                      ) : isBot ? (
                        <div className={`flex items-center gap-1 text-[10px] font-bold mb-1 ${outgoing ? "text-teal-200" : "text-blue-600"}`}>
                          <Bot className="h-3 w-3" /> Automated Bot Reply
                        </div>
                      ) : null}

                      {isTemplate && (
                        <div
                          className={`flex items-center gap-1 text-[10px] font-mono mb-1 px-2 py-0.5 rounded-lg ${
                            outgoing ? "bg-emerald-900/60 text-emerald-200" : "bg-stone-100 text-stone-700 border border-stone-200"
                          }`}
                        >
                          <span>📋 Meta Template:</span> <span className="font-bold">{m.templateName || "Approved Template"}</span>
                        </div>
                      )}

                      {isCatalog && (
                        <div
                          className={`flex items-center gap-1 text-[10px] font-bold mb-1 px-2 py-0.5 rounded-lg ${
                            outgoing ? "bg-purple-900/60 text-purple-200" : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          <span>🛍️ Meta Catalog Showcase</span>
                        </div>
                      )}

                      {/* Media Rendering */}
                      {m.mediaUrl ? (
                        <div className="mb-1.5 rounded-xl overflow-hidden">
                          <MessageMedia url={m.mediaUrl} type={m.type} outgoing={outgoing} />
                        </div>
                      ) : isPlaceholder ? (
                        <div className={`flex items-center gap-2.5 py-1 px-2.5 rounded-xl mb-1 ${outgoing ? "bg-black/15" : "bg-stone-100"}`}>
                          <ImageIcon className="h-4 w-4 shrink-0" />
                          <span className="text-xs font-semibold">{previewText(displayText)}</span>
                        </div>
                      ) : null}

                      {/* Message Text Content */}
                      {displayText && !isPlaceholder && (
                        <p className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap">
                          <FormattedMessageText text={displayText} isOutgoing={outgoing} />
                        </p>
                      )}

                      {/* Carousel Cards */}
                      {carouselCards.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-white/20">
                          <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5 opacity-90">
                            🎠 Carousel ({carouselCards.length} cards)
                          </div>
                          <div className="flex gap-2.5 overflow-x-auto pb-1 max-w-full">
                            {carouselCards.map((card: any, idx: number) => (
                              <div
                                key={idx}
                                className={`shrink-0 w-48 rounded-xl overflow-hidden border p-2 flex flex-col justify-between ${
                                  outgoing
                                    ? "bg-emerald-900/80 border-emerald-600/50 text-white"
                                    : "bg-stone-50 border-stone-200 text-stone-900"
                                }`}
                              >
                                {card.imageUrl && (
                                  <img
                                    src={card.imageUrl}
                                    alt={`Card ${idx + 1}`}
                                    className="w-full h-24 object-cover rounded-lg mb-1.5 bg-stone-200"
                                  />
                                )}
                                <div className="flex-1 min-w-0 mb-1">
                                  <div className="text-xs font-bold line-clamp-1">{card.body || card.title || `Card ${idx + 1}`}</div>
                                  {card.variables?.length > 0 && (
                                    <div className="text-[10px] opacity-80 truncate">{card.variables.join(", ")}</div>
                                  )}
                                </div>
                                {(card.buttonUrl || card.buttons?.length > 0) && (
                                  <div
                                    className={`text-[10px] py-1 text-center font-bold rounded-lg ${
                                      outgoing ? "bg-emerald-800 text-white" : "bg-emerald-600 text-white"
                                    }`}
                                  >
                                    {card.buttons?.[0]?.text || "Select"}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Interactive Buttons / Lists */}
                      {interactiveItems.length > 0 && (
                        <div className="mt-2 space-y-1 border-t border-white/20 pt-2">
                          {interactiveItems.map((item, i) => (
                            <div
                              key={i}
                              className={`text-xs px-3 py-1.5 rounded-lg text-center font-semibold ${
                                outgoing
                                  ? "bg-emerald-800/80 text-white border border-emerald-600/40"
                                  : "bg-stone-100 text-stone-900 border border-stone-200"
                              }`}
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Timestamp & Read Receipts */}
                      <div
                        className={`text-[10px] mt-1.5 flex items-center gap-1.5 justify-end font-mono ${
                          outgoing ? "text-emerald-200/90" : "text-stone-400"
                        }`}
                      >
                        <span>
                          {new Date(m.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {outgoing && (
                          m.status === "READ" ? (
                            <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
                          ) : m.status === "DELIVERED" ? (
                            <CheckCheck className="h-3.5 w-3.5 opacity-80" />
                          ) : m.status === "FAILED" ? (
                            <AlertCircle className="h-3.5 w-3.5 text-rose-300" />
                          ) : (
                            <Check className="h-3.5 w-3.5 opacity-70" />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {botTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-stone-200 rounded-2xl px-4 py-2.5 flex items-center gap-1.5 shadow-xs">
                    <span className="text-xs font-semibold text-stone-500 mr-1">Najwa is typing</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </div>

            {/* Agent Message Composer */}
            <div className="p-3.5 border-t border-stone-200/80 bg-white shrink-0 space-y-2.5">
              {attachment && <AttachmentChip attachment={attachment} onClear={() => setAttachment(null)} />}

              {/* AI Smart Reply Suggestions */}
              {(() => {
                const latestInbound = [...messages].reverse().find(m => m.direction === "INBOUND")
                const smartSuggestions: string[] = (latestInbound as any)?.aiSuggestions || (
                  (selected.channel === "LIVE_CHAT" || selected.channel === "WEBSITE") && messages.length > 0
                    ? [
                        "Hello! How can I assist you with your inquiry today?",
                        "I'd be happy to help you with that! Could you please provide more details?",
                        "Thank you for reaching out! Let me check this for you right away.",
                      ]
                    : []
                )
                if (!smartSuggestions || smartSuggestions.length === 0) return null
                return (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 shrink-0 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/80 shadow-2xs">
                      <Sparkles className="h-3 w-3 text-amber-600 animate-pulse" />
                      <span>AI Smart Reply</span>
                    </div>
                    {smartSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setText(suggestion)}
                        className="text-xs bg-stone-50 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-stone-200/90 rounded-lg px-2.5 py-1 text-stone-700 transition-colors whitespace-nowrap shadow-2xs"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )
              })()}

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-stone-100/80 p-1 rounded-xl border border-stone-200/60">
                  <CannedPicker onPick={value => setText(value)} />
                  <ComposerAttachments onAttach={setAttachment} />
                  <VoiceRecorder onRecorded={setAttachment} />
                  {(!selected.channel || selected.channel === "WHATSAPP") && (
                    <>
                      <TemplatePicker conversationId={selected.id} onSent={() => loadMessages(selected.id)} />
                      <CatalogPicker conversationId={selected.id} onSent={() => loadMessages(selected.id)} />
                    </>
                  )}
                </div>

                <div className="flex-1 relative">
                  <Input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder={attachment ? "Add a caption, or send directly…" : "Type a reply as agent..."}
                    className="h-10 text-xs sm:text-sm bg-stone-50/70 border-stone-200 rounded-xl pl-3.5 pr-10 focus-visible:ring-emerald-500"
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey && (text.trim() || attachment)) {
                        e.preventDefault()
                        send(text, "OUTBOUND")
                      }
                    }}
                  />
                </div>

                <Button
                  onClick={() => (text.trim() || attachment) && send(text, "OUTBOUND")}
                  disabled={!text.trim() && !attachment}
                  className="h-10 w-10 p-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-sm shadow-emerald-600/30 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Right Customer Details & CRM Panel (Details & notes scroll) ── */}
      {selected && (
        <div className="hidden lg:flex w-80 lg:w-88 shrink-0 border-l border-stone-200/80 bg-white flex-col h-full overflow-hidden">
          <ConversationDetails
            conversation={selected as never}
            session={session}
            onChanged={() => {
              loadConvos()
              if (selectedId) loadMessages(selectedId)
            }}
          />
        </div>
      )}
    </div>
  )
}
