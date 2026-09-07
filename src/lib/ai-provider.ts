/**
 * AI provider configuration and dispatch.
 *
 * The assistant runs on either Anthropic (Claude) or OpenAI (ChatGPT). Both
 * support the two things this product actually needs — native tool calling and
 * schema-constrained JSON — so the rest of the codebase talks to this module
 * and never to a vendor SDK directly.
 *
 * Config resolves environment first, then the admin panel, matching how
 * WhatsApp credentials work: a value baked into the deployment is explicit
 * operator intent and should not be overridden by a stale database row.
 */

import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"
import { db } from "@/lib/db"
import { decryptSecret, encryptSecret } from "@/lib/secret-box"
import { PLATFORM } from "@/lib/tenant"

export type Provider = "anthropic" | "openai"

export type AIConfig = {
  provider: Provider
  model: string
  anthropicKey: string
  openaiKey: string
}

export type AIConfigSource = {
  provider: "env" | "db" | "default"
  model: "env" | "db" | "default"
  anthropicKey: "env" | "db" | "unset"
  openaiKey: "env" | "db" | "unset"
}

export const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: "claude-opus-5",
  openai: "gpt-4o",
}

// Suggestions only — the admin panel also accepts a free-text model id so a
// model released after this build can be used without a code change.
export const SUGGESTED_MODELS: Record<Provider, string[]> = {
  anthropic: ["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4-turbo"],
}

const DB_KEYS = {
  provider: "ai_provider",
  model: "ai_model",
  anthropicKey: "ai_anthropic_key",
  openaiKey: "ai_openai_key",
} as const

let cache: { config: AIConfig; source: AIConfigSource; loadedAt: number } | null = null
const CACHE_TTL_MS = 60_000

export function invalidateAIConfigCache() {
  cache = null
}

async function loadConfig(): Promise<{ config: AIConfig; source: AIConfigSource }> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) {
    return { config: cache.config, source: cache.source }
  }

  let rows: { key: string; value: string }[] = []
  try {
    rows = await db.systemSetting.findMany({
      where: { key: { in: Object.values(DB_KEYS) } },
      select: { key: true, value: true },
    })
  } catch (error) {
    console.error("Could not load AI settings from database:", error)
  }
  const byKey = new Map(rows.map(r => [r.key, decryptSecret(r.value)]))

  // Saved settings win over the environment, which seeds a fresh deployment
  // and is then superseded. The reverse order made the settings screen
  // read-only wherever the environment was populated, which is everywhere in
  // production.
  const envProvider = (process.env.AI_PROVIDER || "").toLowerCase()
  const dbProvider = (byKey.get(DB_KEYS.provider) || "").toLowerCase()
  const provider: Provider =
    dbProvider === "openai" || dbProvider === "anthropic"
      ? (dbProvider as Provider)
      : envProvider === "openai" || envProvider === "anthropic"
        ? (envProvider as Provider)
        : "anthropic"

  const envModel = process.env.AI_MODEL || ""
  const dbModel = byKey.get(DB_KEYS.model) || ""
  const model = dbModel || envModel || DEFAULT_MODELS[provider]

  const anthropicKey = byKey.get(DB_KEYS.anthropicKey) || process.env.ANTHROPIC_API_KEY || ""
  const openaiKey = byKey.get(DB_KEYS.openaiKey) || process.env.OPENAI_API_KEY || ""

  const config: AIConfig = { provider, model, anthropicKey, openaiKey }
  const source: AIConfigSource = {
    provider: dbProvider ? "db" : envProvider ? "env" : "default",
    model: dbModel ? "db" : envModel ? "env" : "default",
    anthropicKey: byKey.get(DB_KEYS.anthropicKey) ? "db" : process.env.ANTHROPIC_API_KEY ? "env" : "unset",
    openaiKey: byKey.get(DB_KEYS.openaiKey) ? "db" : process.env.OPENAI_API_KEY ? "env" : "unset",
  }

  cache = { config, source, loadedAt: Date.now() }
  return { config, source }
}

export async function getAIConfig(): Promise<AIConfig> {
  return (await loadConfig()).config
}

export async function getAIConfigSource(): Promise<AIConfigSource> {
  return (await loadConfig()).source
}

export async function saveAIConfig(values: Partial<Record<keyof typeof DB_KEYS, string>>) {
  for (const [field, value] of Object.entries(values) as [keyof typeof DB_KEYS, string][]) {
    const key = DB_KEYS[field]
    if (!key) continue
    if (value === "") {
      await db.systemSetting.deleteMany({ where: { key } })
      continue
    }
    // Credentials are encrypted before they touch the column; a database dump
    // on its own must not be enough to use them.
    const stored = key.endsWith("_key") ? encryptSecret(value) : value
    await db.systemSetting.upsert({
      where: { tenantId_key: { tenantId: PLATFORM, key } },
      update: { value: stored, type: "STRING", category: "AI" },
      create: { key, value: stored, type: "STRING", category: "AI" },
    })
  }
  invalidateAIConfigCache()
}

export function activeKey(config: AIConfig): string {
  return config.provider === "openai" ? config.openaiKey : config.anthropicKey
}

export async function isAIConfigured(): Promise<boolean> {
  const config = await getAIConfig()
  return !!activeKey(config)
}

// ─── Vendor clients ───

export async function anthropicClient(): Promise<Anthropic> {
  const config = await getAIConfig()
  return new Anthropic({ apiKey: config.anthropicKey })
}

export async function openaiClient(): Promise<OpenAI> {
  const config = await getAIConfig()
  return new OpenAI({ apiKey: config.openaiKey })
}

// ─── Shared shapes ───

export type ChatMessage = { role: "user" | "assistant"; content: string }

export type ToolSpec = {
  name: string
  description: string
  // JSON Schema — both vendors accept the same shape.
  parameters: Record<string, unknown>
}

export type ToolInvocation = { id: string; name: string; input: any }

/**
 * One turn of a tool-calling conversation, normalised across vendors.
 * Returns either a final text answer or the tool calls the model wants run.
 */
export type TurnResult =
  | { type: "text"; text: string }
  | { type: "tools"; calls: ToolInvocation[]; raw: unknown }

export type Transcript = {
  messages: ChatMessage[]
  // Vendor-native history, accumulated across turns.
  native: any[]
}
