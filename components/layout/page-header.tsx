import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  eyebrow,
  crumbs,
  children,
  tone = "default",
}: {
  title: string;
  description?: React.ReactNode;
  eyebrow?: string;
  crumbs: { name: string; href: string }[];
  children?: React.ReactNode;
  tone?: "default" | "brand";
}) {
  const brand = tone === "brand";
  return (
    <section className={cn(brand ? "bg-brand text-brand-foreground" : "border-b bg-card")}>
      <div className="container-page py-10 md:py-14">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, ...crumbs]} className={cn("mb-5", brand && "text-white/70 [&_a:hover]:text-white [&_[aria-current]]:text-white")} />
        {eyebrow && <p className={cn("eyebrow mb-2", brand && "text-[#fda48a]")}>{eyebrow}</p>}
        <h1 className="max-w-3xl text-3xl font-bold md:text-5xl">{title}</h1>
        {description && <div className={cn("mt-4 max-w-2xl text-lg", brand ? "text-white/80" : "text-muted-foreground")}>{description}</div>}
        {children}
      </div>
    </section>
  );
}
