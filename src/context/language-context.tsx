"use client"

import React, { createContext, useContext, useEffect, useState, useTransition } from "react"
import { TRANSLATIONS, type Language } from "@/lib/translations"

interface LanguageContextType {
  lang: Language
  setLang: (lang: Language) => void
  toggleLang: () => void
  isAr: boolean
  dir: "ltr" | "rtl"
  t: (key: keyof typeof TRANSLATIONS.en) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const STORAGE_KEY = "fizmoh_preferred_lang"

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en")
  const [mounted, setMounted] = useState(false)
  const [, startTransition] = useTransition()

  useEffect(() => {
    // Check initial localStorage or navigator / URL param
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Language | null
      const urlParams = new URLSearchParams(window.location.search)
      const urlLang = urlParams.get("lang") as Language | null

      if (urlLang === "ar" || urlLang === "en") {
        setLangState(urlLang)
        applyDirection(urlLang)
      } else if (stored === "ar" || stored === "en") {
        setLangState(stored)
        applyDirection(stored)
      } else {
        // Fallback default English
        applyDirection("en")
      }
    } catch {
      applyDirection("en")
    }
    setMounted(true)
  }, [])

  const applyDirection = (selectedLang: Language) => {
    if (typeof document !== "undefined") {
      const dir = selectedLang === "ar" ? "rtl" : "ltr"
      document.documentElement.setAttribute("dir", dir)
      document.documentElement.setAttribute("lang", selectedLang)
      if (selectedLang === "ar") {
        document.documentElement.classList.add("rtl")
        document.documentElement.classList.remove("ltr")
      } else {
        document.documentElement.classList.add("ltr")
        document.documentElement.classList.remove("rtl")
      }
    }
  }

  const setLang = (newLang: Language) => {
    startTransition(() => {
      setLangState(newLang)
      applyDirection(newLang)
      try {
        localStorage.setItem(STORAGE_KEY, newLang)
        document.cookie = `${STORAGE_KEY}=${newLang};path=/;max-age=31536000;SameSite=Lax`
      } catch {}
    })
  }

  const toggleLang = () => {
    const nextLang: Language = lang === "ar" ? "en" : "ar"
    setLang(nextLang)
  }

  const isAr = lang === "ar"
  const dir = isAr ? "rtl" : "ltr"

  const t = (key: keyof typeof TRANSLATIONS.en): string => {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en
    return (dict as any)[key] || TRANSLATIONS.en[key] || String(key)
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, isAr, dir, t }}>
      <div dir={dir} className={isAr ? "font-sans rtl" : "font-sans ltr"}>
        {children}
      </div>
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    // Fallback if rendered outside provider
    return {
      lang: "en" as Language,
      setLang: () => {},
      toggleLang: () => {},
      isAr: false,
      dir: "ltr" as const,
      t: (key: keyof typeof TRANSLATIONS.en) => TRANSLATIONS.en[key] || String(key),
    }
  }
  return context
}
