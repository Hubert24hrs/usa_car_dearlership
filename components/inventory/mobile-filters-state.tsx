"use client";

import { createContext, useContext, useState } from "react";

type MobileFiltersState = { open: boolean; setOpen: (open: boolean) => void };

const MobileFiltersContext = createContext<MobileFiltersState | null>(null);

/**
 * Keeps the mobile filter sheet open across navigations. Picking a filter can
 * move to a new SEO URL (/inventory → /inventory/hybrid), which remounts the
 * page, so the sheet's open state lives in the /inventory layout instead.
 */
export function MobileFiltersProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <MobileFiltersContext.Provider value={{ open, setOpen }}>{children}</MobileFiltersContext.Provider>;
}

/** Open state of the mobile filter sheet (falls back to local state outside the provider). */
export function useMobileFiltersOpen(): [boolean, (open: boolean) => void] {
  const shared = useContext(MobileFiltersContext);
  const [local, setLocal] = useState(false);
  return shared ? [shared.open, shared.setOpen] : [local, setLocal];
}
