import crypto from "crypto"
import { getConfigValue } from "@/lib/app-config"
import { userAccessToken } from "@/lib/google-oauth"
import { APP_TIMEZONE, toRfc3339 } from "@/lib/timezone"

/**
 * Writes bookings and appointments into Google Calendar.
 *
 * Two ways in, and which one is used matters:
 *
 *   - A **service account** signs its own JWT. Nobody consents, nothing
 *     expires, and it keeps working when the person who set it up leaves. It
 *     cannot create Meet links: Google answers `hangoutsMeet` with "Invalid
 *     conference type value" for any calendar not owned by a Workspace user.
 *   - A **connected Google account** can create Meet links, because a Meet
 *     room belongs to a person.
 *
 * The connected account is preferred when present and the service account is
 * the fallback, so the calendar keeps working if the grant is ever revoked.
 *
 * Every function here is best-effort. A calendar that is unreachable must
 * never stop a booking being taken or a customer being told — the booking is
 * the business, the calendar entry is a convenience.
 */

interface ServiceAccount {
  client_email: string
  private_key: string
}

let cachedServiceToken: { token: string; expiresAt: number } | null = null

async function serviceAccountToken(): Promise<string | null> {
  if (cachedServiceToken && cachedServiceToken.expiresAt > Date.now() + 60_000) return cachedServiceToken.token

  const raw = await getConfigValue("google_service_account")
  if (!raw) return null

  let key: ServiceAccount
  try {
    key = JSON.parse(raw)
  } catch {
    console.error("Google service account JSON is not valid")
    return null
  }
  if (!key.client_email || !key.private_key) return null

  const now = Math.floor(Date.now() / 1000)
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url")
  const claim =
    `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/calendar",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })}`

  try {
    const signature = crypto.createSign("RSA-SHA256").update(claim).sign(key.private_key).toString("base64url")
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${claim}.${signature}`,
      }),
    })
    const data = await response.json()
    if (!data.access_token) {
      console.error("Google auth failed:", JSON.stringify(data).slice(0, 200))
      return null
    }
    cachedServiceToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 }
    return cachedServiceToken.token
  } catch (error) {
    console.error("Google auth error:", error)
    return null
  }
}

interface Access {
  token: string
  calendarId: string
  /** Only a connected account can create a Meet room. */
  canCreateMeet: boolean
}

async function access(): Promise<Access | null> {
  const configured = (await getConfigValue("google_calendar_id")) || ""

  const user = await userAccessToken()
  if (user) {
    // A connected account writes to its own primary calendar unless a shared
    // one is named, because it is not necessarily a writer on the service
    // account's calendar.
    return { token: user, calendarId: configured || "primary", canCreateMeet: true }
  }

  const service = await serviceAccountToken()
  if (service && configured) return { token: service, calendarId: configured, canCreateMeet: false }
  return null
}

/**
 * Lets a connected Google account write to the shared calendar.
 *
 * The calendar is owned by the service account, so anybody else is a reader by
 * default and their first write fails with "You need to have writer access to
 * this calendar". The owner can grant that itself, which is better than asking
 * an operator to find the sharing dialog.
 */
export async function grantWriterAccess(email: string): Promise<{ ok: boolean; error?: string }> {
  const token = await serviceAccountToken()
  const calendarId = await getConfigValue("google_calendar_id")
  if (!token || !calendarId) return { ok: false, error: "No service account or calendar configured" }

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/acl`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role: "writer", scope: { type: "user", value: email } }),
      },
    )
    if (response.ok) return { ok: true }
    const detail = await response.text().catch(() => "")
    return { ok: false, error: `Google returned ${response.status}: ${detail.slice(0, 150)}` }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

export async function isCalendarConfigured(): Promise<boolean> {
  return Boolean(await access())
}

/**
 * Google requires event ids to be base32hex and at least five characters.
 * Neither an order number nor a cuid is, so it is hashed into one. Deriving it
 * rather than storing it means a booking written twice — a retried webhook, a
 * manual approval after an automatic one — updates the same entry instead of
 * leaving two in the calendar.
 */
function eventIdFor(reference: string): string {
  return crypto.createHash("sha1").update(reference).digest("hex").slice(0, 26).replace(/[^0-9a-v]/g, "0")
}

