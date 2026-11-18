"use client";

import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveLocation } from "@/lib/admin/actions";

type Hours = { day: string; open: string | null; close: string | null }[];
export type LocationValues = {
  name: string;
  slug: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  smsPhone: string;
  email: string;
  latitude: number;
  longitude: number;
  salesHours: Hours;
  serviceHours: Hours;
  isPrimary: boolean;
};


function HoursEditor({ label, value, onChange }: { label: string; value: Hours; onChange: (h: Hours) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      {value.map((h, i) => (
        <div key={h.day} className="grid grid-cols-[48px_1fr_1fr_auto] items-center gap-2 text-sm">
          <span>{h.day}</span>
          <Input type="time" aria-label={`${label} ${h.day} open`} value={h.open ?? ""} disabled={!h.open} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, open: e.target.value } : x)))} />
          <Input type="time" aria-label={`${label} ${h.day} close`} value={h.close ?? ""} disabled={!h.open} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, close: e.target.value } : x)))} />
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={!h.open}
              onChange={(e) => onChange(value.map((x, j) => (j === i ? (e.target.checked ? { ...x, open: null, close: null } : { ...x, open: "09:00", close: "18:00" }) : x)))}
            />
            Closed
          </label>
        </div>
      ))}
    </fieldset>
  );
}

export function LocationForm({ id, initial }: { id?: string; initial: LocationValues }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [pending, startTransition] = useTransition();
  const field = (key: keyof LocationValues, label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={`${id ?? "new"}-${key}`}>{label}</Label>
      <Input
        id={`${id ?? "new"}-${key}`}
        type={type}
        step={type === "number" ? "any" : undefined}
        value={String(v[key] ?? "")}
        onChange={(e) => setV({ ...v, [key]: type === "number" ? Number(e.target.value) : e.target.value })}
      />
    </div>
  );
  return (
    <form
      className="space-y-5 rounded-2xl border bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await saveLocation(
            { ...v, address2: v.address2 || null, smsPhone: v.smsPhone || null, email: v.email || null },
            id,
          );
          if (result.ok) {
            toast.success(result.message ?? "Saved");
            router.refresh();
          } else toast.error(result.error);
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {field("name", "Name")}
        {field("slug", "URL slug")}
        {field("phone", "Phone")}
        {field("smsPhone", "SMS phone")}
        {field("address1", "Address")}
        {field("address2", "Address line 2")}
        {field("city", "City")}
        {field("state", "State (2 letters)")}
        {field("zip", "ZIP")}
        {field("email", "Email", "email")}
        {field("latitude", "Latitude", "number")}
        {field("longitude", "Longitude", "number")}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={v.isPrimary} onChange={(e) => setV({ ...v, isPrimary: e.target.checked })} /> Primary location (default for imports)
      </label>
      <div className="grid gap-6 lg:grid-cols-2">
        <HoursEditor label="Sales hours" value={v.salesHours} onChange={(salesHours) => setV({ ...v, salesHours })} />
        <HoursEditor label="Service hours" value={v.serviceHours} onChange={(serviceHours) => setV({ ...v, serviceHours })} />
      </div>
      <Button type="submit" disabled={pending} className="bg-cta text-cta-foreground hover:bg-cta-hover">
        {pending ? <Loader2 className="animate-spin" /> : <Save />} {id ? "Save location" : "Add location"}
      </Button>
    </form>
  );
}
