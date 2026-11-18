"use client";

import { Loader2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStaffUser, updateUser } from "@/lib/admin/actions";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/format";

type Row = { id: string; email: string; name: string | null; role: keyof typeof ROLE_LABELS; isActive: boolean; lastLoginAt: string | null };

export function UsersManager({ users, currentUserId }: { users: Row[]; currentUserId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", email: "", role: "SALES", password: "" });
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        toast.success(result.message ?? "Saved");
        router.refresh();
      } else toast.error(result.error);
    });

  return (
    <div className="space-y-6">
      <form
        className="grid gap-4 rounded-2xl border bg-card p-5 md:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            const result = await createStaffUser(form);
            if (result.ok) setForm({ name: "", email: "", role: "SALES", password: "" });
            return result;
          });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="u-name">Name</Label>
          <Input id="u-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="u-email">Email</Label>
          <Input id="u-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="u-role">Role</Label>
          <select id="u-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
            {(["SALES", "FINANCE", "ADMIN"] as const).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="u-pass">Temporary password</Label>
          <Input id="u-pass" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>
        <div className="md:col-span-5">
          <Button type="submit" disabled={pending} className="bg-cta text-cta-foreground hover:bg-cta-hover">
            {pending ? <Loader2 className="animate-spin" /> : <UserPlus />} Add staff user
          </Button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Role</th>
              <th className="p-3">Last sign-in</th>
              <th className="p-3">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-3">
                  <p className="font-medium">{u.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </td>
                <td className="p-3">
                  <select
                    defaultValue={u.role}
                    disabled={pending || u.id === currentUserId}
                    aria-label={`Role for ${u.email}`}
                    onChange={(e) => run(() => updateUser(u.id, { role: e.target.value }))}
                    className="h-8 rounded-md border bg-background px-2 text-sm"
                  >
                    {(Object.keys(ROLE_LABELS) as (keyof typeof ROLE_LABELS)[]).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-3 text-muted-foreground">{u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}</td>
                <td className="p-3">
                  <input
                    type="checkbox"
                    defaultChecked={u.isActive}
                    disabled={pending || u.id === currentUserId}
                    aria-label={`Active: ${u.email}`}
                    onChange={(e) => run(() => updateUser(u.id, { isActive: e.target.checked }))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
