"use client";

import { CarFront, MessageSquare, Phone } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics";
import { isVehicleSlug } from "@/lib/inventory/slug";
import { smsHref, telHref } from "@/lib/site.config";

/**
 * Mobile-first sticky CTA bar: Call · Text · Check availability.
 * Vehicle detail pages render their own vehicle-specific bar instead.
 */
export function MobileCtaBar({ phone, smsPhone }: { phone: string; smsPhone: string }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "inventory" && segments.length === 2 && isVehicleSlug(segments[1]!)) return null;
  if (segments[0] === "admin") return null;

  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-2 backdrop-blur md:hidden">
      <div className="grid grid-cols-3 gap-2">
        <a
          href={telHref(phone)}
          onClick={() => track({ name: "click_to_call", params: { location: "mobile-bar" } })}
          className="flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-xs font-semibold hover:bg-accent"
        >
          <Phone className="size-5" aria-hidden="true" /> Call
        </a>
        <a
          href={smsHref(smsPhone)}
          onClick={() => track({ name: "click_to_text", params: { location: "mobile-bar" } })}
          className="flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-xs font-semibold hover:bg-accent"
        >
          <MessageSquare className="size-5" aria-hidden="true" /> Text us
        </a>
        <Link
          href="/inventory"
          className="flex flex-col items-center justify-center gap-0.5 rounded-xl bg-cta py-2 text-xs font-semibold text-cta-foreground hover:bg-cta-hover"
        >
          <CarFront className="size-5" aria-hidden="true" /> Shop inventory
        </Link>
      </div>
    </div>
  );
}
