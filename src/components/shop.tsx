"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Clock, MapPin, Star, Loader2 } from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"

/**
 * A business's own storefront, at app.fizmoh.cloud/their-address.
 *
 * Deliberately theirs and not ours: their name at the top, their catalogue,
 * and one line at the bottom saying what it runs on. A shop that shouts the
 * platform's name louder than the shopkeeper's is a shop nobody wants to send
 * their customers to.
 */

interface Product {
  id: string
  slug: string
  name: string
  description: string
  media: { type?: string; url?: string }[] | null
  basePrice: number
  childPrice: number | null
  currency: string
  durationHours: number
  city: string
  category: string
  featured: boolean
  rating: number
  reviewCount: number
}

interface ShopInfo {
  name: string
  slug: string
  logoUrl?: string | null
  currency?: string
  closed: boolean
  seo?: {
    googleVerification?: string | null
    ga4Id?: string | null
    googleAdsId?: string | null
    googleAdsLabel?: string | null
    metaPixelId?: string | null
    linkedinPartnerId?: string | null
    tiktokPixelId?: string | null
    headCode?: string | null
    bodyCode?: string | null
    footerCode?: string | null
  }
}

export default function Shop({ slug }: { slug: string }) {
  const [shop, setShop] = useState<ShopInfo | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/shop/${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(d => { setShop(d.shop ?? null); setProducts(d.products ?? []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    if (!shop?.seo) return
    const added: Node[] = []
    const add = (node: Node, parent: Node = document.head) => { parent.appendChild(node); added.push(node) }
    const script = (src?: string, text?: string) => {
      const node = document.createElement("script")
      if (src) { node.src = src; node.async = true }
      if (text) node.text = text
      add(node)
    }
    const mountSnippet = (code: string | null | undefined, target: HTMLElement | null) => {
      if (!code || !target) return
      const template = document.createElement("template")
      template.innerHTML = code
      template.content.childNodes.forEach(original => {
        if (original.nodeName.toLowerCase() === "script") {
          const source = original as HTMLScriptElement
          const node = document.createElement("script")
          Array.from(source.attributes).forEach(attribute => node.setAttribute(attribute.name, attribute.value))
          node.text = source.text
          add(node, target)
        } else {
          add(original.cloneNode(true), target)
        }
      })
    }

    const seo = shop.seo
    if (seo.googleVerification && /^[a-zA-Z0-9_-]{8,200}$/.test(seo.googleVerification)) {
      const meta = document.createElement("meta")
      meta.name = "google-site-verification"
      meta.content = seo.googleVerification
      add(meta)
    }
    if (seo.ga4Id && /^G-[A-Z0-9]+$/i.test(seo.ga4Id)) {
      script(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(seo.ga4Id)}`)
      script(undefined, `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${seo.ga4Id}')`)
    }
    if (seo.googleAdsId && /^AW-[0-9]+$/i.test(seo.googleAdsId)) {
      script(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(seo.googleAdsId)}`)
      script(undefined, `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${seo.googleAdsId}')`)
      if (seo.googleAdsLabel && /^[A-Za-z0-9_-]{3,200}$/.test(seo.googleAdsLabel)) script(undefined, `gtag('event','conversion',{'send_to':'${seo.googleAdsId}/${seo.googleAdsLabel}'})`)
    }
    if (seo.metaPixelId && /^\d{5,20}$/.test(seo.metaPixelId)) {
      script(undefined, `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${seo.metaPixelId}');fbq('track','PageView');`)
    }
    if (seo.linkedinPartnerId && /^\d{3,20}$/.test(seo.linkedinPartnerId)) script(undefined, `_linkedin_partner_id = '${seo.linkedinPartnerId}'; window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || []; window._linkedin_data_partner_ids.push(_linkedin_partner_id);`)
    if (seo.tiktokPixelId && /^[A-Za-z0-9_-]{6,80}$/.test(seo.tiktokPixelId)) script(undefined, `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=['page'];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load='${seo.tiktokPixelId}';ttq.page()}(window,document,'ttq');`)
    mountSnippet(seo.headCode, document.head as HTMLElement)
    mountSnippet(seo.bodyCode, document.getElementById("fizmoh-custom-body-code"))
    mountSnippet(seo.footerCode, document.getElementById("fizmoh-custom-footer-code"))
    return () => added.forEach(node => node.parentNode?.removeChild(node))
  }, [shop])

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
  }

  if (!shop) {
    return (
      <div className="min-h-screen grid place-items-center px-4 text-center">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Shop not found</h1>
          <p className="mt-1 text-sm text-stone-600">Check the address and try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-stone-100">
        <div className="mx-auto max-w-5xl px-5 h-16 flex items-center gap-3">
          {shop.logoUrl
            ? <img src={shop.logoUrl} alt="" className="h-9 w-9 rounded-xl object-cover" />
            : <div className="h-9 w-9 rounded-xl bg-emerald-600 grid place-items-center text-white font-bold">
                {shop.name.charAt(0)}
              </div>}
          <span className="font-bold text-lg text-stone-900">{shop.name}</span>
        </div>
      </header>
      <div id="fizmoh-custom-body-code" aria-hidden="true" />

      {shop.closed ? (
        <div className="mx-auto max-w-xl px-5 py-24 text-center">
          <h1 className="text-xl font-bold text-stone-900">Temporarily closed</h1>
          <p className="mt-2 text-sm text-stone-600">
            {shop.name} is not taking bookings at the moment. Please check back shortly.
          </p>
        </div>
      ) : (
        <>
          <section className="mx-auto max-w-5xl px-5 pt-12 pb-8">
            <h1 className="text-3xl font-bold text-stone-900">Book with {shop.name}</h1>
            <p className="mt-2 text-stone-600">
              {products.length > 0
                ? "Pick what you want, and finish the booking on WhatsApp."
                : "Nothing is listed here yet."}
            </p>
          </section>

          <section className="mx-auto max-w-5xl px-5 pb-20">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map(product => {
                const image = Array.isArray(product.media)
                  ? product.media.find(m => m?.url)?.url
                  : undefined
                return (
                  <article key={product.id} className="rounded-2xl border border-stone-200 overflow-hidden flex flex-col">
                    <div className="aspect-[4/3] bg-stone-100">
                      {image && <img src={image} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="font-semibold text-stone-900 leading-tight">{product.name}</h2>
                        {product.reviewCount > 0 && (
                          <span className="flex items-center gap-1 text-xs text-stone-600 shrink-0">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {product.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm text-stone-600 line-clamp-2">{product.description}</p>
                      <div className="mt-3 flex items-center gap-3 text-xs text-stone-500">
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{product.city}</span>
                        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{product.durationHours}h</span>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="font-bold text-stone-900">
                          {product.basePrice.toFixed(3)} {product.currency}
                        </span>
                        <a href={`/booking/new?tour=${product.slug}&workspace=${shop.slug}`}>
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">Book</Button>
                        </a>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        </>
      )}

      <div id="fizmoh-custom-footer-code" aria-hidden="true" />
      <footer className="border-t border-stone-100">
        <div className="mx-auto max-w-5xl px-5 py-6 flex items-center justify-between text-xs text-stone-500">
          <span>© {new Date().getFullYear()} {shop.name}</span>
          <a href="/" className="inline-flex items-center gap-1.5 hover:text-stone-700">
            <WhatsAppIcon className="h-4 w-4" /> Powered by Fizmoh
          </a>
        </div>
      </footer>
    </div>
  )
}
