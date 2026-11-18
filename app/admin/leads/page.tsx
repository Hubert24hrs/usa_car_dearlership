import { Download, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LeadControls } from "@/components/admin/lead-panel";
import { Button } from "@/components/ui/button";
import { requirePagePermission } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { LEAD_TYPE_LABELS } from "@/lib/leads/schema";
import { formatDate, formatPrice, vehicleTitle } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Leads" };

type Props = { searchParams: Promise<Record<string, string | undefined>> };
const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-cta/10 text-cta",
  CONTACTED: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  QUALIFIED: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  APPOINTMENT_SET: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  WON: "bg-ev-soft text-ev-strong",
  LOST: "bg-muted text-muted-foreground",
};

export default async function LeadsPage({ searchParams }: Props) {
  const user = await requirePagePermission("leads:read");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const where: Prisma.LeadWhereInput = {
    AND: [
      sp.status ? { status: sp.status as never } : {},
      sp.type ? { type: sp.type as never } : {},
      sp.mine === "1" ? { assignedToId: user.id } : {},
      q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {},
    ],
  };
  const [leads, staff, selected] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { vehicle: { select: { year: true, make: true, model: true, trim: true } }, assignedTo: { select: { name: true, email: true } } },
    }),
    prisma.user.findMany({ where: { role: { in: ["ADMIN", "SALES", "FINANCE"] }, isActive: true }, select: { id: true, name: true, email: true } }),
    sp.id && /^[0-9a-f-]{36}$/i.test(sp.id)
      ? prisma.lead.findUnique({
          where: { id: sp.id },
          include: {
            vehicle: { select: { slug: true, year: true, make: true, model: true, trim: true, vin: true, stockNumber: true, displayPrice: true } },
            location: { select: { name: true } },
            notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true, email: true } } } },
          },
        })
      : null,
  ]);
  // GLBA: finance applications are visible to finance/admin roles only.
  const canSeeFinance = can(user.role, "pricing:read-base");
  const baseParams = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => Boolean(e[1]) && e[0] !== "id"));
  /** Current filters (+ optional selected lead id) as a query string. */
  const link = (id?: string) => {
    const p = new URLSearchParams(baseParams);
    if (id) p.set("id", id);
    return `?${p.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground">Latest 100 leads matching filters.</p>
        </div>
        <Button asChild variant="outline">
          <a href={`/api/admin/leads/export${link().replace(/^\?$/, "")}`}>
            <Download /> Export CSV
          </a>
        </Button>
      </div>
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Email, last name or phone" className="h-9 min-w-56 flex-1 rounded-md border bg-background px-3 text-sm" aria-label="Search leads" />
        <select name="status" defaultValue={sp.status ?? ""} className="h-9 rounded-md border bg-background px-2 text-sm" aria-label="Status">
          <option value="">All statuses</option>
          {Object.keys(STATUS_STYLES).map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ").toLowerCase()}
            </option>
          ))}
        </select>
        <select name="type" defaultValue={sp.type ?? ""} className="h-9 rounded-md border bg-background px-2 text-sm" aria-label="Lead type">
          <option value="">All types</option>
          {Object.entries(LEAD_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="mine" value="1" defaultChecked={sp.mine === "1"} /> Assigned to me
        </label>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <div className={cn("grid gap-6", selected && "xl:grid-cols-[1fr_440px]")}>
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Received</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Type</th>
                <th className="p-3">Vehicle</th>
                <th className="p-3">Status</th>
                <th className="p-3">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {leads.map((lead) => (
                <tr key={lead.id} className={cn("hover:bg-muted/40", selected?.id === lead.id && "bg-muted/60")}>
                  <td className="whitespace-nowrap p-3 text-muted-foreground">{formatDate(lead.createdAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                  <td className="p-3">
                    <Link href={link(lead.id)} className="font-medium hover:underline">
                      {lead.firstName} {lead.lastName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{lead.email}</p>
                  </td>
                  <td className="p-3">{LEAD_TYPE_LABELS[lead.type]}</td>
                  <td className="max-w-48 truncate p-3">{lead.vehicle ? vehicleTitle(lead.vehicle) : "N/A"}</td>
                  <td className="p-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_STYLES[lead.status])}>{lead.status.replace("_", " ").toLowerCase()}</span>
                  </td>
                  <td className="p-3 text-muted-foreground">{lead.assignedTo?.name ?? lead.assignedTo?.email ?? "Unassigned"}</td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No leads match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selected && (
          <aside className="space-y-5 rounded-2xl border bg-card p-5" aria-label="Lead details">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">
                  {selected.firstName} {selected.lastName}
                </h2>
                <p className="text-sm text-muted-foreground">{LEAD_TYPE_LABELS[selected.type]} · {formatDate(selected.createdAt, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
              </div>
              <Link href={link()} aria-label="Close details" className="rounded p-1 hover:bg-muted">
                <X className="size-4" />
              </Link>
            </div>
            <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">Email</dt>
              <dd>
                <a href={`mailto:${selected.email}`} className="hover:underline">
                  {selected.email}
                </a>
              </dd>
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{selected.phone ? <a href={`tel:${selected.phone}`} className="hover:underline">{selected.phone}</a> : "N/A"}</dd>
              <dt className="text-muted-foreground">Prefers</dt>
              <dd>{selected.preferredContact ?? "N/A"}</dd>
              <dt className="text-muted-foreground">SMS consent</dt>
              <dd>{selected.smsConsent ? "Yes (TCPA consent text saved)" : "No"}</dd>
              <dt className="text-muted-foreground">Location</dt>
              <dd>{selected.location?.name ?? "N/A"}</dd>
              <dt className="text-muted-foreground">Source</dt>
              <dd className="truncate">{selected.sourcePath ?? "N/A"}</dd>
            </dl>
            {selected.vehicle && (
              <div className="rounded-xl bg-muted/60 p-3 text-sm">
                <Link href={`/inventory/${selected.vehicle.slug}`} target="_blank" className="font-medium hover:underline">
                  {vehicleTitle(selected.vehicle)}
                </Link>
                <p className="text-xs text-muted-foreground">
                  VIN {selected.vehicle.vin} · #{selected.vehicle.stockNumber} · {formatPrice(Number(selected.vehicle.displayPrice))}
                </p>
              </div>
            )}
            {selected.message && <p className="whitespace-pre-wrap rounded-xl border p-3 text-sm">{selected.message}</p>}
            {selected.details && (selected.type !== "PRE_APPROVAL" || canSeeFinance) ? (
              <div>
                <h3 className="mb-1 text-sm font-semibold">Details</h3>
                <dl className="grid grid-cols-[150px_1fr] gap-x-3 gap-y-1 text-sm">
                  {Object.entries(selected.details as Record<string, unknown>).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-muted-foreground">{k.replace(/([A-Z])/g, " $1").toLowerCase()}</dt>
                      <dd>{typeof v === "boolean" ? (v ? "yes" : "no") : String(v ?? "N/A")}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : selected.type === "PRE_APPROVAL" ? (
              <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Finance application details are restricted to finance and admin roles.</p>
            ) : null}
            {can(user.role, "leads:write") && (
              <LeadControls
                id={selected.id}
                status={selected.status}
                assignedToId={selected.assignedToId}
                staff={staff.map((s) => ({ id: s.id, label: s.name ?? s.email }))}
              />
            )}
            <div>
              <h3 className="mb-2 text-sm font-semibold">Notes</h3>
              <ul className="space-y-2 text-sm">
                {selected.notes.map((n) => (
                  <li key={n.id} className="rounded-xl bg-muted/50 p-3">
                    <p className="whitespace-pre-wrap">{n.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {n.author?.name ?? n.author?.email ?? "System"} · {formatDate(n.createdAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  </li>
                ))}
                {selected.notes.length === 0 && <li className="text-muted-foreground">No notes yet.</li>}
              </ul>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
