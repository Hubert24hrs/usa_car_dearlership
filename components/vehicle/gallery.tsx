"use client";

import { ChevronLeft, ChevronRight, Expand, ImageIcon, PlayCircle, Rotate3d, ZoomIn, ZoomOut } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { VehicleImage } from "./vehicle-image";

const SpinViewer = dynamic(() => import("./spin-viewer").then((m) => m.SpinViewer), { ssr: false });

function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (u.hostname === "youtu.be") return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(u.pathname.slice(1))}`;
    if (u.hostname.includes("vimeo.com")) return `https://player.vimeo.com/video/${encodeURIComponent(u.pathname.split("/").filter(Boolean).pop() ?? "")}`;
    return null;
  } catch {
    return null;
  }
}

type Mode = "photos" | "video" | "360";

export function Gallery({
  images,
  title,
  videoUrl,
  spinImages = [],
}: {
  images: string[];
  title: string;
  videoUrl?: string | null;
  spinImages?: string[];
}) {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<Mode>("photos");
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState<{ on: boolean; x: number; y: number }>({ on: false, x: 50, y: 50 });
  const count = images.length;
  const embed = videoUrl ? toEmbedUrl(videoUrl) : null;
  const go = useCallback((delta: number) => setIndex((i) => (((i + delta) % count) + count) % count), [count]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, go]);

  if (count === 0) {
    return (
      <div className="flex aspect-[3/2] items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <ImageIcon className="mr-2 size-5" /> Photos coming soon
      </div>
    );
  }

  const modes: { key: Mode; label: string; icon: typeof ImageIcon; show: boolean }[] = [
    { key: "photos", label: `Photos (${count})`, icon: ImageIcon, show: true },
    { key: "video", label: "Video", icon: PlayCircle, show: Boolean(videoUrl) },
    { key: "360", label: "360° view", icon: Rotate3d, show: spinImages.length > 1 },
  ];

  return (
    <div className="space-y-3">
      {modes.filter((m) => m.show).length > 1 && (
        <div className="flex gap-2" role="tablist" aria-label="Media type">
          {modes
            .filter((m) => m.show)
            .map((m) => (
              <button
                key={m.key}
                role="tab"
                type="button"
                aria-selected={mode === m.key}
                onClick={() => setMode(m.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  mode === m.key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
                )}
              >
                <m.icon className="size-4" aria-hidden="true" /> {m.label}
              </button>
            ))}
        </div>
      )}

      {mode === "360" && <SpinViewer frames={spinImages} alt={title} />}

      {mode === "video" && videoUrl && (
        <div className="aspect-video overflow-hidden rounded-2xl bg-black">
          {embed ? (
            <iframe
              src={embed}
              title={`${title} video`}
              className="h-full w-full"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <video src={videoUrl} controls preload="metadata" className="h-full w-full" />
          )}
        </div>
      )}

      {mode === "photos" && (
        <>
          <div className="group relative aspect-[3/2] overflow-hidden rounded-2xl bg-muted">
            <button type="button" className="absolute inset-0 cursor-zoom-in" onClick={() => setFullscreen(true)} aria-label="Open fullscreen gallery">
              <VehicleImage
                src={images[index]!}
                alt={`${title} — photo ${index + 1} of ${count}`}
                fill
                priority={index === 0}
                sizes="(min-width: 1024px) 66vw, 100vw"
              />
            </button>
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous photo"
                  className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow"
                >
                  <ChevronLeft />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next photo"
                  className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow"
                >
                  <ChevronRight />
                </button>
              </>
            )}
            <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
              <Expand className="size-3.5" aria-hidden="true" /> {index + 1} / {count}
            </span>
          </div>
          {count > 1 && (
            <ul className="snap-carousel gap-2" aria-label="Photo thumbnails">
              {images.map((src, i) => (
                <li key={`${src}-${i}`} className="shrink-0 snap-start">
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Show photo ${i + 1}`}
                    aria-current={i === index}
                    className={cn(
                      "relative block h-16 w-24 overflow-hidden rounded-lg border-2 transition",
                      i === index ? "border-cta" : "border-transparent opacity-80 hover:opacity-100",
                    )}
                  >
                    <VehicleImage src={src} alt="" fill sizes="96px" loading="lazy" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Dialog open={fullscreen} onOpenChange={(open) => { setFullscreen(open); setZoom({ on: false, x: 50, y: 50 }); }}>
        <DialogContent className="max-w-[min(96vw,1400px)] border-none bg-black p-0 text-white sm:max-w-[min(96vw,1400px)]">
          <DialogTitle className="sr-only">{title} photo gallery</DialogTitle>
          <div
            className={cn("relative aspect-[3/2] w-full overflow-hidden", zoom.on ? "cursor-zoom-out" : "cursor-zoom-in")}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setZoom((z) => ({ on: !z.on, x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 }));
            }}
            onMouseMove={(e) => {
              if (!zoom.on) return;
              const rect = e.currentTarget.getBoundingClientRect();
              setZoom({ on: true, x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
            }}
          >
            <VehicleImage
              src={images[index]!}
              alt={`${title} — photo ${index + 1} of ${count}`}
              fill
              sizes="96vw"
              className="object-contain transition-transform duration-200"
              style={{ transform: zoom.on ? "scale(2.2)" : "scale(1)", transformOrigin: `${zoom.x}% ${zoom.y}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 p-3">
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="rounded-full bg-white/10 p-2 hover:bg-white/20">
              <ChevronLeft />
            </button>
            <span className="inline-flex items-center gap-2 text-sm">
              {zoom.on ? <ZoomOut className="size-4" /> : <ZoomIn className="size-4" />} Click photo to {zoom.on ? "zoom out" : "zoom"} · {index + 1} / {count}
            </span>
            <button type="button" onClick={() => go(1)} aria-label="Next photo" className="rounded-full bg-white/10 p-2 hover:bg-white/20">
              <ChevronRight />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
