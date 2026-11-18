"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { VehicleImage } from "./vehicle-image";

/** Lightweight scroll-snap photo carousel for vehicle cards (no carousel library). */
export function CardImageCarousel({
  images,
  alt,
  href,
  priority = false,
  sizes = "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw",
  className,
}: {
  images: string[];
  alt: string;
  href: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const photos = images.slice(0, 6);
  const count = photos.length;

  const go = (next: number) => {
    const el = ref.current;
    if (!el) return;
    const target = (next + count) % count;
    el.scrollTo({ left: target * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className={cn("group/carousel relative aspect-[4/3] overflow-hidden bg-muted", className)}>
      <Link href={href} tabIndex={-1} aria-hidden="true" className="block h-full">
        <div
          ref={ref}
          className="snap-carousel h-full"
          onScroll={(e) => {
            const el = e.currentTarget;
            setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
          }}
        >
          {count === 0 ? (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">Photos coming soon</div>
          ) : (
            photos.map((src, i) => (
              <div key={`${src}-${i}`} className="relative h-full w-full shrink-0 snap-start">
                <VehicleImage
                  src={src}
                  alt={i === 0 ? alt : ""}
                  fill
                  sizes={sizes}
                  priority={priority && i === 0}
                  loading={priority && i === 0 ? undefined : "lazy"}
                  className="transition-transform duration-500 group-hover/carousel:scale-[1.02]"
                />
              </div>
            ))
          )}
        </div>
      </Link>
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 opacity-0 shadow transition group-hover/carousel:opacity-100 focus-visible:opacity-100"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 opacity-0 shadow transition group-hover/carousel:opacity-100 focus-visible:opacity-100"
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1" aria-hidden="true">
            {photos.map((_, i) => (
              <span key={i} className={cn("h-1.5 rounded-full bg-white/70 transition-all", i === index ? "w-4 bg-white" : "w-1.5")} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
