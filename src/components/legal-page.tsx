import Link from "next/link"
import { SiteFooter, SiteHeader } from "@/components/site-header"

/**
 * Shared shell for public legal pages with vibrant light design tokens.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-white text-[#1D1D1D]">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1D1D1D] tracking-tight">{title}</h1>
        <p className="mt-1.5 text-[12.5px] text-[#717680]">Last updated: {updated}</p>

        <div
          className="mt-8 space-y-5 text-[14px] leading-relaxed text-[#717680]
            [&_h2]:mt-8 [&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:text-[#1D1D1D]
            [&_h3]:mt-6 [&_h3]:text-[15px] [&_h3]:font-bold [&_h3]:text-[#00B96A]
            [&_strong]:text-[#1D1D1D]
            [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5
            [&_a]:text-[#00B96A] [&_a]:underline"
        >
          {children}
        </div>

        <footer className="mt-12 border-t border-[#E5E7EB] pt-6 text-[12px] text-[#717680]">
          <p>
            Fizmoh · Muscat, Sultanate of Oman ·{" "}
            <a href="mailto:support@fizmoh.cloud" className="text-[#1D1D1D] hover:text-[#00B96A] underline">
              support@fizmoh.cloud
            </a>
          </p>
          <p className="mt-2 flex flex-wrap gap-3 text-[#717680]">
            <Link href="/privacy" className="hover:text-[#1D1D1D]">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#1D1D1D]">Terms of Service</Link>
            <Link href="/data-deletion" className="hover:text-[#1D1D1D]">Data Deletion</Link>
            <Link href="/acceptable-use" className="hover:text-[#1D1D1D]">Acceptable Use</Link>
            <Link href="/cookies" className="hover:text-[#1D1D1D]">Cookies</Link>
            <Link href="/whats-new" className="hover:text-[#1D1D1D]">What&rsquo;s New</Link>
          </p>
        </footer>
      </div>
      <SiteFooter />
    </main>
  )
}
