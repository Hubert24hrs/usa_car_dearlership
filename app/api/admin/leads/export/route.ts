import { NextResponse, type NextRequest } from "next/server";
import Papa from "papaparse";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { LEAD_TYPE_LABELS } from "@/lib/leads/schema";

export const dynamic = "force-dynamic";

/** CSV export of leads (contact fields only — finance details are never exported). */
export async function GET(request: NextRequest) {
  try {
    await requirePermission("leads:read");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sp = request.nextUrl.searchParams;
  const where: Prisma.LeadWhereInput = {
    ...(sp.get("status") ? { status: sp.get("status") as never } : {}),
    ...(sp.get("type") ? { type: sp.get("type") as never } : {}),
  };
  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10_000,
    include: { vehicle: { select: { vin: true, year: true, make: true, model: true } } },
  });
  // Prefix cells that look like formulas to prevent CSV injection in spreadsheets.
  const safe = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  };
  const csv = Papa.unparse(
    leads.map((l) => ({
      created_at: l.createdAt.toISOString(),
      type: LEAD_TYPE_LABELS[l.type],
      status: l.status,
      first_name: safe(l.firstName),
      last_name: safe(l.lastName),
      email: safe(l.email),
      phone: safe(l.phone),
      sms_consent: l.smsConsent ? "yes" : "no",
      vehicle: l.vehicle ? `${l.vehicle.year} ${l.vehicle.make} ${l.vehicle.model}` : "",
      vin: l.vehicle?.vin ?? "",
      message: safe(l.message),
    })),
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
