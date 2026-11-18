import { cn } from "@/lib/utils";

/** Original wordmark: monogram tile + name. Replace with the dealership's own logo files. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 40 40" className="size-9 shrink-0" aria-hidden="true">
        <rect width="40" height="40" rx="11" fill="#0b1f3a" />
        <path d="M12 29V11h9.2c4.3 0 7 2.4 7 6.1 0 3.8-2.7 6.2-7 6.2H17V29h-5Zm5-9.9h3.7c1.6 0 2.5-.8 2.5-2s-.9-2-2.5-2H17v4Z" fill="#fff" />
        <path d="M8 33.5c8.5-3.6 16.5-3.6 24 0" stroke="#e4572e" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      </svg>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-heading text-[17px] font-bold tracking-tight text-foreground">Prestige</span>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Auto Group</span>
        </span>
      )}
    </span>
  );
}
