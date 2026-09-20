// Generate the remaining 2 tour images (turtle + wadi)
import ZAI from "z-ai-web-dev-sdk"
import { writeFileSync, existsSync } from "node:fs"

const tours = [
  {
    file: "/home/z/my-project/public/tours/turtle-1.jpg",
    prompt: `Green sea turtle on Ras Al Jinz beach in Oman at night under moonlight. Turtle nesting on sandy beach, gentle waves, dark atmospheric scene with soft moonlight, professional nature photography. No text.`,
  },
  {
    file: "/home/z/my-project/public/tours/wadi-1.jpg",
    prompt: `Wadi Shab Oman turquoise pools between tall rocky canyon walls. Crystal clear emerald water, palm trees, dramatic canyon, sunlight filtering through, professional adventure travel photography, vibrant colors. No text.`,
  },
]

async function main() {
  const zai = await ZAI.create()
  for (const t of tours) {
    if (existsSync(t.file) && (await import("node:fs")).statSync(t.file).size > 50000) {
      console.log(`${t.file} already exists, skipping`)
      continue
    }
    console.log(`Generating ${t.file}...`)
    try {
      const res = await zai.images.generations.create({
        prompt: t.prompt,
        size: "1024x1024",
      })
      const item = res?.data?.[0]
      if (!item) {
        console.error(`  no data for ${t.file}`)
        continue
      }
      let buf
      if (item.url) {
        const r = await fetch(item.url)
        buf = Buffer.from(await r.arrayBuffer())
      } else if (item.base64) {
        buf = Buffer.from(item.base64, "base64")
      } else {
        console.error(`  no image data for ${t.file}`)
        continue
      }
      writeFileSync(t.file, buf)
      console.log(`  saved ${buf.length} bytes`)
    } catch (e) {
      console.error(`  failed for ${t.file}:`, e?.message || e)
    }
  }
  console.log("Done.")
}

main().catch(e => { console.error(e); process.exit(1) })
