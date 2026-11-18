"use client";

import { ArrowDown, ArrowUp, ImagePlus, Loader2, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VehicleImage } from "@/components/vehicle/vehicle-image";
import { saveVehicle, uploadVehicleImages } from "@/lib/admin/actions";
import { BODY_STYLES, CONDITIONS, DRIVETRAINS, FUEL_TYPES } from "@/lib/inventory/constants";
import { PRICING_CONFIG } from "@/lib/pricing.config";

export type VehicleFormValues = Record<string, string | boolean | string[]>;

function Text({ name, label, values, set, type = "text", required, hint }: {
  name: string;
  label: string;
  values: VehicleFormValues;
  set: (name: string, value: string) => void;
  type?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Input id={name} type={type} value={String(values[name] ?? "")} onChange={(e) => set(name, e.target.value)} aria-required={required} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Select({ name, label, values, set, options }: {
  name: string;
  label: string;
  values: VehicleFormValues;
  set: (name: string, value: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <select id={name} value={String(values[name] ?? "")} onChange={(e) => set(name, e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function VehicleForm({
  initial,
  vehicleId,
  locations,
  showBasePricing,
}: {
  initial: VehicleFormValues;
  vehicleId?: string;
  locations: { slug: string; name: string }[];
  showBasePricing: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<VehicleFormValues>(initial);
  const [images, setImages] = useState<string[]>((initial.images as string[]) ?? []);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (name: string, value: string | boolean) => setValues((v) => ({ ...v, [name]: value }));
  const fuel = String(values.fuel_type);
  const plug = fuel === "ELECTRIC" || fuel === "PLUG_IN_HYBRID";

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const data = new FormData();
    for (const f of Array.from(files)) data.append("files", f);
    setUploading(true);
    const result = await uploadVehicleImages(data);
    setUploading(false);
    if (result.ok && result.data) {
      setImages((list) => [...list, ...result.data!.urls]);
      toast.success(`Uploaded ${result.data.urls.length} image(s)`);
    } else if (!result.ok) toast.error(result.error);
    if (fileRef.current) fileRef.current.value = "";
  }

  function move(index: number, delta: number) {
    setImages((list) => {
      const next = [...list];
      const target = index + delta;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const lines = (key: string) => String(values[key] ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
    const record: Record<string, unknown> = {
      ...values,
      features: lines("features"),
      safety_features: lines("safety_features"),
      images,
      is_featured: values.is_featured === true,
    };
    if (!showBasePricing && vehicleId) {
      delete record.base_price;
      delete record.base_down_payment;
      delete record.base_monthly_payment;
    }
    startTransition(async () => {
      const result = await saveVehicle(record, vehicleId);
      if (!result.ok) {
        toast.error(result.error, { duration: 8000 });
        return;
      }
      toast.success("Vehicle saved — pricing recalculated.");
      router.push(`/admin/inventory/${result.data!.id}`);
      router.refresh();
    });
  }

  const multipliers = PRICING_CONFIG.multipliers;
  return (
    <form onSubmit={submit} className="space-y-8">
      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="font-semibold">Identification</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Text name="vin" label="VIN" values={values} set={set} required />
          <Text name="stock_number" label="Stock #" values={values} set={set} required />
          <Select name="condition" label="Condition" values={values} set={set} options={CONDITIONS} />
          <Select name="status" label="Status" values={values} set={set} options={[{ value: "AVAILABLE", label: "Available" }, { value: "PENDING", label: "Pending" }, { value: "SOLD", label: "Sold" }]} />
          <Text name="year" label="Year" type="number" values={values} set={set} required />
          <Text name="make" label="Make" values={values} set={set} required />
          <Text name="model" label="Model" values={values} set={set} required />
          <Text name="trim" label="Trim" values={values} set={set} />
          <Select name="body_style" label="Body style" values={values} set={set} options={BODY_STYLES} />
          <Select name="fuel_type" label="Fuel type" values={values} set={set} options={FUEL_TYPES} />
          <Select name="drivetrain" label="Drivetrain" values={values} set={set} options={DRIVETRAINS} />
          <Select name="location" label="Location" values={values} set={set} options={locations.map((l) => ({ value: l.slug, label: l.name }))} />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="font-semibold">Specs</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Text name="mileage" label="Mileage" type="number" values={values} set={set} />
          <Text name="engine" label="Engine" values={values} set={set} />
          <Text name="transmission" label="Transmission" values={values} set={set} />
          <Text name="exterior_color" label="Exterior color" values={values} set={set} />
          <Text name="interior_color" label="Interior color" values={values} set={set} />
          {fuel !== "ELECTRIC" && (
            <>
              <Text name="mpg_city" label="City MPG" type="number" values={values} set={set} />
              <Text name="mpg_highway" label="Highway MPG" type="number" values={values} set={set} />
              <Text name="mpg_combined" label="Combined MPG" type="number" values={values} set={set} hint="Auto-calculated if blank" />
            </>
          )}
          {plug && (
            <>
              <Text name="ev_range_miles" label="Electric range (mi)" type="number" values={values} set={set} />
              <Text name="ev_battery_kwh" label="Battery (kWh)" type="number" values={values} set={set} />
            </>
          )}
          {fuel === "ELECTRIC" && (
            <>
              <Text name="ev_dc_fast_charge_min" label="DC fast charge 10–80% (min)" type="number" values={values} set={set} />
              <Select name="ev_charge_port" label="Charge port" values={values} set={set} options={[{ value: "", label: "—" }, { value: "NACS", label: "NACS (J3400)" }, { value: "CCS", label: "CCS1" }]} />
            </>
          )}
        </div>
      </section>

      {(showBasePricing || !vehicleId) && (
        <section className="space-y-4 rounded-2xl border bg-card p-5">
          <div>
            <h2 className="font-semibold">Base pricing (dealer feed values — admin only)</h2>
            <p className="text-sm text-muted-foreground">
              Public prices are calculated automatically: price ×{multipliers.vehiclePrice} (nearest $100), down payment ×{multipliers.downPayment} (nearest $50),
              monthly ×{multipliers.monthlyPayment} (nearest $1) — or the current admin override. Leave down/monthly blank to derive them.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Text name="base_price" label="Base price" type="number" values={values} set={set} required />
            <Text name="base_down_payment" label="Base down payment" type="number" values={values} set={set} />
            <Text name="base_monthly_payment" label="Base monthly payment" type="number" values={values} set={set} />
          </div>
        </section>
      )}

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="font-semibold">Features & description</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="features">Features (one per line)</Label>
            <Textarea id="features" rows={8} value={String(values.features ?? "")} onChange={(e) => set("features", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="safety_features">Safety features (one per line)</Label>
            <Textarea id="safety_features" rows={8} value={String(values.safety_features ?? "")} onChange={(e) => set("safety_features", e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Description / dealer comments</Label>
          <Textarea id="description" rows={4} value={String(values.description ?? "")} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Text name="video_url" label="Video URL (YouTube, Vimeo or MP4)" values={values} set={set} />
          <Text name="carfax_url" label="Vehicle history report URL" values={values} set={set} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={values.is_featured === true} onChange={(e) => set("is_featured", e.target.checked)} /> Featured on homepage
        </label>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Photos ({images.length})</h2>
          <div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" id="vehicle-photos" onChange={(e) => upload(e.target.files)} />
            <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />} Upload photos
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">JPEG, PNG, WebP or AVIF up to 10 MB each. The first photo is the main image.</p>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {images.map((src, i) => (
            <li key={`${src}-${i}`} className="group relative overflow-hidden rounded-xl border">
              <div className="relative aspect-[4/3] bg-muted">
                <VehicleImage src={src} alt={`Photo ${i + 1}`} fill sizes="160px" />
              </div>
              <div className="flex items-center justify-between p-1">
                <span className="px-1 text-xs text-muted-foreground">{i === 0 ? "Main" : i + 1}</span>
                <div className="flex">
                  <Button type="button" variant="ghost" size="icon-xs" aria-label="Move left" onClick={() => move(i, -1)}>
                    <ArrowUp className="-rotate-90" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-xs" aria-label="Move right" onClick={() => move(i, 1)}>
                    <ArrowDown className="-rotate-90" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-xs" aria-label="Remove photo" onClick={() => setImages((l) => l.filter((_, j) => j !== i))}>
                    <X />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" size="lg" disabled={pending} className="bg-cta text-cta-foreground shadow-lift hover:bg-cta-hover">
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Save vehicle
        </Button>
      </div>
    </form>
  );
}
