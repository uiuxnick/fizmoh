import { NextResponse } from "next/server"
import { CUSTOMER_COOKIE, STAFF_COOKIE } from "@/lib/auth"
import { withErrors } from "@/lib/api-handler"

export const POST = withErrors(async () => {
  const response = NextResponse.json({ success: true })
  response.cookies.set(STAFF_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 })
  response.cookies.set(CUSTOMER_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 })
  return response
})
