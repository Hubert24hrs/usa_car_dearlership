"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { compareStore } from "@/lib/client-store";

/** Keeps the compare tray in sync with the vehicles shown on /compare. */
export function SyncCompareList({ ids }: { ids: string[] }) {
  useEffect(() => {
    if (ids.length) compareStore.set(ids);
  }, [ids]);
  return null;
}

export function RemoveFromCompare({ id, ids, title }: { id: string; ids: string[]; title: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={`Remove ${title} from comparison`}
      onClick={() => {
        const next = ids.filter((x) => x !== id);
        compareStore.set(next);
        router.replace(next.length ? `/compare?ids=${next.join(",")}` : "/compare");
      }}
      className="absolute right-2 top-2 z-10 rounded-full bg-background/90 p-1.5 shadow hover:bg-background"
    >
      <X className="size-4" />
    </button>
  );
}
