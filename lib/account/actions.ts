"use server";

/**
 * Customer account actions: sign-up, saved vehicles sync, saved searches.
 */
import { headers } from "next/headers";
import { z } from "zod";
import { auth, hashPassword, passwordSchema, signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.email("Enter a valid email").max(254),
  password: passwordSchema,
  website: z.string().optional(),
});

export async function signUpCustomer(input: unknown): Promise<Result> {
  const raw = (input ?? {}) as Record<string, unknown>;
  if (typeof raw.website === "string" && raw.website) return { ok: false, error: "Unable to create account." };
  const ip = getClientIp(await headers());
  if (!(await rateLimit(`signup:${ip}`, LIMITS.signUp)).success) {
    return { ok: false, error: "Too many attempts. Please try again later." };
  }
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }
  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { ok: false, error: "An account with that email already exists. Try signing in." };
  await prisma.user.create({
    data: { email, name: parsed.data.name, passwordHash: await hashPassword(parsed.data.password), role: "CUSTOMER" },
  });
  await signIn("credentials", { email, password: parsed.data.password, redirect: false });
  return { ok: true };
}

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Merge the browser's saved list into the account and return the combined list. */
export async function syncSavedVehicles(localIds: string[]): Promise<string[] | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const ids = z.array(z.uuid()).max(100).catch([]).parse(localIds);
  if (ids.length) {
    const existing = await prisma.vehicle.findMany({ where: { id: { in: ids } }, select: { id: true } });
    await prisma.savedVehicle.createMany({
      data: existing.map((v) => ({ userId, vehicleId: v.id })),
      skipDuplicates: true,
    });
  }
  const saved = await prisma.savedVehicle.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { vehicleId: true } });
  return saved.map((s) => s.vehicleId);
}

export async function setVehicleSaved(vehicleId: string, saved: boolean): Promise<Result> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in" };
  if (!z.uuid().safeParse(vehicleId).success) return { ok: false, error: "Invalid vehicle" };
  if (saved) {
    const exists = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true } });
    if (!exists) return { ok: false, error: "Vehicle not found" };
    await prisma.savedVehicle.upsert({
      where: { userId_vehicleId: { userId, vehicleId } },
      create: { userId, vehicleId },
      update: {},
    });
  } else {
    await prisma.savedVehicle.deleteMany({ where: { userId, vehicleId } });
  }
  return { ok: true };
}

const saveSearchSchema = z.object({
  name: z.string().trim().min(1).max(120),
  url: z
    .string()
    .max(2000)
    .refine((u) => u.startsWith("/inventory"), "Invalid search URL"),
  email: z.email().max(254).optional(),
  alertsEnabled: z.boolean().default(true),
  frequency: z.enum(["DAILY", "WEEKLY"]).default("DAILY"),
  website: z.string().optional(),
});

export async function saveSearch(input: unknown): Promise<Result<{ id: string }>> {
  const raw = (input ?? {}) as Record<string, unknown>;
  if (typeof raw.website === "string" && raw.website) return { ok: true };
  const ip = getClientIp(await headers());
  if (!(await rateLimit(`savesearch:${ip}`, LIMITS.leadPerMinute)).success) {
    return { ok: false, error: "Too many requests. Please try again shortly." };
  }
  const parsed = saveSearchSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Please enter a valid email address." };
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const email = (session?.user?.email ?? parsed.data.email)?.toLowerCase();
  if (!email) return { ok: false, error: "Enter your email to get alerts." };
  const count = await prisma.savedSearch.count({ where: { email } });
  if (count >= 25) return { ok: false, error: "You already have 25 saved searches. Remove one to add another." };
  const search = await prisma.savedSearch.create({
    data: {
      userId,
      email,
      name: parsed.data.name,
      url: parsed.data.url,
      alertsEnabled: parsed.data.alertsEnabled,
      frequency: parsed.data.frequency,
      lastNotifiedAt: new Date(),
    },
  });
  return { ok: true, data: { id: search.id } };
}

export async function listMySavedSearches() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const rows = await prisma.savedSearch.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, url: true, alertsEnabled: true, frequency: true, createdAt: true },
  });
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

export async function deleteMySavedSearch(id: string): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in" };
  await prisma.savedSearch.deleteMany({ where: { id, userId: session.user.id } });
  return { ok: true };
}

export async function toggleMySavedSearchAlerts(id: string, enabled: boolean): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in" };
  await prisma.savedSearch.updateMany({ where: { id, userId: session.user.id }, data: { alertsEnabled: enabled } });
  return { ok: true };
}
