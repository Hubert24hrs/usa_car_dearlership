"use client";

import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { compareStore } from "@/lib/client-store";
import { MAX_COMPARE } from "@/lib/inventory/constants";
import { cn } from "@/lib/utils";

export function CompareToggle({ vehicleId, title, className }: { vehicleId: string; title: string; className?: string }) {
  const list = compareStore.useList();
  const checked = list.includes(vehicleId);
  const id = `compare-${vehicleId}`;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => {
          if (value === true) {
            if (list.length >= MAX_COMPARE) {
              toast.warning(`You can compare up to ${MAX_COMPARE} vehicles`, { description: "Remove one to add another." });
              return;
            }
            compareStore.add(vehicleId);
          } else {
            compareStore.remove(vehicleId);
          }
        }}
        aria-label={`Compare ${title}`}
      />
      <label htmlFor={id} className="cursor-pointer select-none text-sm text-muted-foreground">
        Compare
      </label>
    </div>
  );
}
