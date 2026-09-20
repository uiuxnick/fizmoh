import { expect, test, describe, beforeEach } from "bun:test"
import {
  TOURS,
  MENU_GUIDE_ITEMS,
  getAllTours,
  getTourById,
  getTourForView,
} from "../src/lib/guide-tour-data"
import { useTourStore } from "../src/lib/tour-store"

describe("Guide Tour Data Registry", () => {
  test("getAllTours returns an array of all registered tours", () => {
    const tours = getAllTours()
    expect(tours.length).toBeGreaterThanOrEqual(15)
    expect(tours.some(t => t.id === "tour-navigation")).toBe(true)
    expect(tours.some(t => t.id === "tour-dashboard")).toBe(true)
    expect(tours.some(t => t.id === "tour-restaurant")).toBe(true)
    expect(tours.some(t => t.id === "tour-rest-overview")).toBe(true)
    expect(tours.some(t => t.id === "tour-inbox")).toBe(true)
    expect(tours.some(t => t.id === "tour-bot-builder")).toBe(true)
    expect(tours.some(t => t.id === "tour-campaigns")).toBe(true)
    expect(tours.some(t => t.id === "tour-ai-assistant")).toBe(true)
  })

  test("every tour in TOURS is properly structured with steps", () => {
    for (const [id, tour] of Object.entries(TOURS)) {
      expect(tour.id).toBe(id)
      expect(tour.title.length).toBeGreaterThan(0)
      expect(tour.subtitle.length).toBeGreaterThan(0)
      expect(tour.category.length).toBeGreaterThan(0)
      expect(tour.steps.length).toBeGreaterThanOrEqual(1)

      for (const step of tour.steps) {
        expect(step.target.length).toBeGreaterThan(0)
        expect(step.title.length).toBeGreaterThan(0)
        expect(step.description.length).toBeGreaterThan(0)
        expect(["top", "bottom", "left", "right"]).toContain(step.placement)
      }
    }
  })

  test("MENU_GUIDE_ITEMS covers all main navigation groups and items", () => {
    expect(MENU_GUIDE_ITEMS.length).toBeGreaterThanOrEqual(10)

    const menuKeys = MENU_GUIDE_ITEMS.map(item => item.key)
    expect(menuKeys).toContain("dashboard")
    expect(menuKeys).toContain("tours")
    expect(menuKeys).toContain("inbox")
    expect(menuKeys).toContain("restaurant")
    expect(menuKeys).toContain("bot-builder")
    expect(menuKeys).toContain("campaigns")
    expect(menuKeys).toContain("subscribers")
    expect(menuKeys).toContain("bookings")
    expect(menuKeys).toContain("payments")
    expect(menuKeys).toContain("customers")
    expect(menuKeys).toContain("reports")
    expect(menuKeys).toContain("settings")

    // Every item points to an existing tour
    for (const item of MENU_GUIDE_ITEMS) {
      expect(TOURS[item.tourId]).toBeDefined()
    }
  })

  test("all submenus have descriptive metadata and point to valid tours", () => {
    const itemsWithSubmenus = MENU_GUIDE_ITEMS.filter(
      item => item.submenus && item.submenus.length > 0
    )
    expect(itemsWithSubmenus.length).toBeGreaterThanOrEqual(3)

    for (const parent of itemsWithSubmenus) {
      for (const sub of parent.submenus!) {
        expect(sub.key.length).toBeGreaterThan(0)
        expect(sub.label.length).toBeGreaterThan(0)
        expect(sub.description.length).toBeGreaterThan(0)
        expect(TOURS[sub.tourId]).toBeDefined()
      }
    }

    // Verify Smart Menu & Ordering submenus
    const restaurant = MENU_GUIDE_ITEMS.find(item => item.key === "restaurant")
    expect(restaurant).toBeDefined()
    expect(restaurant?.submenus?.length).toBe(9)

    const restaurantSubKeys = restaurant?.submenus?.map(s => s.key) || []
    expect(restaurantSubKeys).toContain("rest-overview")
    expect(restaurantSubKeys).toContain("rest-orders")
    expect(restaurantSubKeys).toContain("rest-menus")
    expect(restaurantSubKeys).toContain("rest-dishes")
    expect(restaurantSubKeys).toContain("rest-tables")
    expect(restaurantSubKeys).toContain("rest-kds")
    expect(restaurantSubKeys).toContain("rest-waiter")
    expect(restaurantSubKeys).toContain("rest-ai")
    expect(restaurantSubKeys).toContain("rest-branches")
  })

  test("getTourById returns matching tour or undefined", () => {
    expect(getTourById("tour-navigation")?.id).toBe("tour-navigation")
    expect(getTourById("tour-dashboard")?.id).toBe("tour-dashboard")
    expect(getTourById("non-existent-tour-id")).toBeUndefined()
  })

  test("getTourForView maps views to their primary feature tour", () => {
    expect(getTourForView("dashboard")?.id).toBe("tour-dashboard")
    expect(getTourForView("tours")?.id).toBe("tour-tours")
    expect(getTourForView("inbox")?.id).toBe("tour-inbox")
    expect(getTourForView("restaurant")?.id).toBe("tour-restaurant")
    expect(getTourForView("bot-builder")?.id).toBe("tour-bot-builder")
    expect(getTourForView("campaigns")?.id).toBe("tour-campaigns")
    expect(getTourForView("bookings")?.id).toBe("tour-bookings")
    expect(getTourForView("payments")?.id).toBe("tour-payments")
    expect(getTourForView("customers")?.id).toBe("tour-customers")
    expect(getTourForView("reports")?.id).toBe("tour-reports")
    expect(getTourForView("settings")?.id).toBe("tour-settings")
    expect(getTourForView("ai-assistant")?.id).toBe("tour-ai-assistant")
  })
})

