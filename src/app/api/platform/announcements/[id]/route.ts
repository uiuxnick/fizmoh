import { NextRequest, NextResponse } from "next/server";
import { raw } from "@/lib/db";
import { withErrors } from "@/lib/api-handler";
import { requirePlatformAdmin } from "@/app/api/platform/tenants/route";

export const PATCH = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requirePlatformAdmin(request);
  if (!admin) return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { title, body: content, type, targetAudience, publishedAt, expiresAt } = body;
  
  const existing = await raw.platformAnnouncement.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Announcement not found" }, { status: 404 });

  const announcement = await raw.platformAnnouncement.update({
    where: { id },
    data: {
      title: title !== undefined ? title : existing.title,
      body: content !== undefined ? content : existing.body,
      type: type !== undefined ? type : existing.type,
      targetAudience: targetAudience !== undefined ? targetAudience : existing.targetAudience,
      publishedAt: publishedAt !== undefined ? (publishedAt ? new Date(publishedAt) : null) : existing.publishedAt,
      expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : existing.expiresAt,
    },
  });

  return NextResponse.json({ announcement });
});

export const DELETE = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requirePlatformAdmin(request);
  if (!admin) return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 });

  const { id } = await params;
  const existing = await raw.platformAnnouncement.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Announcement not found" }, { status: 404 });

  await raw.platformAnnouncement.delete({ where: { id } });

  return NextResponse.json({ success: true });
});
