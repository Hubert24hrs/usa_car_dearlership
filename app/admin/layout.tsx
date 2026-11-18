import type { Metadata } from "next";
import { AdminMobileNav, AdminSidebar } from "@/components/admin/admin-nav";
import { requirePagePermission } from "@/lib/auth/guards";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePagePermission("admin:access", "/admin");
  return (
    <div className="flex min-h-dvh bg-background">
      <AdminSidebar role={user.role} email={user.email} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur lg:hidden">
          <AdminMobileNav role={user.role} email={user.email} />
          <span className="font-heading font-semibold">Admin</span>
        </header>
        <main id="main-content" className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
