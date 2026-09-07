import { NextRequest, NextResponse } from "next/server";
import { raw } from "@/lib/db";
import { withErrors } from "@/lib/api-handler";
import { requirePlatformAdmin } from "@/app/api/platform/tenants/route";

export const GET = withErrors(async (request: NextRequest) => {
  const admin = await requirePlatformAdmin(request);
  if (!admin) return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const [total, announcements] = await Promise.all([
    raw.platformAnnouncement.count(),
    raw.platformAnnouncement.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return NextResponse.json({ announcements, total, page, limit });
});

export const POST = withErrors(async (request: NextRequest) => {
  const admin = await requirePlatformAdmin(request);
  if (!admin) return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 });

  const staffId = request.headers.get("x-wptour-staff-id") || admin.id;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { title, body: content, type, targetAudience, publishedAt, expiresAt } = body;
  
  if (!title || !content) {
    return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
  }

  const announcement = await raw.platformAnnouncement.create({
    data: {
      title,
      body: content,
      type: type || "INFO",
      targetAudience: targetAudience || "ALL",
      publishedAt: publishedAt ? new Date(publishedAt) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdById: staffId,
    },
  });

  return NextResponse.json({ announcement }, { status: 201 });
});
