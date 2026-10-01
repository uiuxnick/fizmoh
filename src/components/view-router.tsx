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
import CorporateView from "@/components/views/corporate-view"
import WebsiteBuilderView from "@/components/views/website-builder-view"
import CloudBridgesView from "@/components/views/cloud-bridges-view"
import WhiteLabelView from "@/components/views/white-label-view"
import TrainingView from "@/components/views/training-view"

import { ModuleGate } from "@/components/module-gate"

export default function ViewRouter() {
  const { view } = useApp()
  switch (view) {
    case "dashboard": return <DashboardView />
    case "customer-site": return <ModuleGate module="CUSTOMER_SITE"><CustomerSiteView /></ModuleGate>
    case "website-builder": return <ModuleGate module="WEBSITE"><WebsiteBuilderView /></ModuleGate>
    case "cloud-bridges": return <ModuleGate module="INTEGRATION"><CloudBridgesView /></ModuleGate>
    case "white-label": return <ModuleGate module="WHITE_LABEL"><WhiteLabelView /></ModuleGate>
    case "training": return <ModuleGate module="TRAINING"><TrainingView /></ModuleGate>
    case "tours": return <ModuleGate module="TOURS"><ToursView /></ModuleGate>
    case "bookings": return <ModuleGate module="TOURS"><BookingsView /></ModuleGate>
    case "calendar": return <ModuleGate module="TOURS"><CalendarView /></ModuleGate>
    case "appointments": return <ModuleGate module="APPOINTMENTS"><AppointmentsView /></ModuleGate>
    case "visa": return <ModuleGate module="VISA"><VisaView /></ModuleGate>
    case "restaurant": return <ModuleGate module="RESTAURANT"><RestaurantView /></ModuleGate>
    case "corporate": return <ModuleGate module="CORPORATE"><CorporateView /></ModuleGate>
    case "knowledge": return <KnowledgeView />
    case "payments": return <PaymentsView />
    case "inbox": return <InboxView />
    case "catalog": return <ModuleGate module="CATALOG"><CatalogView /></ModuleGate>
    case "woocommerce": return <ModuleGate module="WOOCOMMERCE"><WooCommerceView /></ModuleGate>
    case "ai-assistant": return <AIAssistantView />
    case "templates": return <TemplatesView />
    case "campaigns": return <ModuleGate module="BROADCAST"><CampaignsView /></ModuleGate>
    case "staff": return <StaffView />
    case "bot-builder": return <BotBuilderView />
    case "whatsapp-setup": return <WhatsAppSetupView />
    case "whatsapp-numbers": return <WhatsAppAccountsView />
    case "subscribers": return <ModuleGate module="BROADCAST"><SubscribersView /></ModuleGate>
    case "reports": return <ReportsView />
    case "digital-qr": return <DigitalQrView />
    case "digital-vcard": return <DigitalVCardView />
    case "live-chat": return <LiveChatWidgetView />
    case "settings": return <SettingsView />
    case "coupons": return <ModuleGate module="TOURS"><CouponsView /></ModuleGate>
    case "content": return <ContentView />
    case "audit-logs": return <AuditLogsView />
    case "billing": return <BillingView />
    case "customers": return <CrmView />
    case "hospital": return <ModuleGate module="HOSPITAL"><HospitalView /></ModuleGate>
    case "platform": return <PlatformView />
    default: return <DashboardView />
  }
}
