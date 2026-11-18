import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Section({
  id,
  eyebrow,
  title,
  description,
  action,
  children,
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  children: React.ReactNode;
  className?: string;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={cn("container-page py-14 md:py-20", className)}>
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
          <h2 id={headingId} className="text-2xl font-bold md:text-3xl">
            {title}
          </h2>
          {description && <p className="mt-2 text-muted-foreground">{description}</p>}
        </div>
        {action && (
          <Link href={action.href} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            {action.label} <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
