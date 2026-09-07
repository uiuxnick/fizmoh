import { db, raw } from "@/lib/db"

export async function beginWebhookDelivery(input: { provider: string; eventType: string; externalId?: string | null; tenantId?: string | null; payload?: unknown }) {
  const client = input.tenantId ? db : raw
  return client.webhookDelivery.create({ data: { tenantId: input.tenantId ?? null, provider: input.provider, eventType: input.eventType, externalId: input.externalId ?? null, payload: input.payload as never, status: "RECEIVED", attempts: 1 } })
}

export async function finishWebhookDelivery(id: string, response?: unknown) {
  return raw.webhookDelivery.update({ where: { id }, data: { status: "PROCESSED", response: response as never, processedAt: new Date(), lastError: null } })
}

export async function failWebhookDelivery(id: string, error: unknown, retry = true) {
  const row = await raw.webhookDelivery.findUnique({ where: { id }, select: { attempts: true } })
  const attempts = row?.attempts ?? 1
  const dead = !retry || attempts >= 8
  const nextRetryAt = new Date(Date.now() + Math.min(60 * 60_000, 2 ** Math.min(attempts, 10) * 1000))
  return raw.webhookDelivery.update({ where: { id }, data: { status: dead ? "DEAD" : "RETRYING", attempts: { increment: 1 }, nextRetryAt: dead ? null : nextRetryAt, lastError: String(error).slice(0, 1000) } })
}
