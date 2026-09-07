import { create } from "zustand"
import { persist } from "zustand/middleware"

export type ViewKey =
  | "dashboard"
  | "customer-site"
  | "tours"
  | "bookings"
  | "calendar"
  | "appointments"
  | "visa"
  | "payments"
  | "inbox"
  | "ai-assistant"
  | "knowledge"
  | "templates"
  | "campaigns"
  | "customers"
  | "subscribers"
  | "staff"
  | "bot-builder"
  | "reports"
  | "whatsapp-setup"
  | "whatsapp-numbers"
  | "settings"
  | "coupons"
  | "content"
  | "audit-logs"
  | "billing"
  | "platform"
  | "restaurant"
  | "catalog"
  | "woocommerce"
  | "hospital"
  | "digital-qr"
  | "digital-vcard"
  | "social-channels"
  | "live-chat"

type AuthMode = "login" | "admin" | "customer" | null

interface StaffUser {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  tenantId?: string | null
  isPlatformOperator?: boolean
}

interface CustomerUser {
  id: string
  name: string | null
  phone: string
  email: string | null
  loyaltyTier: string
  loyaltyPoints: number
}

interface AppState {
  view: ViewKey
  setView: (v: ViewKey) => void

  selectedTourId: string | null
  setSelectedTour: (id: string | null) => void
  bookingStep: number
  setBookingStep: (n: number) => void
  selectedConversationId: string | null
  setSelectedConversation: (id: string | null) => void
  currentStaffId: string
  setCurrentStaff: (id: string) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void

  // Subscriber channel filter (WhatsApp, Facebook, Instagram, All)
  subscriberChannelFilter: "ALL" | "WHATSAPP" | "FACEBOOK" | "INSTAGRAM"
  setSubscriberChannelFilter: (filter: "ALL" | "WHATSAPP" | "FACEBOOK" | "INSTAGRAM") => void

  // Campaign channel filter (WhatsApp, Facebook, Instagram, Email, Comment-to-DM, All)
  campaignChannelFilter: "ALL" | "WHATSAPP" | "FACEBOOK" | "INSTAGRAM" | "EMAIL" | "COMMENT_TO_DM"
  setCampaignChannelFilter: (filter: "ALL" | "WHATSAPP" | "FACEBOOK" | "INSTAGRAM" | "EMAIL" | "COMMENT_TO_DM") => void

  // Auth
  authMode: AuthMode
  /**
   * Where a click should land after switching screens.
   *
   * A notification names a specific order or conversation; without this the
   * panel could only open the right screen and leave the operator to find the
   * record themselves, which for a payment alert at 2am is most of the work.
   */
  focus: { kind: "order" | "conversation"; id: string } | null
  staffToken: string | null
  staffUser: StaffUser | null
  customerToken: string | null
  customerUser: CustomerUser | null

  setAuthMode: (mode: AuthMode) => void
  setFocus: (focus: { kind: "order" | "conversation"; id: string } | null) => void
  setStaffAuth: (token: string, user: StaffUser) => void
  setCustomerAuth: (token: string, user: CustomerUser) => void
  logout: () => void
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      view: "customer-site",
      setView: (view) => set({ view }),
      selectedTourId: null,
      setSelectedTour: (selectedTourId) => set({ selectedTourId }),
      bookingStep: 0,
      setBookingStep: (bookingStep) => set({ bookingStep }),
      selectedConversationId: null,
      setSelectedConversation: (selectedConversationId) => set({ selectedConversationId }),
      currentStaffId: "cmsdfk9dv0000nkf6tfezvl0j",
      setCurrentStaff: (currentStaffId) => set({ currentStaffId }),
      sidebarOpen: false,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

      subscriberChannelFilter: "ALL",
      setSubscriberChannelFilter: (subscriberChannelFilter) => set({ subscriberChannelFilter }),

      campaignChannelFilter: "ALL",
      setCampaignChannelFilter: (campaignChannelFilter) => set({ campaignChannelFilter }),

      authMode: null,
      focus: null,
      staffToken: null,
      staffUser: null,
      customerToken: null,
      customerUser: null,

      setAuthMode: (authMode) => set({ authMode }),
      setFocus: (focus) => set({ focus }),
      setStaffAuth: (staffToken, staffUser) => set({ staffToken, staffUser, authMode: "admin", currentStaffId: staffUser.id }),
      setCustomerAuth: (customerToken, customerUser) => set({ customerToken, customerUser, authMode: "customer" }),
      logout: () => {
        void fetch("/api/auth/logout", { method: "POST" }).catch(() => {})
        set({ authMode: null, staffToken: null, staffUser: null, customerToken: null, customerUser: null })
      },
    }),
    {
      name: "oman-adventures-auth",
      partialize: (state) => ({
        staffUser: state.staffUser,
        customerUser: state.customerUser,
        authMode: state.authMode,
      }),
    }
  )
)
