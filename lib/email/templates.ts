/**
 * Minimal, inline-styled email templates (render well in Gmail/Outlook).
 * All dynamic values are HTML-escaped.
 */
import { formatPrice } from "@/lib/format";
import { absoluteUrl, DEFAULT_DEALER_PROFILE, type DealerProfile } from "@/lib/site.config";

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, body: string, dealer: DealerProfile, footerExtra = "") {
  return `<!doctype html><html><body style="margin:0;background:#f7f8fa;font-family:Inter,Segoe UI,Arial,sans-serif;color:#111827">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;padding:24px 0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
<tr><td style="background:#0b1f3a;padding:20px 28px;color:#ffffff;font-size:18px;font-weight:700">${escapeHtml(dealer.name)}</td></tr>
<tr><td style="padding:28px"><h1 style="margin:0 0 16px;font-size:20px;line-height:1.3">${escapeHtml(title)}</h1>${body}</td></tr>
<tr><td style="padding:20px 28px;background:#f3f4f6;font-size:12px;color:#6b7280;line-height:1.5">
${escapeHtml(dealer.legalName)} · ${escapeHtml(dealer.address)} · ${escapeHtml(dealer.phone)}<br/>Dealer license ${escapeHtml(dealer.licenseNumber)}${footerExtra}
</td></tr></table></td></tr></table></body></html>`;
}

function rows(entries: [string, unknown][]) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px">${entries
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;color:#6b7280;width:38%;vertical-align:top">${escapeHtml(k)}</td><td style="padding:6px 0">${escapeHtml(v)}</td></tr>`,
    )
    .join("")}</table>`;
}

export type LeadEmailData = {
  id: string;
  type: string;
  typeLabel: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  preferredContact?: string | null;
  message?: string | null;
  smsConsent: boolean;
  details?: Record<string, unknown> | null;
  vehicle?: { title: string; vin: string; stockNumber: string; displayPrice: number; slug: string } | null;
  sourcePath?: string | null;
};

export function leadNotificationEmail(lead: LeadEmailData, dealer: DealerProfile = DEFAULT_DEALER_PROFILE) {
  const detailRows = Object.entries(lead.details ?? {}).map(([k, v]) => [k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()), Array.isArray(v) ? v.join(", ") : v] as [string, unknown]);
  const vehicleBlock = lead.vehicle
    ? `<p style="margin:16px 0 8px;font-weight:600">Vehicle</p>${rows([
        ["Vehicle", lead.vehicle.title],
        ["VIN", lead.vehicle.vin],
        ["Stock #", lead.vehicle.stockNumber],
        ["Listed price", formatPrice(lead.vehicle.displayPrice)],
        ["Link", absoluteUrl(`/inventory/${lead.vehicle.slug}`)],
      ])}`
    : "";
  const body = `${rows([
    ["Lead type", lead.typeLabel],
    ["Name", `${lead.firstName} ${lead.lastName}`],
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["Preferred contact", lead.preferredContact],
    ["SMS consent", lead.smsConsent ? "Yes (TCPA consent captured)" : "No"],
    ["Message", lead.message],
    ["Submitted from", lead.sourcePath],
  ])}${vehicleBlock}${detailRows.length ? `<p style="margin:16px 0 8px;font-weight:600">Details</p>${rows(detailRows)}` : ""}
<p style="margin:24px 0 0"><a href="${escapeHtml(absoluteUrl(`/admin/leads?id=${lead.id}`))}" style="background:#c9441f;color:#ffffff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600">Open in CRM</a></p>`;
  const text = [
    `New ${lead.typeLabel} lead`,
    `Name: ${lead.firstName} ${lead.lastName}`,
    `Email: ${lead.email}`,
    lead.phone ? `Phone: ${lead.phone}` : "",
    lead.message ? `Message: ${lead.message}` : "",
    lead.vehicle ? `Vehicle: ${lead.vehicle.title} (VIN ${lead.vehicle.vin}) ${absoluteUrl(`/inventory/${lead.vehicle.slug}`)}` : "",
    ...detailRows.map(([k, v]) => `${k}: ${String(v)}`),
    `CRM: ${absoluteUrl(`/admin/leads?id=${lead.id}`)}`,
  ]
    .filter(Boolean)
    .join("\n");
  return {
    subject: `New lead: ${lead.typeLabel}${lead.vehicle ? ` — ${lead.vehicle.title}` : ""} (${lead.firstName} ${lead.lastName})`,
    html: layout(`New ${lead.typeLabel} lead`, body, dealer),
    text,
  };
}

export function leadConfirmationEmail(lead: LeadEmailData, dealer: DealerProfile = DEFAULT_DEALER_PROFILE) {
  const what = lead.vehicle ? `the ${escapeHtml(lead.vehicle.title)}` : "your request";
  const body = `<p style="font-size:15px;line-height:1.6">Hi ${escapeHtml(lead.firstName)},</p>
