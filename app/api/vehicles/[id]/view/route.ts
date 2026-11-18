import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, isSameOrigin } from "@/lib/security";

/** VDP view counter (powers "most viewed" in the admin). One count per IP per vehicle per hour. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSameOrigin(request) || !z.uuid().safeParse(id).success) return new NextResponse(null, { status: 204 });
  const ip = getClientIp(request.headers);
  const limited = await rateLimit(`view:${ip}:${id}`, { limit: 1, windowMs: 3_600_000 });
  if (limited.success) {
    await prisma.vehicle.updateMany({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => undefined);
  }
  return new NextResponse(null, { status: 204 });
}
