"use client";

import { Building2, CarFront, FileUp, Gauge, Rss, Settings, Users, Inbox, ExternalLink, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { Logo } from "@/components/layout/logo";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { can, ROLE_LABELS, type Permission } from "@/lib/auth/permissions";
import type { Role } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: string; icon: typeof Gauge; permission: Permission }[] = [
  { href: "/admin", label: "Dashboard", icon: Gauge, permission: "analytics:read" },
  { href: "/admin/inventory", label: "Inventory", icon: CarFront, permission: "inventory:read" },
  { href: "/admin/import", label: "Import CSV / JSON", icon: FileUp, permission: "inventory:import" },
  { href: "/admin/feeds", label: "Feeds", icon: Rss, permission: "feeds:manage" },
  { href: "/admin/leads", label: "Leads (CRM)", icon: Inbox, permission: "leads:read" },
  { href: "/admin/locations", label: "Locations", icon: Building2, permission: "settings:write" },
  { href: "/admin/users", label: "Users", icon: Users, permission: "users:manage" },
  { href: "/admin/settings", label: "Settings & pricing", icon: Settings, permission: "settings:write" },
];

function NavLinks({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {ITEMS.filter((item) => can(role, item.permission)).map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                active && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-4" aria-hidden="true" /> {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SidebarBody({ role, email, onNavigate }: { role: Role; email: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link href="/admin" className="rounded-lg bg-white/95 p-2" onClick={onNavigate}>
        <Logo />
      </Link>
      <nav aria-label="Admin">
        <NavLinks role={role} onNavigate={onNavigate} />
      </nav>
      <div className="mt-auto space-y-2 border-t border-sidebar-border pt-4 text-sm">
        <p className="truncate text-sidebar-foreground/70" title={email}>
          {email} · {ROLE_LABELS[role]}
        </p>
        <Link href="/" className="flex items-center gap-2 text-sidebar-foreground/80 hover:text-white">
          <ExternalLink className="size-4" /> View site
        </Link>
        <button type="button" onClick={() => void signOut({ callbackUrl: "/" })} className="flex items-center gap-2 text-sidebar-foreground/80 hover:text-white">
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

export function AdminSidebar({ role, email }: { role: Role; email: string }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 bg-sidebar lg:block">
      <SidebarBody role={role} email={email} />
    </aside>
  );
}

export function AdminMobileNav({ role, email }: { role: Role; email: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="rounded-lg p-2 hover:bg-accent lg:hidden" aria-label="Open admin menu">
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-sidebar p-0">
        <SheetTitle className="sr-only">Admin navigation</SheetTitle>
        <SidebarBody role={role} email={email} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