/** Oman is UTC+4 year round, with no daylight saving to account for. */
function omanTimes(date: Date, startTime: string, durationHours: number) {
  const [hours, minutes] = startTime.split(":").map(Number)
  const start = new Date(date)
  start.setUTCHours((hours || 0) - 4, minutes || 0, 0, 0)
  const end = new Date(start.getTime() + Math.max(0.25, durationHours || 2) * 3_600_000)
  return { start: toRfc3339(start), end: toRfc3339(end) }
}

interface WriteOptions {
  reference: string
  summary: string
  description: string
  location?: string
  start: string
  end: string
  /** Ask Google for a Meet room. Ignored when the calendar cannot make one. */
  wantsMeet?: boolean
  /** Held tentatively rather than confirmed, so it looks different in the grid. */
  tentative?: boolean
  attendeeEmail?: string | null
}

/** Creates or updates an event. Returns the Meet link when one was made. */
async function writeEvent(options: WriteOptions): Promise<{ ok: boolean; meetLink?: string; error?: string }> {
  const auth = await access()
  if (!auth) return { ok: false, error: "Google Calendar is not configured" }

  const eventId = eventIdFor(options.reference)
  const wantsMeet = options.wantsMeet && auth.canCreateMeet

  const body: Record<string, unknown> = {
    id: eventId,
    summary: options.summary,
    location: options.location || "",
    description: options.description,
    start: { dateTime: options.start, timeZone: APP_TIMEZONE },
    end: { dateTime: options.end, timeZone: APP_TIMEZONE },
    status: options.tentative ? "tentative" : "confirmed",
  }
  if (wantsMeet) {
    body.conferenceData = {
      createRequest: { requestId: eventId, conferenceSolutionKey: { type: "hangoutsMeet" } },
    }
  }

  // Inviting the guest is only possible as a real account; a service account
  // has no domain to send on behalf of and Google rejects the attendee list.
  if (options.attendeeEmail && auth.canCreateMeet) {
    body.attendees = [{ email: options.attendeeEmail }]
  }

  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events`
  const query = wantsMeet ? "?conferenceDataVersion=1" : ""
  const headers = { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" }

  try {
    // Update first: after the first write, a change is the common case.
    const update = await fetch(`${base}/${eventId}${query}`, { method: "PUT", headers, body: JSON.stringify(body) })
    if (update.ok) {
      const event = await update.json()
      return { ok: true, meetLink: event.hangoutLink }
    }

    const insert = await fetch(`${base}${query}`, { method: "POST", headers, body: JSON.stringify(body) })
    if (insert.ok) {
      const event = await insert.json()
      return { ok: true, meetLink: event.hangoutLink }
    }

    const detail = await insert.text().catch(() => "")

    /*
     * A connected account that is not yet a writer on the shared calendar is
     * refused. Sharing is granted automatically when the account connects, but
     * an account connected before that existed — or one whose access was later
     * removed — would otherwise lose the appointment entirely. Its own calendar
     * is always writable, so it goes there instead of nowhere.
     */
    if (insert.status === 403 && auth.canCreateMeet && auth.calendarId !== "primary") {
      console.error("No writer access to the shared calendar; falling back to the account's own")
      const fallback = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events${query}`,
        { method: "POST", headers, body: JSON.stringify(body) },
      )
      if (fallback.ok) {
        const event = await fallback.json()
        return { ok: true, meetLink: event.hangoutLink }
      }
    }

    console.error("Calendar write failed:", insert.status, detail.slice(0, 300))
    return { ok: false, error: `Google returned ${insert.status}` }
  } catch (error) {
    console.error("Calendar write error:", error)
    return { ok: false, error: "Could not reach Google Calendar" }
  }
}

