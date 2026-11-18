"use client";

import { Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteVehicle, updateVehicleFlags } from "@/lib/admin/actions";
import { cn } from "@/lib/utils";

export function VehicleRowActions({
  id,
  status,
  isFeatured,
  canWrite,
  canDelete,
  title,
}: {
  id: string;
  status: "AVAILABLE" | "PENDING" | "SOLD";
  isFeatured: boolean;
  canWrite: boolean;
  canDelete: boolean;
  title: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        toast.success(success);
        router.refresh();
      } else toast.error(result.error ?? "Failed");
    });

  return (
    <div className="flex items-center gap-1.5">
      <select
        aria-label={`Status for ${title}`}
        defaultValue={status}
        disabled={!canWrite || pending}
        onChange={(e) => run(() => updateVehicleFlags(id, { status: e.target.value as typeof status }), "Status updated")}
        className="h-8 rounded-md border bg-background px-2 text-xs"
      >
        <option value="AVAILABLE">Available</option>
        <option value="PENDING">Pending</option>
        <option value="SOLD">Sold</option>
      </select>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={!canWrite || pending}
        aria-pressed={isFeatured}
        aria-label={isFeatured ? `Unfeature ${title}` : `Feature ${title}`}
        onClick={() => run(() => updateVehicleFlags(id, { isFeatured: !isFeatured }), isFeatured ? "Removed from featured" : "Featured")}
      >
        <Star className={cn(isFeatured && "fill-amber-400 text-amber-500")} />
      </Button>
      {canDelete && (
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={pending}
          aria-label={`Delete ${title}`}
          onClick={() => {
            if (window.confirm(`Permanently delete ${title}? This cannot be undone. Consider marking it Sold instead.`)) {
              run(() => deleteVehicle(id), "Vehicle deleted");
            }
          }}
        >
          <Trash2 className="text-destructive" />
        </Button>
      )}
    </div>
  );
}
