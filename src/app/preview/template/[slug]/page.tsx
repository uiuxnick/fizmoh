"use client"

import { notFound } from "next/navigation"
import { BotTemplateVisualDemo } from "@/components/views/bot-template-visual-demo"
import { BOT_TEMPLATES } from "@/lib/bot-templates"
import { useState } from "react"
import { ArrowRight, Sparkles } from "lucide-react"

interface Props {
  params: { slug: string }
}

export default function TemplatePreviewPage({ params }: Props) {
  const template = BOT_TEMPLATES.find(t => t.id === params.slug)
  if (!template) notFound()

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-950 flex flex-col">
      {/* Header */}
      <header className="w-full flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-white tracking-tight">fizmoh</span>
          <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold">BETA</span>
        </div>
        <a
          href={`/signup?template=${template.id}`}
          className="flex items-center gap-2 px-4 py-2 bg-[#00E785] hover:bg-[#00B96A] text-stone-950 font-bold rounded-xl text-sm transition"
        >
          <Sparkles className="h-4 w-4" />
          Start Free Trial
          <ArrowRight className="h-4 w-4" />
        </a>
      </header>

      {/* Demo — full height */}
      <div className="flex-1 flex items-center justify-center p-4">
        <DemoWrapper template={template} />
      </div>
    </div>
  )
}

/** Client wrapper so we can pass isOpen=true without hooks issues */
function DemoWrapper({ template }: { template: (typeof BOT_TEMPLATES)[number] }) {
  return (
    <BotTemplateVisualDemo
      template={template}
      isOpen={true}
      onClose={() => {}}
      signupUrl={`/signup?template=${template.id}`}
      allTemplates={BOT_TEMPLATES}
      currentIndex={BOT_TEMPLATES.indexOf(template)}
    />
  )
}
