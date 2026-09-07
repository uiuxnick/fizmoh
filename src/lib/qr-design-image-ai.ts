/**
 * A full AI-generated background image for a QR print design — the "make it
 * look like Canva/ChatGPT/Gemini generated it" request, section 24-27 spirit.
 *
 * Image generation is OpenAI-only: Anthropic has no image-generation API, so
 * this checks for an OpenAI key directly rather than reusing whichever
 * provider the text assistant is configured with. A workspace running the
 * chat assistant on Claude can still generate a design image here as long as
 * an OpenAI key is configured — the two are independent capabilities.
 *
 * The image is a background layer only. It never carries the QR code itself —
 * that is always generated separately by the `qrcode` library, drawn on top,
 * at full error correction, the same rule every other QR-design file in this
 * module obeys.
 */

import OpenAI from "openai"
import { getAIConfig } from "@/lib/ai-provider"

export type ImageOrientation = "square" | "portrait" | "landscape"

const SIZE_FOR: Record<ImageOrientation, "1024x1024" | "1024x1536" | "1536x1024"> = {
  square: "1024x1024",
  portrait: "1024x1536",
  landscape: "1536x1024",
}

export async function designImageAvailable(): Promise<boolean> {
  const config = await getAIConfig()
  return Boolean(config.openaiKey)
}

/** Returns a data: URL (PNG) — never a hosted URL, so the design stays self-contained and printable offline. */
export async function generateDesignBackground(prompt: string, businessName: string, orientation: ImageOrientation): Promise<string> {
  const config = await getAIConfig()
  if (!config.openaiKey) {
    throw new Error("AI image generation needs an OpenAI API key configured under Settings → AI, even if the chat assistant runs on a different provider.")
  }

  const client = new OpenAI({ apiKey: config.openaiKey })
  const fullPrompt =
    `A clean, print-ready background graphic for a small business QR review sign. ` +
    `Business: ${businessName || "a local business"}. Style/request: ${prompt.slice(0, 300)}. ` +
    `Leave calm, uncluttered open space in the center and lower-third for text and a QR code to be placed on top later — ` +
    `no text, no words, no QR code, no barcode in the image itself.`

  const response = await client.images.generate({
    model: "gpt-image-1",
    prompt: fullPrompt,
    size: SIZE_FOR[orientation],
    n: 1,
  })

  const b64 = response.data?.[0]?.b64_json
  if (!b64) throw new Error("The image model returned nothing usable")
  return `data:image/png;base64,${b64}`
}
