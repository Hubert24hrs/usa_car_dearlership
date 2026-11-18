"use client";

import { Pause, Play, RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * 360° spin viewer: drag / swipe / arrow keys to rotate through ordered frames.
 * Frames come from the vehicle's spin_images (e.g. a photo-booth vendor feed).
 */
export function SpinViewer({ frames, alt, className }: { frames: string[]; alt: string; className?: string }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const drag = useRef<{ x: number; start: number } | null>(null);
  const count = frames.length;

  useEffect(() => {
    // Preload all frames so rotation is smooth.
    let done = 0;
    const images = frames.map((src) => {
      const img = new window.Image();
      img.onload = img.onerror = () => setLoaded(++done);
      img.src = src;
      return img;
    });
    return () => images.forEach((img) => (img.onload = img.onerror = null));
  }, [frames]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), 90);
    return () => window.clearInterval(timer);
  }, [playing, count]);

  if (count === 0) return null;

  const step = (delta: number) => setIndex((i) => (((i + delta) % count) + count) % count);

  return (
    <div className={cn("relative select-none", className)}>
      <div
        role="slider"
        tabIndex={0}
        aria-label={`360° view of ${alt}. Use left and right arrow keys to rotate.`}
        aria-valuemin={0}
        aria-valuemax={count - 1}
        aria-valuenow={index}
        aria-valuetext={`Angle ${Math.round((index / count) * 360)} degrees`}
        className="relative aspect-[3/2] cursor-grab touch-pan-y overflow-hidden rounded-2xl bg-muted active:cursor-grabbing"
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") step(-1);
          if (e.key === "ArrowRight") step(1);
        }}
        onPointerDown={(e) => {
          setPlaying(false);
          drag.current = { x: e.clientX, start: index };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const delta = Math.round((e.clientX - drag.current.x) / 12);
          setIndex((((drag.current.start - delta) % count) + count) % count);
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- frame swapping needs plain <img> */}
        <img src={frames[index]} alt={alt} className="h-full w-full object-cover" draggable={false} />
        {loaded < count && (
          <div className="absolute inset-x-4 bottom-4 h-1 overflow-hidden rounded-full bg-black/20">
            <div className="h-full bg-white transition-all" style={{ width: `${(loaded / count) * 100}%` }} />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <RotateCw className="size-4" aria-hidden="true" /> Drag or use arrow keys to rotate
        </span>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium text-foreground hover:bg-accent"
          aria-pressed={playing}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />} {playing ? "Pause" : "Auto-rotate"}
        </button>
      </div>
    </div>
  );
}
