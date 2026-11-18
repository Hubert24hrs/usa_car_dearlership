import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({ type: z.enum(["alert", "newsletter"]), token: z.uuid() });

async function unsubscribe(type: "alert" | "newsletter", token: string) {
  if (type === "alert") {
    await prisma.savedSearch.updateMany({ where: { unsubscribeToken: token }, data: { alertsEnabled: false } });
  } else {
    await prisma.newsletterSubscriber.updateMany({
      where: { unsubscribeToken: token },
      data: { subscribed: false, unsubscribedAt: new Date() },
    });
  }
}

/** One-click unsubscribe (RFC 8058 List-Unsubscribe-Post) and form posts from /unsubscribe. */
export async function POST(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  if (request.headers.get("content-type")?.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    for (const key of ["type", "token"]) {
      const value = form.get(key);
      if (typeof value === "string") params[key] = value;
    }
  }
  const parsed = schema.safeParse(params);
  if (!parsed.success) return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  await unsubscribe(parsed.data.type, parsed.data.token);
  if (request.headers.get("accept")?.includes("text/html")) {
    return NextResponse.redirect(new URL(`/unsubscribe?done=1`, request.url), 303);
  }
  return NextResponse.json({ ok: true });
}

/** Links in emails land on a confirmation page (avoids unsubscribes by link scanners). */
export function GET(request: NextRequest) {
  const url = new URL("/unsubscribe", request.url);
  request.nextUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value));
  return NextResponse.redirect(url, 303);
}
