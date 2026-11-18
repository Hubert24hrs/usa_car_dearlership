"use client";

import { Heart } from "lucide-react";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { useSavedVehicles } from "./use-saved-vehicles";

export function SaveButton({
  vehicleId,
  vin,
  title,
  price,
  className,
  withLabel = false,
}: {
  vehicleId: string;
  vin?: string;
  title: string;
  price?: number;
  className?: string;
  withLabel?: boolean;
}) {
  const { isSaved, toggle } = useSavedVehicles();
  const saved = isSaved(vehicleId);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from saved vehicles` : `Save ${title}`}
      onClick={(event) => {
        event.preventDefault();
        const nowSaved = toggle(vehicleId);
        if (nowSaved) {
          track({ name: "add_to_wishlist", params: { vin, item_name: title, price } });
          toast.success("Saved", { description: title, action: { label: "View saved", onClick: () => (window.location.href = "/saved") } });
        }
      }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full bg-background/90 text-foreground shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:scale-105 hover:bg-background",
        withLabel ? "h-10 px-4 text-sm font-medium" : "size-9",
        className,
      )}
    >
      <Heart className={cn("size-[18px] transition-colors", saved && "fill-cta text-cta")} aria-hidden="true" />
      {withLabel && <span>{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
