import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { NextRequest, NextResponse } from "next/server"
import {
  getAIConfig,
  getAIConfigSource,
  saveAIConfig,
  DEFAULT_MODELS,
  SUGGESTED_MODELS,
  type Provider,
} from "@/lib/ai-provider"

/**
 * AI provider configuration for the admin panel.
 * API keys are write-only — GET reports whether each is set and where it came
 * from, never the value.
 */

function mask(value: string): string {
  if (!value) return ""
  if (value.length <= 10) return "••••"
  return `${value.slice(0, 6)}••••${value.slice(-4)}`
}

export const GET = withErrors(withModule("AI", async () => {
  const config = await getAIConfig()
  const source = await getAIConfigSource()

  return NextResponse.json({
    provider: config.provider,
    model: config.model,
    providerEnvManaged: source.provider === "env",
    modelEnvManaged: source.model === "env",
    keys: {
      anthropic: {
        set: !!config.anthropicKey,
        masked: mask(config.anthropicKey),
        source: source.anthropicKey,
        envManaged: source.anthropicKey === "env",
      },
      openai: {
        set: !!config.openaiKey,
        masked: mask(config.openaiKey),
        source: source.openaiKey,
        envManaged: source.openaiKey === "env",
      },
    },
    // The active provider is what actually decides whether the assistant runs.
    ready: !!(config.provider === "openai" ? config.openaiKey : config.anthropicKey),
    defaults: DEFAULT_MODELS,
    suggestedModels: SUGGESTED_MODELS,
  })
}))

export const PUT = withErrors(withModule("AI", async (request: NextRequest) => {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const source = await getAIConfigSource()
  const updates: Record<string, string> = {}
  const rejected: string[] = []

  if (typeof body.provider === "string") {
    const provider = body.provider.toLowerCase() as Provider
    if (provider !== "anthropic" && provider !== "openai") {
      return NextResponse.json({ error: "provider must be 'anthropic' or 'openai'" }, { status: 400 })
    }
    if (source.provider === "env") rejected.push("provider")
    else updates.provider = provider
  }

  if (typeof body.model === "string") {
    if (source.model === "env") rejected.push("model")
    else updates.model = body.model.trim()
  }

  if (typeof body.anthropicKey === "string") {
    if (source.anthropicKey === "env") rejected.push("anthropicKey")
    else updates.anthropicKey = body.anthropicKey.trim()
  }

  if (typeof body.openaiKey === "string") {
    if (source.openaiKey === "env") rejected.push("openaiKey")
    else updates.openaiKey = body.openaiKey.trim()
  }

  // Switching provider without naming a model would otherwise keep the old
  // vendor's model id and fail on the next call with a confusing 404.
  if (updates.provider && !updates.model) {
    const config = await getAIConfig()
    const stillValid = SUGGESTED_MODELS[updates.provider as Provider].includes(config.model)
    if (!stillValid) updates.model = DEFAULT_MODELS[updates.provider as Provider]
  }

  if (Object.keys(updates).length > 0) await saveAIConfig(updates as any)

  const config = await getAIConfig()
  return NextResponse.json({
    saved: Object.keys(updates),
    rejected,
    provider: config.provider,
    model: config.model,
    ready: !!(config.provider === "openai" ? config.openaiKey : config.anthropicKey),
  })
}))