/** Removes an event, for a cancellation. */
export async function removeEvent(reference: string): Promise<{ ok: boolean }> {
  const auth = await access()
  if (!auth) return { ok: false }

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events/${eventIdFor(reference)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${auth.token}` } },
    )
    // 404 and 410 mean it is already gone, which is the outcome we wanted.
    return { ok: response.ok || response.status === 410 || response.status === 404 }
  } catch (error) {
    console.error("Calendar delete error:", error)
    return { ok: false }
  }
}

/** Kept for callers that predate the rename. */
export const removeBookingEvent = removeEvent

// ── Tour bookings ────────────────────────────────────────────────────────────

/** Statuses that no longer belong in the calendar at all. */
const OFF_CALENDAR = ["CANCELLED", "REFUNDED"]

/** Statuses held tentatively — the seat is not paid for yet. */
const TENTATIVE = ["PENDING_PAYMENT", "PAYMENT_SUBMITTED", "CANCELLATION_REQUESTED"]

/**
 * Writes an order to the calendar.
 *
 * Every booking goes on, not only confirmed ones: an unpaid booking still
 * occupies a seat and still needs a guide to know about it. Unpaid ones are
 * marked tentative so the grid shows the difference at a glance.
 */
export async function syncOrderToCalendar(orderId: string): Promise<void> {
  if (!(await isCalendarConfigured())) return

  const { db } = await import("@/lib/db")
  const order = await db.order.findUnique({ where: { id: orderId }, include: { tour: true, slot: true } })
  if (!order) return

  if (OFF_CALENDAR.includes(order.orderStatus)) {
    await removeEvent(order.orderNumber)
    return
  }

  const party = [
    `${order.paxAdult} adult${order.paxAdult === 1 ? "" : "s"}`,
    order.paxChild ? `${order.paxChild} child${order.paxChild === 1 ? "" : "ren"}` : "",
    order.paxInfant ? `${order.paxInfant} infant${order.paxInfant === 1 ? "" : "s"} (free)` : "",
  ].filter(Boolean).join(", ")

  const tentative = TENTATIVE.includes(order.orderStatus)
  const { start, end } = omanTimes(order.slot.date, order.slot.startTime, order.tour.durationHours)

  await writeEvent({
    reference: order.orderNumber,
    summary: `${tentative ? "[unpaid] " : ""}${order.tour.name} — ${order.customerName}`,
    location: order.pickupLocation || order.tour.meetingPoint || order.tour.city || "",
    description: [
      `Order: ${order.orderNumber}`,
      `Status: ${order.orderStatus.replace(/_/g, " ").toLowerCase()}`,
      `Guest: ${order.customerName}`,
      `Phone: ${order.customerPhone}`,
      `Party: ${party}`,
      `Total: ${order.totalAmount.toFixed(3)} OMR`,
      order.specialRequests ? `\nSpecial requests: ${order.specialRequests}` : "",
    ].filter(Boolean).join("\n"),
    start,
    end,
    tentative,
  })
}

// ── Appointments ─────────────────────────────────────────────────────────────

/**
 * Writes an appointment to the calendar and returns its Meet link.
 *
 * The link is resolved in order of preference: one Google made for this
 * appointment, then the standing room from settings, then nothing. A standing
 * room is a real fallback rather than a placeholder — it works with a free
 * Google account and needs no OAuth — but every appointment shares it, so
 * back-to-back meetings can walk into each other.
 */
export async function syncAppointmentToCalendar(appointmentId: string): Promise<void> {
  if (!(await isCalendarConfigured())) return

  const { db } = await import("@/lib/db")
  const appointment = await db.appointment.findUnique({ where: { id: appointmentId } })
  if (!appointment) return

  if (["CANCELLED"].includes(appointment.status)) {
    await removeEvent(appointment.reference)
    if (appointment.calendarEventId) {
      await db.appointment.update({ where: { id: appointmentId }, data: { calendarEventId: null } })
    }
    return
  }

  const start = new Date(appointment.scheduledAt)
  const end = new Date(start.getTime() + (appointment.durationMins || 30) * 60_000)
  const standingRoom = (await getConfigValue("google_meet_link")) || null

  const result = await writeEvent({
    reference: appointment.reference,
    summary: `${appointment.service} — ${appointment.name}`,
    description: [
      `Reference: ${appointment.reference}`,
      `Name: ${appointment.name}`,
      appointment.email ? `Email: ${appointment.email}` : "",
      appointment.phone ? `Phone: ${appointment.phone}` : "",
      `Service: ${appointment.service}`,
      appointment.companyName ? `Company: ${appointment.companyName}` : "",
      appointment.companyWebsite ? `Website: ${appointment.companyWebsite}` : "",
      appointment.notes ? `\nNotes: ${appointment.notes}` : "",
    ].filter(Boolean).join("\n"),
    start: toRfc3339(start),
    end: toRfc3339(end),
    wantsMeet: true,
    tentative: appointment.status === "SCHEDULED",
    attendeeEmail: appointment.email,
  })

  if (!result.ok) return

  const meetLink = result.meetLink || standingRoom
  await db.appointment.update({
    where: { id: appointmentId },
    data: { calendarEventId: eventIdFor(appointment.reference), meetLink },
  })
}
