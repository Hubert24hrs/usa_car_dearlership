import type { Metadata } from "next";
import { UsersManager } from "@/components/admin/users-manager";
import { requirePagePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requirePagePermission("users:manage");
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    take: 500,
    select: { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true },
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users & roles</h1>
        <p className="text-sm text-muted-foreground">Admin: everything · Sales: inventory & leads · Finance: leads, finance applications & base pricing · Customer: public site only.</p>
      </div>
      <UsersManager currentUserId={me.id} users={users.map((u) => ({ ...u, lastLoginAt: u.lastLoginAt?.toISOString() ?? null }))} />
    </div>
  );
}