<p style="font-size:15px;line-height:1.6">Thanks for reaching out about ${what}. A member of our team will get back to you shortly — usually within one business hour during open hours.</p>
${lead.vehicle ? `<p style="font-size:15px;line-height:1.6"><a href="${escapeHtml(absoluteUrl(`/inventory/${lead.vehicle.slug}`))}" style="color:#0b1f3a;font-weight:600">View the vehicle</a></p>` : ""}
<p style="font-size:15px;line-height:1.6">Need us sooner? Call ${escapeHtml(dealer.phone)}.</p>`;
  return {
    subject: `We received your request — ${dealer.name}`,
    html: layout("We got your request", body, dealer),
    text: `Hi ${lead.firstName},\n\nThanks for reaching out about ${lead.vehicle ? `the ${lead.vehicle.title}` : "your request"}. Our team will get back to you shortly.\n\nCall ${dealer.phone} if you need us sooner.\n\n${dealer.name}`,
  };
}

export function savedSearchAlertEmail(
  data: {
    name: string;
    searchUrl: string;
    unsubscribeUrl: string;
    vehicles: { title: string; slug: string; displayPrice: number; displayMonthlyPayment: number; mileage: number }[];
  },
  dealer: DealerProfile = DEFAULT_DEALER_PROFILE,
) {
  const items = data.vehicles
    .slice(0, 10)
    .map(
      (v) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb"><a href="${escapeHtml(absoluteUrl(`/inventory/${v.slug}`))}" style="color:#0b1f3a;font-weight:600;text-decoration:none">${escapeHtml(v.title)}</a><br/>
<span style="color:#6b7280;font-size:13px">${formatPrice(v.displayPrice)} · Est. ${formatPrice(v.displayMonthlyPayment)}/mo* · ${v.mileage.toLocaleString("en-US")} mi</span></td></tr>`,
    )
    .join("");
  const body = `<p style="font-size:15px;line-height:1.6">${data.vehicles.length} new ${data.vehicles.length === 1 ? "vehicle matches" : "vehicles match"} your saved search <strong>${escapeHtml(data.name)}</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table>
<p style="margin:20px 0 0"><a href="${escapeHtml(data.searchUrl)}" style="background:#c9441f;color:#ffffff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600">See all matches</a></p>
<p style="font-size:11px;color:#6b7280;margin-top:20px">*Estimated payment; see site for terms. Prices exclude tax, title, license and dealer fees.</p>`;
  return {
    subject: `${data.vehicles.length} new match${data.vehicles.length === 1 ? "" : "es"} for "${data.name}"`,
    html: layout("New vehicles for your saved search", body, dealer, `<br/><a href="${escapeHtml(data.unsubscribeUrl)}" style="color:#6b7280">Unsubscribe from this alert</a>`),
    text: `New matches for "${data.name}":\n${data.vehicles
      .map((v) => `- ${v.title} — ${formatPrice(v.displayPrice)} ${absoluteUrl(`/inventory/${v.slug}`)}`)
      .join("\n")}\n\nSee all: ${data.searchUrl}\nUnsubscribe: ${data.unsubscribeUrl}`,
  };
}

export function newsletterWelcomeEmail(unsubscribeUrl: string, dealer: DealerProfile = DEFAULT_DEALER_PROFILE) {
  const body = `<p style="font-size:15px;line-height:1.6">You're on the list! We'll send new arrivals, price drops and deal alerts — never more than a couple of times a month.</p>`;
  return {
    subject: `You're subscribed to ${dealer.name} deal alerts`,
    html: layout("Welcome aboard", body, dealer, `<br/><a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b7280">Unsubscribe</a>`),
    text: `You're subscribed to ${dealer.name} deal alerts.\nUnsubscribe: ${unsubscribeUrl}`,
  };
}
