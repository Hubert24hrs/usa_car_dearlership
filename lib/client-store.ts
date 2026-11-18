"use client";

/**
 * Tiny localStorage-backed stores for saved vehicles, the compare tray and
 * recently viewed vehicles. Cross-tab synced; SSR-safe via
 * useSyncExternalStore (server snapshot is an empty list).
 */
import { useSyncExternalStore } from "react";
import { MAX_COMPARE } from "@/lib/inventory/constants";

type Listener = () => void;
const EMPTY: string[] = [];

function createListStore(key: string, max: number) {
  let cache: string[] | null = null;
  const listeners = new Set<Listener>();

  const read = (): string[] => {
    if (cache) return cache;
    try {
      const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");
      cache = Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string").slice(0, max) : [];
    } catch {
      cache = [];
    }
    return cache;
  };

  const write = (next: string[]) => {
    cache = [...new Set(next)].slice(0, max);
    try {
      window.localStorage.setItem(key, JSON.stringify(cache));
    } catch {
      // storage full / disabled — keep in memory
    }
    listeners.forEach((l) => l());
  };

  const subscribe = (listener: Listener) => {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) {
        cache = null;
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  };

  return {
    max,
    get: read,
    set: write,
    has: (id: string) => read().includes(id),
    add: (id: string) => write([id, ...read().filter((v) => v !== id)]),
    remove: (id: string) => write(read().filter((v) => v !== id)),
    toggle: (id: string) => {
      const current = read();
      write(current.includes(id) ? current.filter((v) => v !== id) : [id, ...current]);
      return !current.includes(id);
    },
    clear: () => write([]),
    useList: () => useSyncExternalStore(subscribe, read, () => EMPTY),
  };
}

export const savedStore = createListStore("pa:saved-vehicles", 100);
export const compareStore = createListStore("pa:compare", MAX_COMPARE);
export const recentStore = createListStore("pa:recently-viewed", 12);
