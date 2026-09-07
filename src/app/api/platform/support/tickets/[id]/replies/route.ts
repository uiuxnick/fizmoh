import { NextRequest, NextResponse } from "next/server";
import { raw } from "@/lib/db";
import { withErrors } from "@/lib/api-handler";
import { requirePlatformAdmin } from "@/app/api/platform/tenants/route";

export const POST = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requirePlatformAdmin(request);
  if (!admin) return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 });

  const { id } = await params;
  const staffId = request.headers.get("x-wptour-staff-id");
  if (!staffId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { body: content, isInternal } = body;
  
  if (!content) {
    return NextResponse.json({ error: "Body is required" }, { status: 400 });
  }

  const existingTicket = await raw.supportTicket.findUnique({ where: { id } });
  if (!existingTicket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const reply = await raw.supportTicketReply.create({
    data: {
      ticketId: id,
      staffId: staffId,
      body: content,
      isInternal: !!isInternal,
    },
  });

  return NextResponse.json({ reply }, { status: 201 });
});
