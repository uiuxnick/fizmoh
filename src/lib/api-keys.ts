import { raw, db } from "@/lib/db"
import { createHash, randomFillSync } from "crypto"

export interface ApiKeyRecord {
  id: string
  tenantId: string
  name: string
  keyHash: string
  prefix: string
  lastUsedAt: Date | null
  createdAt: Date
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex")
}

export function generateApiKey(): { rawKey: string; prefix: string; keyHash: string } {
  const bytes = new Uint8Array(24)
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(bytes)
  } else {
    randomFillSync(bytes)
  }
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("")
  const rawKey = `fiz_live_${hex}`
  const prefix = rawKey.slice(0, 14)
  const keyHash = hashApiKey(rawKey)
  return { rawKey, prefix, keyHash }
}

export async function validateApiKey(keyHeader: string | null): Promise<{ tenantId: string } | null> {
  if (!keyHeader) return null
  const clean = keyHeader.replace(/^Bearer\s+/i, "").trim()
  if (!clean.startsWith("fiz_live_")) return null

  const keyHash = hashApiKey(clean)
  const setting = await raw.systemSetting.findFirst({
    where: {
      key: { startsWith: "api_key_" },
      value: { contains: keyHash },
    },
  })
  if (!setting) return null

  try {
    const parsed = JSON.parse(setting.value)
    if (parsed.keyHash === keyHash) {
      return { tenantId: setting.tenantId }
    }
  } catch {
    return null
  }
  return null
}
