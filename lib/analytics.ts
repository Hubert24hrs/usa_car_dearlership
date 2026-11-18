"use client";

/**
 * Analytics hooks (GA4 + Meta Pixel). Scripts are only loaded after the
 * visitor accepts analytics cookies (see components/analytics). Calls are
 * no-ops otherwise, so it is always safe to call track().
 */

type GtagFn = (...args: unknown[]) => void;
type FbqFn = (...args: unknown[]) => void;
declare global {
  interface Window {
    gtag?: GtagFn;
    fbq?: FbqFn;
    dataLayer?: unknown[];
  }
}

export type AnalyticsEvent =
  | { name: "view_item"; params: { vin: string; item_name: string; price: number; condition: string; fuel: string } }
  | { name: "generate_lead"; params: { lead_type: string; vin?: string; value?: number } }
  | { name: "search"; params: { search_term?: string; results: number; filters: number } }
  | { name: "add_to_wishlist"; params: { vin?: string; item_name?: string; price?: number } }
  | { name: "compare"; params: { count: number } }
  | { name: "click_to_call" | "click_to_text"; params: { location?: string } }
  | { name: "save_search"; params: { alerts: boolean } };

const META_EVENTS: Partial<Record<AnalyticsEvent["name"], string>> = {
  view_item: "ViewContent",
  generate_lead: "Lead",
  search: "Search",
  add_to_wishlist: "AddToWishlist",
  click_to_call: "Contact",
  click_to_text: "Contact",
};

export function track(event: AnalyticsEvent): void {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", event.name, event.params);
    const metaEvent = META_EVENTS[event.name];
    if (metaEvent) window.fbq?.("track", metaEvent, event.params);
  } catch {
    // analytics must never break the UI
  }
}

// ── Consent (CCPA-friendly; honors Global Privacy Control) ─────────────────
export type ConsentState = "granted" | "denied" | "unset";
const CONSENT_KEY = "pa:consent";
export const CONSENT_EVENT = "pa:consent-change";

export function getConsent(): ConsentState {
  if (typeof window === "undefined") return "unset";
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.globalPrivacyControl) return "denied";
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : "unset";
  } catch {
    return "unset";
  }
}

export function setConsent(value: Exclude<ConsentState, "unset">): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}
