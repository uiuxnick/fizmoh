import { Metadata } from "next"
import { notFound } from "next/navigation"
import { verifyCertificateById } from "@/lib/training-service"
import { Award, CheckCircle2, ShieldCheck, Calendar, Clock, User, Download, Printer } from "lucide-react"

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const cert = await verifyCertificateById(id)
  if (!cert) {
    return { title: "Certificate Verification | Fizmoh" }
  }
  return {
    title: `Verified Credential: ${cert.recipientName} - ${cert.courseName}`,
    description: `Official digital credential verified online for ${cert.recipientName}, issued by ${cert.trainerCompany}.`,
  }
}

export default async function CertificateVerificationPage({ params }: PageProps) {
  const { id } = await params
  const certificate = await verifyCertificateById(id)

  if (!certificate) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-stone-100 py-12 px-4 flex flex-col items-center justify-center font-sans">
      {/* Verification Card */}
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
        {/* Top Verified Header Bar */}
        <div className="bg-emerald-600 text-white p-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-200" />
            <span className="text-xs font-bold tracking-wider uppercase">
              Official Verified Credential
            </span>
          </div>
          <span className="text-xs font-mono bg-emerald-700/60 px-2 py-0.5 rounded text-emerald-100">
            {certificate.id}
          </span>
        </div>

        {/* Certificate Body Container */}
        <div className="p-8 sm:p-12 text-center space-y-6 relative border-b border-stone-200">
          <div className="absolute top-6 left-6 hidden sm:block">
            <div className="text-[10px] text-stone-400 font-mono">
              HASH: {certificate.verificationHash}
            </div>
          </div>

          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-amber-50 border-2 border-amber-300 text-amber-700 flex items-center justify-center shadow-inner">
              <Award className="h-9 w-9" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-widest text-amber-700">
              {certificate.trainerCompany || "Tanfidh Management Consultants"}
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-black text-stone-900 tracking-tight">
              Certificate of Completion
            </h1>
            <p className="text-xs text-stone-500 italic">This is proudly presented to</p>
          </div>

          <div className="py-2">
            <div className="text-2xl sm:text-4xl font-black text-stone-900 underline decoration-amber-400 decoration-2 underline-offset-8">
              {certificate.recipientName}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-stone-600 max-w-xl mx-auto leading-relaxed">
            for successfully completing the rigorous executive requirements, masterclass sessions, and practical strategy modeling for
          </p>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 max-w-xl mx-auto">
            <h3 className="text-base sm:text-lg font-bold text-stone-900">
              {certificate.courseName}
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Program Duration: {certificate.durationHours}
            </p>
          </div>

          {/* Signatures & Seal Grid */}
          <div className="pt-8 grid grid-cols-2 gap-8 max-w-lg mx-auto text-center border-t border-stone-100">
            <div>
              <div className="text-xs font-bold text-stone-800">{certificate.trainerName}</div>
              <div className="text-[10px] text-stone-500">Lead Instructor & Managing Consultant</div>
            </div>
            <div>
              <div className="text-xs font-bold text-stone-800">{certificate.issueDate}</div>
              <div className="text-[10px] text-stone-500">Date of Issuance</div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="p-4 bg-stone-50 px-6 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            <span>Authenticated via Fizmoh Blockchain/Digital Registry</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="javascript:window.print()"
              className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 font-medium flex items-center gap-1"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
