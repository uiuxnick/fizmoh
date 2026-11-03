"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, Star, CheckCircle2, Pencil, ArrowLeft, Languages } from "lucide-react"

/**
 * The customer's entire journey, scan to Google — one component because the
 * steps are a single linear conversation, not separate pages a phone would
 * have to reload between.
 */

type Step =
  | "loading" | "error"
  | "rate" | "input" | "generating" | "suggestions"
  | "confirm" | "google-sent"
  | "private-feedback" | "private-sent"

type Suggestion = { id: string; style: string; text: string }

const I18N = {
  en: {
    rateTitle: "How was your experience?",
    whatLiked: "What did you like?",
    whatLikedSub: "Pick what applies — takes a few seconds.",
    tellWords: "Tell us a few words (optional)",
    placeholderText: "Food was excellent and staff were very friendly.",
    continueBtn: "Continue",
    generating: "Writing a few suggestions from what you told us…",
    chooseReview: "Choose a review",
    chooseReviewSub: "Pick the one that sounds most like you.",
    selectThis: "Select this review",
    readyTitle: "Your review is ready",
    postGoogle: "Post on Google",
    editBtn: "Edit review",
    saveChanges: "Save changes",
    cancelBtn: "Cancel",
    chooseAnother: "Choose another",
    privatePrompt: "Also send the team private feedback",
    almostDone: "Almost done",
    almostDoneSub: "We've opened Google in a new tab — please finish posting your review there.",
    copiedNotice: "Your review text is copied — just paste it into the box.",
    openGoogleAgain: "Open Google review again",
    privateTitle: "Tell us more, privately",
    privateSub: "This goes straight to the team, not to a public review. You can still post on Google either way.",
    privatePlaceholder: "What happened, and how can we make it right?",
    phonePlaceholder: "Phone number (optional)",
    callbackCheckbox: "I'd like someone to call me back",
    submitFeedback: "Submit feedback",
    thankYou: "Thank you",
    thankYouSub: "Your feedback has been sent to the team.",
    styleLabels: { NATURAL: "Natural", SHORT: "Short & sweet", DETAILED: "Detailed" } as Record<string, string>,
    tags: ["Food", "Service", "Staff", "Atmosphere", "Cleanliness", "Value", "Quality", "Location", "Experience"],
  },
  ar: {
    rateTitle: "كيف كانت تجربتك معنا؟",
    whatLiked: "ما الذي أعجبك؟",
    whatLikedSub: "اختر ما ينطبق — يستغرق بضع ثوانٍ فقط.",
    tellWords: "أخبرنا بكلمات بسيطة (اختياري)",
    placeholderText: "كانت الخدمة ممتازة والطاقم ودوداً للغاية.",
    continueBtn: "متابعة",
    generating: "جارٍ صياغة اقتراحات مراجعة مميزة لك…",
    chooseReview: "اختر المراجعة الأنسب",
    chooseReviewSub: "اختر الصياغة الأقرب لتجربتك لنشرها.",
    selectThis: "اختيار هذه المراجعة",
    readyTitle: "مراجعتك جاهزة للنشر",
    postGoogle: "نشر على خرائط جوجل",
    editBtn: "تعديل المراجعة",
    saveChanges: "حفظ التعديلات",
    cancelBtn: "إلغاء",
    chooseAnother: "اختيار صياغة أخرى",
    privatePrompt: "إرسال ملاحظة خاصة ومباشرة للإدارة",
    almostDone: "أوشكنا على الانتهاء",
    almostDoneSub: "تم فتح صفحة التقييم على خرائط جوجل — يرجى لصق المراجعة وإرسالها.",
    copiedNotice: "تم نسخ نص المراجعة تلقائياً — فقط الصقه في خانة التقييم.",
    openGoogleAgain: "فتح رابط تقييم جوجل مجدداً",
    privateTitle: "شاركنا ملاحظاتك بسرية",
    privateSub: "ستصل هذه الرسالة مباشرة لإدارة المكان دون نشرها علناً.",
    privatePlaceholder: "ما الذي حدث؟ وكيف يمكننا تحسين تجربتك؟",
    phonePlaceholder: "رقم هاتفك للتواصل (اختياري)",
    callbackCheckbox: "أرغب في أن يتواصل معي أحد المسؤولين هاتفياً",
    submitFeedback: "إرسال الملاحظات",
    thankYou: "شكراً جزيلاً لك",
    thankYouSub: "تم إرسال ملاحظاتك بنجاح إلى الإدارة مباشرة.",
    styleLabels: { NATURAL: "طبيعي وودي", SHORT: "مختصر ومباشر", DETAILED: "مفصل وشامل" } as Record<string, string>,
    tags: ["الخدمة", "الجودة", "الاستقبال", "الأسعار", "النظافة", "السرعة", "الموقع", "الأجواء", "التجربة العامة"],
  },
}

