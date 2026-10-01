"use client"

import React, { useEffect, useState } from "react"
import { useApp } from "@/lib/store"
import { MODULE_BY_KEY, type Module } from "@/lib/module-registry"
import ModuleAccessDenied from "@/components/module-access-denied"
import { Skeleton } from "@/components/ui/skeleton"

interface ModuleGateProps {
  module: Module
  children: React.ReactNode
  label?: string
}

export function ModuleGate({ module, children, label }: ModuleGateProps) {
  const { setView } = useApp()
  const [features, setFeatures] = useState<Record<string, boolean> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const checkFeatures = async () => {
      try {
        const res = await fetch(`/api/features?_t=${Date.now()}`)
        if (res.ok) {
          const data = await res.json()
          if (mounted) setFeatures(data)
        }
      } catch {
        // network error
      } finally {
        if (mounted) setLoading(false)
      }
    }
    checkFeatures()

    const handleUpdate = () => checkFeatures()
    window.addEventListener("fizmoh:features-updated", handleUpdate)
    return () => {
      mounted = false
      window.removeEventListener("fizmoh:features-updated", handleUpdate)
    }
  }, [])

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  // Platform admin exception
  if (features?.platform === true) {
    return <>{children}</>
  }

  const featureKey = module.toLowerCase().replace(/_/g, "")
  // Map module keys to feature property names returned by /api/features
  const isAllowed = Boolean(
    features?.[featureKey] ||
    features?.[module.toLowerCase()] ||
    (module === "TOURS" && features?.tours) ||
    (module === "HOSPITAL" && features?.hospital) ||
    (module === "RESTAURANT" && features?.restaurant) ||
    (module === "TRAINING" && features?.training) ||
    (module === "CORPORATE" && features?.corporate) ||
    (module === "WOOCOMMERCE" && features?.woocommerce) ||
    (module === "CATALOG" && features?.catalog) ||
    (module === "VISA" && features?.visa) ||
    (module === "APPOINTMENTS" && features?.appointments) ||
    (module === "BROADCAST" && features?.broadcast) ||
    (module === "CUSTOMER_SITE" && (features?.customer_site ?? features?.website)) ||
    (module === "WEBSITE" && (features?.website_builder ?? features?.website)) ||
    (module === "INTEGRATION" && features?.integration) ||
    (module === "WHITE_LABEL" && features?.white_label)
  )

  if (!isAllowed) {
    const modInfo = MODULE_BY_KEY[module]
    return (
      <ModuleAccessDenied
        moduleName={label || modInfo?.label || module}
        moduleKey={module}
        onBackToDashboard={() => setView("dashboard")}
      />
    )
  }

  return <>{children}</>
}
