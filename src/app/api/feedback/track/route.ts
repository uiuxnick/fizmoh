import { NextRequest, NextResponse } from "next/server";
import { raw } from "@/lib/db";
import { withErrors } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export const GET = withErrors(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const ref = (searchParams.get("ref") || "").trim().toUpperCase();

  if (!ref || ref.length < 5) {
    return NextResponse.json({ error: "Please provide a valid ticket reference" }, { status: 400 });
  }

  const ticket = await raw.supportTicket.findUnique({
    where: { reference: ref },
    include: {
      replies: {
        where: { isInternal: false },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) {
    return NextResponse.json({ error: "No request or bug report found with this reference code" }, { status: 404 });
  }

  return NextResponse.json({
    ticket: {
      reference: ticket.reference,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      channel: ticket.channel,
      createdAt: ticket.createdAt,
      resolvedAt: ticket.resolvedAt,
      replies: ticket.replies.map(r => ({
        id: r.id,
        body: r.body,
        createdAt: r.createdAt,
      })),
    },
  });
});
