import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"

export async function GET(req: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), "public", "postman_collection.json")
    const content = await readFile(filePath, "utf-8")
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="Fizmoh_Platform_API.postman_collection.json"',
      },
    })
  } catch (err) {
    return NextResponse.json({ error: "Postman collection file not found" }, { status: 404 })
  }
}
