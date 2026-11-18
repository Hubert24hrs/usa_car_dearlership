import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { breadcrumbJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { JsonLd } from "./json-ld";

export function Breadcrumbs({ items, className }: { items: { name: string; href: string }[]; className?: string }) {
  return (
    <>
      <nav aria-label="Breadcrumb" className={cn("text-sm text-muted-foreground", className)}>
        <ol className="flex flex-wrap items-center gap-1">
          {items.map((item, i) => (
            <li key={item.href} className="inline-flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5" aria-hidden="true" />}
              {i === items.length - 1 ? (
                <span aria-current="page" className="font-medium text-foreground">
                  {item.name}
                </span>
              ) : (
                <Link href={item.href} className="hover:text-foreground hover:underline">
                  {item.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={breadcrumbJsonLd(items)} />
    </>
  );
}
