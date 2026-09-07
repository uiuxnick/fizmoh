import { SignJWT, jwtVerify, type JWTPayload } from "jose"
import type { NextRequest, NextResponse } from "next/server"

export const STAFF_COOKIE = "wptour_staff_session"
export const CUSTOMER_COOKIE = "wptour_customer_session"

export type SessionPayload = JWTPayload & {
  kind: "staff" | "customer"
  staffId?: string
  customerId?: string
  email?: string
  phone?: string
  role?: string
}

function secret() {
  const value = process.env.JWT_SECRET
  if (!value || value.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters")
  }
  return new TextEncoder().encode(value)
}

export async function signSession(payload: {
  kind: "staff" | "customer"
  staffId?: string
  customerId?: string
  email?: string
  phone?: string
  role?: string
}, expiresIn: string) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("wptour")
    .setAudience("wptour-web")
    .setExpirationTime(expiresIn)
    .sign(secret())
}

export async function verifySession(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, secret(), {
    algorithms: ["HS256"],
    issuer: "wptour",
    audience: "wptour-web",
  })
  return payload as SessionPayload
}

export function setSessionCookie(response: NextResponse, kind: "staff" | "customer", token: string) {
  response.cookies.set(kind === "staff" ? STAFF_COOKIE : CUSTOMER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
}

export async function sessionFromRequest(request: NextRequest) {
  const staff = request.cookies.get(STAFF_COOKIE)?.value
  const customer = request.cookies.get(CUSTOMER_COOKIE)?.value
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  for (const token of [staff, customer, bearer]) {
    if (!token) continue
    try { return await verifySession(token) } catch {}
  }
  return null
}
