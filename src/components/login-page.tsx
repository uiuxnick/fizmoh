"use client"

import { StaffLogin } from "@/components/staff-login"

export default function LoginPage({ initialMode = "admin" }: { initialMode?: "choice" | "admin" | "customer" }) {
  return <StaffLogin />
}
