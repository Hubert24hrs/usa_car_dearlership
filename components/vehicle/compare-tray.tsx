"use client";

import { ArrowRight, Columns3, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { compareStore } from "@/lib/client-store";
import { MAX_COMPARE } from "@/lib/inventory/constants";

export function CompareTray() {
  const list = compareStore.useList();
  const pathname = usePathname();
  const hidden = pathname.startsWith("/compare") || pathname.startsWith("/admin");
  return (
    <AnimatePresence>
      {list.length > 0 && !hidden && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          className="no-print fixed inset-x-3 bottom-20 z-40 mx-auto max-w-xl md:bottom-6"
          role="region"
          aria-label="Compare vehicles"
        >
          <div className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-lift">
            <span className="flex size-10 items-center justify-center rounded-xl bg-secondary">
              <Columns3 className="size-5" aria-hidden="true" />
            </span>
            <div className="flex-1 text-sm">
              <p className="font-semibold">
                {list.length} of {MAX_COMPARE} selected to compare
              </p>
              <p className="text-muted-foreground">Add up to {MAX_COMPARE} vehicles side by side.</p>
            </div>
            <Button variant="ghost" size="icon" aria-label="Clear compare list" onClick={() => compareStore.clear()}>
              <X />
            </Button>
            <Button
              asChild
              className="bg-cta text-cta-foreground hover:bg-cta-hover"
              disabled={list.length < 2}
              onClick={() => track({ name: "compare", params: { count: list.length } })}
            >
              <Link href={`/compare?ids=${list.join(",")}`} aria-disabled={list.length < 2}>
                Compare <ArrowRight />
              </Link>
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
