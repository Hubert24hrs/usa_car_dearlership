"use server";

/**
 * Lead capture server actions. Defence in depth:
 *   1. Honeypot field + minimum fill time (silently accept & drop bots)
 *   2. Per-IP rate limits (minute + day)
 *   3. Zod validation (same schema as the client)
 *   4. Server Actions' built-in Origin check (CSRF)
 * Sensitive finance details are never emailed — staff view them in the CRM.
 */
import { headers } from "next/headers";
import type { z } from "zod";
import { prisma } from "@/lib/db";
import { leadConfirmationEmail, leadNotificationEmail, newsletterWelcomeEmail, type LeadEmailData } from "@/lib/email/templates";
import { leadRecipients, sendEmail } from "@/lib/email";
import { vehicleTitle } from "@/lib/format";
import type { Prisma } from "@/lib/generated/prisma/client";
import { SMS_CONSENT_TEXT } from "@/lib/legal";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { getClientIp, hashIp } from "@/lib/security";
import { getDealerProfile } from "@/lib/settings";
import { absoluteUrl, DEFAULT_DEALER_PROFILE } from "@/lib/site.config";
import { LEAD_TYPE_LABELS, leadSchema, newsletterSchema, type LeadActionResult } from "./schema";

const BOT_ID = "00000000-0000-4000-8000-000000000000";
const MIN_FILL_MS = 2500;

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

function looksLikeBot(raw: Record<string, unknown>): boolean {
  if (typeof raw.website === "string" && raw.website.trim() !== "") return true;
  if (typeof raw.startedAt === "number" && Date.now() - raw.startedAt < MIN_FILL_MS) return true;
  return false;
}

async function checkRateLimit(prefix: string) {
  const h = await headers();
  const ip = getClientIp(h);
  const [minute, day] = await Promise.all([
    rateLimit(`${prefix}:m:${ip}`, LIMITS.leadPerMinute),
    rateLimit(`${prefix}:d:${ip}`, LIMITS.leadPerDay),
  ]);
  return { ok: minute.success && day.success, ip, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}

export async function submitLead(input: unknown): Promise<LeadActionResult> {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  if (looksLikeBot(raw)) return { ok: true, id: BOT_ID };

  const limit = await checkRateLimit("lead");
  if (!limit.ok) {
    return { ok: false, error: "Too many requests from this device. Please wait a minute or give us a call." };
  }

  const parsed = leadSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  const data = parsed.data;

  const vehicle = data.vehicleId
    ? await prisma.vehicle.findUnique({
        where: { id: data.vehicleId },
        select: { id: true, year: true, make: true, model: true, trim: true, vin: true, stockNumber: true, displayPrice: true, slug: true, locationId: true },
      })
    : null;
  if (data.type === "CHECK_AVAILABILITY" && !vehicle) {
    return { ok: false, error: "That vehicle is no longer listed. Please refresh the page." };
  }

  const details = "details" in data && data.details ? (data.details as Record<string, unknown>) : null;
  const lead = await prisma.lead.create({
    data: {
      type: data.type,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email.toLowerCase(),
      phone: data.phone ?? null,
      preferredContact: data.preferredContact ?? null,
      message: data.message ?? null,
      smsConsent: data.smsConsent === true,
      smsConsentText: data.smsConsent === true ? SMS_CONSENT_TEXT : null,
      details: (details ?? undefined) as Prisma.InputJsonValue | undefined,
      vehicleId: vehicle?.id ?? null,
      locationId: data.locationId ?? vehicle?.locationId ?? null,
      sourcePath: data.sourcePath ?? null,
      ipHash: hashIp(limit.ip),
      userAgent: limit.userAgent,
    },
  });

  // Email delivery must never make the submission fail.
  try {
    const dealer = await getDealerProfile().catch(() => DEFAULT_DEALER_PROFILE);
    const emailData: LeadEmailData = {
      id: lead.id,
      type: lead.type,
      typeLabel: LEAD_TYPE_LABELS[data.type],
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      preferredContact: lead.preferredContact,
      message: lead.message,
      smsConsent: lead.smsConsent,
      // GLBA: never email applicants' financial details.
      details: data.type === "PRE_APPROVAL" ? { note: "Financial details available in the CRM (finance role)." } : details,
      vehicle: vehicle
        ? {
            title: vehicleTitle(vehicle),
            vin: vehicle.vin,
            stockNumber: vehicle.stockNumber,
            displayPrice: Number(vehicle.displayPrice),
            slug: vehicle.slug,
          }
        : null,
      sourcePath: lead.sourcePath,
    };
    const recipients = leadRecipients();
    const [notify] = await Promise.all([
      recipients.length
        ? sendEmail({ to: recipients, replyTo: lead.email, ...leadNotificationEmail(emailData, dealer) })
        : Promise.resolve({ ok: false }),
      sendEmail({ to: lead.email, ...leadConfirmationEmail(emailData, dealer) }),
    ]);
    if (notify.ok) await prisma.lead.update({ where: { id: lead.id }, data: { emailedAt: new Date() } });
  } catch (error) {
    console.error("[lead] email step failed:", error);
  }

  return { ok: true, id: lead.id };
}

export async function subscribeNewsletter(input: unknown): Promise<LeadActionResult> {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  if (looksLikeBot(raw)) return { ok: true, id: BOT_ID };
  const limit = await checkRateLimit("newsletter");
  if (!limit.ok) return { ok: false, error: "Too many requests. Please try again later." };
  const parsed = newsletterSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address.", fieldErrors: fieldErrors(parsed.error) };

  const email = parsed.data.email.toLowerCase();
  const subscriber = await prisma.newsletterSubscriber.upsert({
    where: { email },
    create: { email, dealAlerts: parsed.data.dealAlerts },
    update: { subscribed: true, unsubscribedAt: null, dealAlerts: parsed.data.dealAlerts },
  });
  const unsubscribeUrl = absoluteUrl(`/api/unsubscribe?type=newsletter&token=${subscriber.unsubscribeToken}`);
  await sendEmail({ to: email, unsubscribeUrl, ...newsletterWelcomeEmail(unsubscribeUrl) }).catch(() => undefined);
  return { ok: true, id: subscriber.id };
}
