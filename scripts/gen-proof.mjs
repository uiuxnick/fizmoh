// One-off image generation script for payment proof sample.
import ZAI from "z-ai-web-dev-sdk"
import { writeFileSync } from "node:fs"

const prompt = `A realistic mobile banking app screenshot showing a successful bank transfer receipt.
The screenshot should look like a real Bank Muscat mobile app screen with:
- White/light gray background
- "Bank Muscat" logo text at the top in dark green
- "Transfer Successful" header in green
- Amount transferred: "OMR 47.250" in large bold text
- From: "John Smith"
- To: "Oman Adventures LLC"
- Reference number: "TRX100678"
- Date: 2025-01-15 14:32
- Status: "Completed" with green checkmark
- Clean modern mobile banking UI design
- Phone screenshot aspect ratio
- Professional, clean, realistic looking`

async function main() {
  const zai = await ZAI.create()
  const res = await zai.images.generations.create({
    prompt,
    size: "1024x1024",
  })
  const item = res?.data?.[0]
  if (!item) {
    console.error("No image data returned")
    process.exit(1)
  }
  let buf
  if (item.url) {
    console.log("Fetching from URL:", item.url)
    const r = await fetch(item.url)
    buf = Buffer.from(await r.arrayBuffer())
  } else if (item.base64) {
    console.log("Decoding base64 image")
    buf = Buffer.from(item.base64, "base64")
  } else {
    console.error("No image data found", Object.keys(item))
    process.exit(1)
  }
  writeFileSync("/home/z/my-project/public/payments/proof-sample.jpg", buf)
  console.log(`Saved ${buf.length} bytes to /home/z/my-project/public/payments/proof-sample.jpg`)
}

main().catch(e => { console.error(e); process.exit(1) })
