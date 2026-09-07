"use client"

import { Check, ExternalLink, Phone, Reply } from "lucide-react"

/**
 * WhatsApp message bubble preview.
 *
 * Renders a template the way the customer will actually see it, including
 * WhatsApp's own markdown (*bold*, _italic_, ~strike~, ```mono```) and the
 * button styling — so the operator can catch layout problems before Meta
 * review rather than after a rejection.
 */

export type PreviewButton = { type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER"; text: string; url?: string; phone?: string }

export type PreviewProps = {
  headerType?: string
  headerContent?: string
  bodyContent: string
  footerContent?: string
  buttons?: PreviewButton[]
  /** Values substituted for {{1}}, {{2}}… so the operator sees a realistic message. */
  sampleValues?: string[]
}

/** WhatsApp text formatting → HTML. Escapes first so template text can't inject markup. */
function formatWhatsAppText(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

  return escaped
    .replace(/```([\s\S]+?)```/g, '<code class="bg-black/5 px-1 rounded text-[11px]">$1</code>')
    .replace(/(^|\W)\*(\S[^*]*\S|\S)\*(\W|$)/g, "$1<strong>$2</strong>$3")
    .replace(/(^|\W)_(\S[^_]*\S|\S)_(\W|$)/g, "$1<em>$2</em>$3")
    .replace(/(^|\W)~(\S[^~]*\S|\S)~(\W|$)/g, "$1<del>$2</del>$3")
    .replace(/\n/g, "<br/>")
}

function substitute(text: string, values: string[] = []): string {
  return text.replace(/\{\{(\d+)\}\}/g, (match, index) => {
    const value = values[Number(index) - 1]
    return value && value.trim() ? value : match
  })
}

const HEADER_MEDIA_LABEL: Record<string, string> = {
  IMAGE: "🖼️  Image header",
  VIDEO: "🎬  Video header",
  DOCUMENT: "📄  Document header",
}

export function WhatsAppPreview({
  headerType,
  headerContent,
  bodyContent,
  footerContent,
  buttons = [],
  sampleValues = [],
}: PreviewProps) {
  const body = substitute(bodyContent || "Your message will appear here…", sampleValues)
  const header = headerType === "TEXT" ? substitute(headerContent || "", sampleValues) : ""
  const mediaLabel = headerType && headerType !== "NONE" && headerType !== "TEXT" ? HEADER_MEDIA_LABEL[headerType] : null

  return (
    <div className="rounded-2xl border border-stone-200 bg-[#e5ddd5] p-4 overflow-hidden">
      <div className="mx-auto max-w-[320px]">
        <div className="rounded-lg rounded-tl-none bg-white shadow-sm overflow-hidden">
          {mediaLabel && (
            <div className="flex h-28 items-center justify-center bg-stone-100 text-xs text-stone-500 border-b">
              {mediaLabel}
            </div>
          )}

            <div className="px-2.5 py-2 space-y-1 max-h-[min(62vh,560px)] overflow-y-auto overscroll-contain">
            {header && (
              <div
                className="text-[13px] font-bold text-stone-900 leading-snug"
                dangerouslySetInnerHTML={{ __html: formatWhatsAppText(header) }}
              />
            )}

            <div
              className="text-[13px] text-stone-800 leading-snug whitespace-pre-wrap break-words"
              dangerouslySetInnerHTML={{ __html: formatWhatsAppText(body) }}
            />

            {footerContent && (
              <div className="text-[11px] text-stone-400 pt-0.5">{footerContent}</div>
            )}

            <div className="flex items-center justify-end gap-1 pt-0.5">
              <span className="text-[10px] text-stone-400">
                {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <Check className="h-3 w-3 text-sky-500" />
              <Check className="-ml-2 h-3 w-3 text-sky-500" />
            </div>
          </div>

          {buttons.length > 0 && (
            <div className="border-t border-stone-100">
              {buttons.slice(0, 3).map((button, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center gap-1.5 border-b border-stone-100 py-2 text-[13px] font-medium text-sky-600 last:border-0"
                >
                  {button.type === "URL" && <ExternalLink className="h-3.5 w-3.5" />}
                  {button.type === "PHONE_NUMBER" && <Phone className="h-3.5 w-3.5" />}
                  {button.type === "QUICK_REPLY" && <Reply className="h-3.5 w-3.5" />}
                  {button.text || "Button"}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="mt-2 text-center text-[10px] text-stone-500">
          Preview only — Meta renders the final message
        </p>
      </div>
    </div>
  )
}