export function QrReviewFlow({ token }: { token: string }) {
  const [lang, setLang] = useState<"en" | "ar">("en")
  const t = I18N[lang]

  const [step, setStep] = useState<Step>("loading")
  const [error, setError] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [business, setBusiness] = useState<{ name: string; logoUrl: string | null }>({ name: "", logoUrl: null })
  // Advisory only — every rating can post to Google. This just decides
  // whether the confirm screen also offers private feedback alongside it.
  const [ratingThreshold, setRatingThreshold] = useState(4)

  const [rating, setRating] = useState(0)
  const [tags, setTags] = useState<string[]>([])
  const [freeText, setFreeText] = useState("")
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [finalText, setFinalText] = useState("")
  const [editing, setEditing] = useState(false)
  const [googleUrl, setGoogleUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [pfCategory, setPfCategory] = useState("")
  const [pfText, setPfText] = useState("")
  const [pfPhone, setPfPhone] = useState("")
  const [pfCallback, setPfCallback] = useState(false)

  // ── Step 1: scan ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/qr/${encodeURIComponent(token)}/scan`, { method: "POST" })
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || "This QR code could not be loaded")
        return data
      })
      .then(data => {
        setSessionId(data.sessionId)
        setBusiness(data.business)
        if (data.campaign?.language === "ar") setLang("ar")
        if (Number.isInteger(data.campaign?.ratingThreshold)) setRatingThreshold(data.campaign.ratingThreshold)
        setStep("rate")
      })
      .catch(e => { setError(e.message); setStep("error") })
  }, [token])

  async function call(path: string, body?: unknown) {
    const res = await fetch(`/api/qr/sessions/${sessionId}${path}`, {
      method: body === undefined ? "POST" : "PATCH",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || "Something went wrong")
    return data
  }

  async function submitRating(value: number) {
    setBusy(true)
    setRating(value)
    try {
      await call("/rate", { rating: value })
      setStep("input")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your rating")
    } finally {
      setBusy(false)
    }
  }

  async function submitInput() {
    setBusy(true)
    try {
      await call("/input", { tags, freeText })
      setStep("generating")
      const gen = await call("/generate") as { suggestions?: Suggestion[]; error?: string }
      if (gen.suggestions?.length) {
        setSuggestions(gen.suggestions)
        setStep("suggestions")
      } else {
        // AI unavailable — the customer's own words still work as their review.
        setSuggestions([])
        setFinalText(freeText)
        setStep("suggestions")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  async function selectSuggestion(s: Suggestion) {
    setBusy(true)
    try {
      await call("/select", { suggestionId: s.id })
      setSelectedId(s.id)
      setFinalText(s.text)
      setStep("confirm")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not select that review")
    } finally {
      setBusy(false)
    }
  }

  async function saveEdit() {
    setBusy(true)
    try {
      await call("/edit", { text: finalText })
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your changes")
    } finally {
      setBusy(false)
    }
  }

  const [copied, setCopied] = useState(false)

  async function confirmAndPost() {
    setBusy(true)
    try {
      // 1. Confirm session and retrieve review URL
      const res = await call("/confirm") as { googleReviewUrl: string | null }
      const url = res.googleReviewUrl

      // Copy text to clipboard immediately while within user gesture
      try {
        await navigator.clipboard.writeText(finalText)
        setCopied(true)
      } catch { /* clipboard permission fallback */ }

      // 2. Track click asynchronously in the background so window.open is not blocked by mobile Safari
      call("/google-click").catch(() => {})

      setGoogleUrl(url)
      if (url) {
        window.open(url, "_blank", "noopener")
      }
      setStep("google-sent")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open Google review")
    } finally {
      setBusy(false)
    }
  }

  async function submitPrivateFeedback() {
    setBusy(true)
    try {
      await call("/private-feedback", {
        category: pfCategory || undefined,
        feedbackText: pfText,
        contactPhone: pfPhone || undefined,
        wantsCallback: pfCallback,
      })
      setStep("private-sent")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit your feedback")
    } finally {
      setBusy(false)
    }
  }

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="min-h-screen bg-stone-50 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Language switch */}
        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={() => setLang(l => l === "ar" ? "en" : "ar")}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-stone-200/70 hover:bg-stone-300 text-stone-700 transition-colors"
          >
            <Languages className="h-3.5 w-3.5" />
            {lang === "ar" ? "English" : "العربية"}
          </button>
        </div>

        {business.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={business.logoUrl} alt={business.name} className="h-12 w-auto mx-auto mb-3 object-contain" />
        ) : null}
        {business.name && <p className="text-center text-sm font-semibold text-stone-500 mb-6">{business.name}</p>}
        {children}
      </div>
    </div>
  )

  if (step === "loading") {
    return <Shell><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div></Shell>
  }

  if (step === "error") {
    return <Shell><p className="text-center text-stone-600">{error}</p></Shell>
  }

  return (
    <Shell>
      {error && (
        <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {/* ── Step: rating ── */}
      {step === "rate" && (
        <div className="text-center">
          <h1 className="text-2xl font-bold text-stone-900 mb-6">{t.rateTitle}</h1>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                disabled={busy}
                onClick={() => submitRating(n)}
                className="p-1 transition-transform active:scale-90"
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
              >
                <Star className="h-11 w-11 text-stone-300 hover:text-amber-400 hover:fill-amber-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step: customer input ── */}
      {step === "input" && (
        <div>
          <h2 className="text-xl font-bold text-stone-900 mb-1">{t.whatLiked}</h2>
          <p className="text-sm text-stone-500 mb-4">{t.whatLikedSub}</p>
          <div className="flex flex-wrap gap-2 mb-5">
            {t.tags.map(tag => {
              const active = tags.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTags(active ? tags.filter(t => t !== tag) : [...tags, tag])}
                  className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-stone-200 text-stone-700"
                  }`}
                >
                  {tag}
                </button>
              )
            })}
          </div>
          <p className="text-sm font-semibold text-stone-700 mb-1.5">{t.tellWords}</p>
          <Textarea
            value={freeText}
            onChange={e => setFreeText(e.target.value.slice(0, 600))}
            placeholder={t.placeholderText}
            rows={3}
            className="mb-5 bg-white"
          />
          <Button onClick={submitInput} disabled={busy} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : t.continueBtn}
          </Button>
        </div>
      )}

      {/* ── Step: AI generating ── */}
      {step === "generating" && (
        <div className="text-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-stone-600">{t.generating}</p>
        </div>
      )}

      {/* ── Step: pick a suggestion ── */}
      {step === "suggestions" && (
        <div>
          <h2 className="text-xl font-bold text-stone-900 mb-1">{t.chooseReview}</h2>
          <p className="text-sm text-stone-500 mb-4">{t.chooseReviewSub}</p>
          {suggestions.length === 0 && (
            <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4">
              <Textarea value={finalText} onChange={e => setFinalText(e.target.value)} rows={4} className="mb-3" />
              <Button onClick={() => setStep("confirm")} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700">{t.continueBtn}</Button>
            </div>
          )}
          <div className="space-y-3">
            {suggestions.map(s => (
              <div key={s.id} className="rounded-xl border border-stone-200 bg-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs">{t.styleLabels[s.style] || s.style}</Badge>
                  <span className="text-[11px] text-stone-400">{s.text.length} chars</span>
                </div>
                <p className="text-sm text-stone-800 leading-relaxed mb-3">{s.text}</p>
                <Button
                  onClick={() => selectSuggestion(s)}
                  disabled={busy}
                  variant="outline"
                  className="w-full h-10 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                >
                  {t.selectThis}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Step: confirm ── */}
      {step === "confirm" && (
        <div>
          <h2 className="text-xl font-bold text-stone-900 mb-1">{t.readyTitle}</h2>
          <div className="flex gap-1 mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-5 w-5 ${i < rating ? "text-amber-400 fill-amber-400" : "text-stone-200"}`} />
            ))}
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-4 mb-4">
            {editing ? (
              <>
                <Textarea value={finalText} onChange={e => setFinalText(e.target.value.slice(0, 2000))} rows={5} className="mb-3" />
                <div className="flex gap-2">
                  <Button onClick={saveEdit} disabled={busy} className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700">{t.saveChanges}</Button>
                  <Button onClick={() => setEditing(false)} variant="outline" className="flex-1 h-10">{t.cancelBtn}</Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-stone-800 leading-relaxed">{finalText}</p>
            )}
          </div>
          {!editing && (
            <div className="space-y-2">
              <Button onClick={confirmAndPost} disabled={busy} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base">
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : t.postGoogle}
              </Button>
              <div className="flex gap-2">
                <Button onClick={() => setEditing(true)} variant="outline" className="flex-1 h-10">
                  <Pencil className="h-4 w-4 mr-1.5" /> {t.editBtn}
                </Button>
                <Button onClick={() => setStep("suggestions")} variant="outline" className="flex-1 h-10">
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> {t.chooseAnother}
                </Button>
              </div>
              {/* Private feedback option */}
              {rating < ratingThreshold && (
                <button
                  type="button"
                  onClick={() => setStep("private-feedback")}
                  className="w-full text-center text-xs text-stone-500 underline pt-1"
                >
                  {t.privatePrompt}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Step: sent to Google ── */}
      {step === "google-sent" && (
        <div className="text-center py-10">
          <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-stone-900 mb-2">{t.almostDone}</h2>
          <p className="text-stone-600 text-sm mb-2">
            {t.almostDoneSub}
          </p>
          {copied && (
            <p className="text-emerald-700 font-medium text-xs mb-5">{t.copiedNotice}</p>
          )}
          {googleUrl && (
            <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-700 text-sm font-semibold underline block">
              {t.openGoogleAgain}
            </a>
          )}
        </div>
      )}

      {/* ── Step: private feedback ── */}
      {step === "private-feedback" && (
        <div>
          <button type="button" onClick={() => setStep("confirm")} className="text-xs text-stone-400 mb-3 flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> {t.cancelBtn}
          </button>
          <h2 className="text-xl font-bold text-stone-900 mb-1">{t.privateTitle}</h2>
          <p className="text-sm text-stone-500 mb-4">{t.privateSub}</p>
          <Textarea
            value={pfText}
            onChange={e => setPfText(e.target.value.slice(0, 2000))}
            placeholder={t.privatePlaceholder}
            rows={4}
            className="mb-3 bg-white"
          />
          <input
            value={pfPhone}
            onChange={e => setPfPhone(e.target.value)}
            placeholder={t.phonePlaceholder}
            className="w-full h-11 rounded-lg border border-stone-200 bg-white px-3 text-sm mb-3"
          />
          <label className="flex items-center gap-2 text-sm text-stone-600 mb-5">
            <input type="checkbox" checked={pfCallback} onChange={e => setPfCallback(e.target.checked)} className="h-4 w-4" />
            {t.callbackCheckbox}
          </label>
          <Button onClick={submitPrivateFeedback} disabled={busy || !pfText.trim()} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : t.submitFeedback}
          </Button>
        </div>
      )}

      {step === "private-sent" && (
        <div className="text-center py-10">
          <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-stone-900 mb-2">{t.thankYou}</h2>
          <p className="text-stone-600 text-sm">{t.thankYouSub}</p>
        </div>
      )}
    </Shell>
  )
}
