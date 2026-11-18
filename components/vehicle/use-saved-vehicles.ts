"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef } from "react";
import { setVehicleSaved, syncSavedVehicles } from "@/lib/account/actions";
import { savedStore } from "@/lib/client-store";

/**
 * Saved vehicles work for everyone via localStorage; when signed in, the list
 * is merged into the account on first load and every toggle is persisted.
 */
export function useSavedVehicles() {
  const saved = savedStore.useList();
  const { status } = useSession();
  const synced = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || synced.current) return;
    synced.current = true;
    void syncSavedVehicles(savedStore.get()).then((merged) => {
      if (merged) savedStore.set(merged);
    });
  }, [status]);

  const toggle = useCallback(
    (vehicleId: string) => {
      const nowSaved = savedStore.toggle(vehicleId);
      if (status === "authenticated") void setVehicleSaved(vehicleId, nowSaved);
      return nowSaved;
    },
    [status],
  );

  return { saved, isSaved: (id: string) => saved.includes(id), toggle };
}
