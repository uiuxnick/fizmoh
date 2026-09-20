import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET() {
  const filePath = path.join(process.cwd(), "public/downloads/fizmoh-connect-for-woocommerce.zip")
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Plugin package not found" }, { status: 404 })
  }

  const fileBuffer = fs.readFileSync(filePath)
  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="fizmoh-connect-for-woocommerce.zip"',
    },
  })
}
