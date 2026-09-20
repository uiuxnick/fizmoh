import { create } from "zustand"
import { persist } from "zustand/middleware"
import { getTourById, type TourDefinition } from "@/lib/guide-tour-data"

interface TourState {
  activeTourId: string | null
  currentStepIndex: number
  isTourActive: boolean
  isExplorerOpen: boolean
  completedTours: string[]

  startTour: (tourId: string, initialStep?: number) => void
  nextStep: () => void
  prevStep: () => void
  endTour: () => void
  setExplorerOpen: (open: boolean) => void
  markTourCompleted: (tourId: string) => void
  resetCompletedTours: () => void
  getActiveTour: () => TourDefinition | null
}

export const useTourStore = create<TourState>()(
  persist(
    (set, get) => ({
      activeTourId: null,
      currentStepIndex: 0,
      isTourActive: false,
      isExplorerOpen: false,
      completedTours: [],

      startTour: (tourId: string, initialStep = 0) => {
        const tour = getTourById(tourId)
        if (!tour || tour.steps.length === 0) return
        set({
          activeTourId: tourId,
          currentStepIndex: Math.min(Math.max(0, initialStep), tour.steps.length - 1),
          isTourActive: true,
          isExplorerOpen: false,
        })
      },

      nextStep: () => {
        const { activeTourId, currentStepIndex, markTourCompleted } = get()
        if (!activeTourId) return
        const tour = getTourById(activeTourId)
        if (!tour) return

        if (currentStepIndex < tour.steps.length - 1) {
          set({ currentStepIndex: currentStepIndex + 1 })
        } else {
          // Completed
          markTourCompleted(activeTourId)
          set({ isTourActive: false, activeTourId: null, currentStepIndex: 0 })
        }
      },

      prevStep: () => {
        const { currentStepIndex } = get()
        if (currentStepIndex > 0) {
          set({ currentStepIndex: currentStepIndex - 1 })
        }
      },

      endTour: () => {
        const { activeTourId, markTourCompleted } = get()
        if (activeTourId) {
          markTourCompleted(activeTourId)
        }
        set({
          isTourActive: false,
          activeTourId: null,
          currentStepIndex: 0,
        })
      },

      setExplorerOpen: (isExplorerOpen: boolean) => {
        set({ isExplorerOpen })
      },

      markTourCompleted: (tourId: string) => {
        set((state) => {
          if (state.completedTours.includes(tourId)) return state
          return { completedTours: [...state.completedTours, tourId] }
        })
      },

      resetCompletedTours: () => {
        set({ completedTours: [] })
      },

      getActiveTour: () => {
        const { activeTourId } = get()
        return activeTourId ? (getTourById(activeTourId) ?? null) : null
      },
    }),
    {
      name: "oman-adventures-tour-storage",
      partialize: (state) => ({
        completedTours: state.completedTours,
      }),
    }
  )
)
