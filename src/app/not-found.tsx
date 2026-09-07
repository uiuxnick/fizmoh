import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SiteHeader, SiteFooter } from "@/components/site-header"
import {
  Compass, ArrowRight, LayoutDashboard, Building2,
  CalendarClock, Workflow, Globe,
} from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      <SiteHeader />

      <main className="max-w-3xl mx-auto px-5 py-16 text-center space-y-6">
        <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
          <Compass className="h-8 w-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Page Not Found</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
            Looking for something on FizMoh?
          </h1>
          <p className="text-stone-600 text-sm max-w-md mx-auto">
            The page you requested doesn&apos;t exist or has moved. Explore our main modules and tools below:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left pt-2">
          <Link
            href="/admin"
            className="p-4 rounded-xl border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex items-center gap-3"
          >
            <div className="p-2 bg-emerald-100/60 text-emerald-700 rounded-lg">
              <LayoutDashboard className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold text-stone-900 text-xs">Admin Dashboard</div>
              <div className="text-[11px] text-stone-500">Manage chats, CRM &amp; analytics</div>
            </div>
          </Link>

          <Link
            href="/hospital"
            className="p-4 rounded-xl border border-stone-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-center gap-3"
          >
            <div className="p-2 bg-blue-100/60 text-blue-700 rounded-lg">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold text-stone-900 text-xs">Kauvery Hospital</div>
              <div className="text-[11px] text-stone-500">30-Bed Day Care &amp; Doctors</div>
            </div>
          </Link>

          <Link
            href="/appointments"
            className="p-4 rounded-xl border border-stone-200 hover:border-purple-300 hover:bg-purple-50/30 transition-all flex items-center gap-3"
          >
            <div className="p-2 bg-purple-100/60 text-purple-700 rounded-lg">
              <CalendarClock className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold text-stone-900 text-xs">Digital Appointments</div>
              <div className="text-[11px] text-stone-500">Google Meet strategy sessions</div>
            </div>
          </Link>

          <Link
            href="/bot-builder"
            className="p-4 rounded-xl border border-stone-200 hover:border-teal-300 hover:bg-teal-50/30 transition-all flex items-center gap-3"
          >
            <div className="p-2 bg-teal-100/60 text-teal-700 rounded-lg">
              <Workflow className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold text-stone-900 text-xs">Bot &amp; Automation</div>
              <div className="text-[11px] text-stone-500">25+ WhatsApp flow templates</div>
            </div>
          </Link>
        </div>

        <div className="pt-4">
          <Link href="/">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-6">
              Return to Homepage <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
