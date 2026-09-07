"use client"

import { useApp } from "@/lib/store"
import DashboardView from "@/components/views/dashboard-view"
import CustomerSiteView from "@/components/views/customer-site-view"
import ToursView from "@/components/views/tours-view"
import BookingsView from "@/components/views/bookings-view"
import CalendarView from "@/components/views/calendar-view"
import AppointmentsView from "@/components/views/appointments-view"
import VisaView from "@/components/views/visa-view"
import KnowledgeView from "@/components/views/knowledge-view"
import PaymentsView from "@/components/views/payments-view"
import InboxView from "@/components/views/inbox-view"
import AIAssistantView from "@/components/views/ai-assistant-view"
import TemplatesView from "@/components/views/templates-view"
import CampaignsView from "@/components/views/campaigns-view"
import StaffView from "@/components/views/staff-view"
import BotBuilderView from "@/components/views/bot-builder-view"
import WhatsAppSetupView from "@/components/views/whatsapp-setup-view"
import WhatsAppAccountsView from "@/components/views/whatsapp-accounts-view"
import SubscribersView from "@/components/views/subscribers-view"
import ReportsView from "@/components/views/reports-view"
import DigitalQrView from "@/components/views/digital-qr-view"
import DigitalVCardView from "@/components/views/digital-vcard-view"
import SettingsView from "@/components/views/settings-view"
import CouponsView from "@/components/views/coupons-view"
import ContentView from "@/components/views/content-view"
import AuditLogsView from "@/components/views/audit-logs-view"
import BillingView from "@/components/views/billing-view"
import CrmView from "@/components/views/crm-view"
import PlatformView from "@/components/views/platform-view"
import { RestaurantView } from "@/components/views/restaurant-view"
import { CatalogView } from "@/components/views/catalog-view"
import { WooCommerceView } from "@/components/views/woocommerce-view"
import HospitalView from "@/components/views/hospital-view"
import LiveChatWidgetView from "@/components/views/live-chat-widget-view"

export default function ViewRouter() {
  const { view } = useApp()
  switch (view) {
    case "dashboard": return <DashboardView />
    case "customer-site": return <CustomerSiteView />
    case "tours": return <ToursView />
    case "bookings": return <BookingsView />
    case "calendar": return <CalendarView />
    case "appointments": return <AppointmentsView />
    case "visa": return <VisaView />
    case "restaurant": return <RestaurantView />
    case "knowledge": return <KnowledgeView />
    case "payments": return <PaymentsView />
    case "inbox": return <InboxView />
    case "catalog": return <CatalogView />
    case "woocommerce": return <WooCommerceView />
    case "ai-assistant": return <AIAssistantView />
    case "templates": return <TemplatesView />
    case "campaigns": return <CampaignsView />
    case "staff": return <StaffView />
    case "bot-builder": return <BotBuilderView />
    case "whatsapp-setup": return <WhatsAppSetupView />
    case "whatsapp-numbers": return <WhatsAppAccountsView />
    case "subscribers": return <SubscribersView />
    case "reports": return <ReportsView />
    case "digital-qr": return <DigitalQrView />
    case "digital-vcard": return <DigitalVCardView />
    case "live-chat": return <LiveChatWidgetView />
    case "settings": return <SettingsView />
    case "coupons": return <CouponsView />
    case "content": return <ContentView />
    case "audit-logs": return <AuditLogsView />
    case "billing": return <BillingView />
    case "customers": return <CrmView />
    case "hospital": return <HospitalView />
    case "platform": return <PlatformView />
    default: return <DashboardView />
  }
}
