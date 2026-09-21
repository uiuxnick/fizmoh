import { Metadata } from "next";
import StatusPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Platform System Status | Fizmoh Cloud",
  description: "Live operational status, API uptime, component health, and incident history for the Fizmoh WhatsApp Commerce & CRM platform.",
  alternates: {
    canonical: "https://app.fizmoh.cloud/status",
  },
};

export default function StatusPage() {
  return <StatusPageClient />;
}
