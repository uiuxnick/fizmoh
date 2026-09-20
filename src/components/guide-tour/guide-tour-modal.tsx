"use client"

import React, { useState, useMemo } from "react"
import { useTourStore } from "@/lib/tour-store"
import { MENU_GUIDE_ITEMS, getAllTours, getTourById } from "@/lib/guide-tour-data"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Compass, Search, Play, CheckCircle2, Sparkles,
  Layers, ArrowRight, BookOpen, RotateCcw, ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function GuideTourModal() {
  const { isExplorerOpen, setExplorerOpen, startTour, completedTours, resetCompletedTours } = useTourStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL")

  const groups = useMemo(() => {
    const set = new Set<string>()
    MENU_GUIDE_ITEMS.forEach(item => set.add(item.group))
    return ["ALL", ...Array.from(set)]
  }, [])

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return MENU_GUIDE_ITEMS.filter(item => {
      const matchGroup = selectedGroup === "ALL" || item.group === selectedGroup
      if (!matchGroup) return false

      if (!q) return true

      const inLabel = item.label.toLowerCase().includes(q)
      const inDesc = item.description.toLowerCase().includes(q)
      const inGroup = item.group.toLowerCase().includes(q)
      const inSubmenus = item.submenus?.some(
        s => s.label.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
      )

      return inLabel || inDesc || inGroup || inSubmenus
    })
  }, [searchQuery, selectedGroup])

  const totalCompleted = completedTours.length
  const totalTours = getAllTours().length

  return (
    <Dialog open={isExplorerOpen} onOpenChange={setExplorerOpen}>
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden bg-white rounded-2xl border-stone-200">
        {/* Modal Header */}
        <DialogHeader className="p-5 pb-4 border-b border-stone-100 bg-gradient-to-r from-stone-50 via-white to-emerald-50/40 shrink-0">
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-950/20">
                <Compass className="h-4 w-4" />
              </div>
              <DialogTitle className="text-lg font-bold text-stone-900">
                Guide & Feature Tours
              </DialogTitle>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                {totalCompleted} of {totalTours} Explored
              </span>
              {totalCompleted > 0 && (
                <button
                  type="button"
                  onClick={resetCompletedTours}
                  title="Reset tour history"
                  className="text-stone-400 hover:text-stone-600 p-1 rounded transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <DialogDescription className="text-xs text-stone-500">
            Interactive step-by-step walkthroughs for every menu, submenu, and feature in your workspace.
          </DialogDescription>

          {/* Quick Start Navigation Banner */}
          <div className="mt-3.5 p-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between gap-3 shadow-md shadow-emerald-950/20">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-200" />
                <h4 className="text-xs font-bold leading-tight">First time here? Take the Full Navigation Tour</h4>
              </div>
              <p className="text-[11px] text-emerald-100 mt-0.5 leading-snug">
                Step-by-step interactive walkthrough spotlighting all menus, submenus, and header controls.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setExplorerOpen(false)
                startTour("tour-navigation")
              }}
              className="shrink-0 h-8 px-3 text-xs font-bold bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl shadow-xs"
            >
              Start Tour <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search any menu, submenu, or feature (e.g. Kitchen KDS, QR codes, Inbox, Broadcast)..."
              className="pl-8 h-9 text-xs rounded-xl bg-white border-stone-200 focus-visible:ring-emerald-500"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 pb-0.5 scrollbar-none text-xs">
            {groups.map(grp => (
              <button
                key={grp}
                type="button"
                onClick={() => setSelectedGroup(grp)}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-semibold text-[11px] transition shrink-0",
                  selectedGroup === grp
                    ? "bg-stone-900 text-white shadow-2xs"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900",
                )}
              >
                {grp === "ALL" ? "All Features" : grp}
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Directory List Area */}
        <ScrollArea className="flex-1 p-5 max-h-[50vh] overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="h-6 w-6 text-stone-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-stone-700">No matching tours found</p>
              <p className="text-[11px] text-stone-400 mt-0.5">Try searching with a different keyword or select &apos;All Features&apos;.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map(item => {
                const tour = getTourById(item.tourId)
                const isCompleted = completedTours.includes(item.tourId)

                return (
                  <div
                    key={item.key}
                    className={cn(
                      "p-3.5 rounded-xl border transition-all hover:border-stone-300",
                      isCompleted ? "bg-stone-50/70 border-stone-200" : "bg-white border-stone-200 shadow-2xs",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-stone-900">{item.label}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 border border-stone-200">
                            {item.group}
                          </span>
                          {isCompleted && (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded flex items-center gap-1">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Explored
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant={isCompleted ? "outline" : "default"}
                        onClick={() => {
                          setExplorerOpen(false)
                          startTour(item.tourId)
                        }}
                        className={cn(
                          "shrink-0 h-7 px-2.5 text-[11px] font-bold rounded-lg transition",
                          isCompleted
                            ? "border-stone-200 text-stone-700 hover:bg-stone-100"
                            : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs",
                        )}
                      >
                        <Play className="h-2.5 w-2.5 mr-1 fill-current" />
                        {isCompleted ? "Replay Tour" : "Start Tour"}
                      </Button>
                    </div>

                    {/* Submenus section if present */}
                    {item.submenus && item.submenus.length > 0 && (
                      <div className="mt-2.5 pt-2.5 border-t border-stone-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
                          Submenus ({item.submenus.length})
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {item.submenus.map(sub => (
                            <button
                              key={sub.key}
                              type="button"
                              onClick={() => {
                                setExplorerOpen(false)
                                // If submenu has specific tour, start it, otherwise start parent tour
                                startTour(sub.tourId || item.tourId)
                              }}
                              className="text-left p-2 rounded-lg bg-stone-50 hover:bg-emerald-50/80 border border-stone-100 hover:border-emerald-200 transition group flex items-start justify-between gap-1.5"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-semibold text-stone-800 group-hover:text-emerald-800">
                                    {sub.label}
                                  </span>
                                  {sub.badge && (
                                    <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-emerald-100 text-emerald-800">
                                      {sub.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-stone-500 line-clamp-1 mt-0.5">
                                  {sub.description}
                                </p>
                              </div>
                              <ChevronRight className="h-3 w-3 text-stone-400 group-hover:text-emerald-600 shrink-0 mt-0.5" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* Modal Footer */}
        <div className="p-3 px-5 border-t border-stone-100 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
          <span>
            💡 Pro tip: Look for the <span className="font-semibold text-stone-700">🧭 Tour</span> button in any header to tour the active page directly.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExplorerOpen(false)}
            className="h-7 px-3 text-xs rounded-lg"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
