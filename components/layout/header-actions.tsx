"use client";

import { Heart, LayoutDashboard, LogIn, LogOut, Menu, Moon, Phone, Sun, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { isStaff } from "@/lib/auth/permissions";
import { savedStore } from "@/lib/client-store";
import { track } from "@/lib/analytics";
import type { NavItem } from "@/lib/site.config";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

export function SavedLink() {
  const saved = savedStore.useList();
  return (
    <Button asChild variant="ghost" size="icon" className="relative rounded-full">
      <Link href="/saved" aria-label={`Saved vehicles (${saved.length})`}>
        <Heart className="size-5" />
        {saved.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-cta px-1 text-[10px] font-bold leading-4 text-cta-foreground">
            {saved.length > 99 ? "99+" : saved.length}
          </span>
        )}
      </Link>
    </Button>
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}

export function AccountMenu() {
  const { data: session, status } = useSession();
  if (status !== "authenticated" || !session?.user) {
    return (
      <Button asChild variant="ghost" size="icon" className="rounded-full">
        <Link href="/account/sign-in" aria-label="Sign in">
          <User className="size-5" />
        </Link>
      </Button>
    );
  }
  const staff = isStaff(session.user.role);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
          <User className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{session.user.name ?? session.user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/saved">
            <Heart /> Saved vehicles & searches
          </Link>
        </DropdownMenuItem>
        {staff && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <LayoutDashboard /> Admin dashboard
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut({ callbackUrl: "/" })}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DesktopNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden lg:block">
      <ul className="flex items-center gap-0.5">
        {items.map((item, index) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className={cn(index >= 6 && "hidden xl:block")}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-2 text-[13.5px] font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground",
                  active && "bg-accent text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function MobileNav({ items, phone, phoneHref }: { items: NavItem[]; phone: string; phoneHref: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full lg:hidden" aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[86vw] max-w-sm p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle>
            <Logo />
          </SheetTitle>
        </SheetHeader>
        <nav aria-label="Mobile" className="flex flex-col p-2">
          <Link href="/inventory" className="rounded-xl px-4 py-3 text-base font-semibold hover:bg-accent">
            Browse all inventory
          </Link>
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-xl px-4 py-3 text-base hover:bg-accent">
              <span className="block font-medium">{item.label}</span>
              {item.description && <span className="block text-sm text-muted-foreground">{item.description}</span>}
            </Link>
          ))}
          <Link href="/saved" className="rounded-xl px-4 py-3 text-base hover:bg-accent">
            Saved vehicles
          </Link>
          <Link href="/account/sign-in" className="flex items-center gap-2 rounded-xl px-4 py-3 text-base hover:bg-accent">
            <LogIn className="size-4" /> Sign in / create account
          </Link>
        </nav>
        <div className="mt-auto border-t p-4">
          <Button asChild className="w-full bg-cta text-cta-foreground hover:bg-cta-hover" size="lg">
            <a href={phoneHref} onClick={() => track({ name: "click_to_call", params: { location: "mobile-menu" } })}>
              <Phone /> Call {phone}
            </a>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