describe("Tour Store State & Actions", () => {
  beforeEach(() => {
    useTourStore.getState().endTour()
    useTourStore.getState().resetCompletedTours()
    useTourStore.getState().setExplorerOpen(false)
  })

  test("initial state is idle", () => {
    const state = useTourStore.getState()
    expect(state.activeTourId).toBeNull()
    expect(state.currentStepIndex).toBe(0)
    expect(state.isTourActive).toBe(false)
    expect(state.isExplorerOpen).toBe(false)
  })

  test("startTour activates the requested tour at step 0", () => {
    useTourStore.getState().startTour("tour-dashboard")
    const state = useTourStore.getState()
    expect(state.activeTourId).toBe("tour-dashboard")
    expect(state.currentStepIndex).toBe(0)
    expect(state.isTourActive).toBe(true)
    expect(state.isExplorerOpen).toBe(false)
  })

  test("nextStep and prevStep navigate correctly through steps", () => {
    useTourStore.getState().startTour("tour-dashboard")
    expect(useTourStore.getState().currentStepIndex).toBe(0)

    useTourStore.getState().nextStep()
    expect(useTourStore.getState().currentStepIndex).toBe(1)

    useTourStore.getState().nextStep()
    expect(useTourStore.getState().currentStepIndex).toBe(2)

    useTourStore.getState().prevStep()
    expect(useTourStore.getState().currentStepIndex).toBe(1)

    // Cannot go below 0
    useTourStore.getState().prevStep()
    expect(useTourStore.getState().currentStepIndex).toBe(0)
    useTourStore.getState().prevStep()
    expect(useTourStore.getState().currentStepIndex).toBe(0)
  })

  test("endTour resets active tour and flags", () => {
    useTourStore.getState().startTour("tour-inbox")
    useTourStore.getState().endTour()

    const state = useTourStore.getState()
    expect(state.activeTourId).toBeNull()
    expect(state.currentStepIndex).toBe(0)
    expect(state.isTourActive).toBe(false)
  })

  test("markTourCompleted records tours in completedTours", () => {
    useTourStore.getState().markTourCompleted("tour-dashboard")
    expect(useTourStore.getState().completedTours.includes("tour-dashboard")).toBe(true)

    useTourStore.getState().markTourCompleted("tour-inbox")
    expect(useTourStore.getState().completedTours.includes("tour-inbox")).toBe(true)
    expect(useTourStore.getState().completedTours.length).toBe(2)

    useTourStore.getState().resetCompletedTours()
    expect(useTourStore.getState().completedTours.length).toBe(0)
  })

  test("setExplorerOpen toggles guide explorer modal state", () => {
    useTourStore.getState().setExplorerOpen(true)
    expect(useTourStore.getState().isExplorerOpen).toBe(true)
    useTourStore.getState().setExplorerOpen(false)
    expect(useTourStore.getState().isExplorerOpen).toBe(false)
  })
})
