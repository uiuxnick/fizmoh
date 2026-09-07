import { NextRequest, NextResponse } from "next/server";
import { raw } from "@/lib/db";
import { withErrors } from "@/lib/api-handler";
import { requirePlatformAdmin } from "@/app/api/platform/tenants/route";

export const GET = withErrors(async (request: NextRequest) => {
  const admin = await requirePlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.subscription = {
        tenant: {
          name: { contains: search, mode: "insensitive" },
        },
      };
    }

    const invoices = await raw.subscriptionInvoice.findMany({
      where,
      skip,
      take: limit,
      include: {
        subscription: {
          include: {
            tenant: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const total = await raw.subscriptionInvoice.count({ where });

    const formatted = invoices.map(inv => ({
      ...inv,
      tenantName: inv.subscription?.tenant?.name || "Workspace",
    }));

    return NextResponse.json({
      invoices: formatted,
      data: formatted,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    throw error;
  }
});
