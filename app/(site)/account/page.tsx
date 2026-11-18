import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { isStaff, ROLE_LABELS } from "@/lib/auth/permissions";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

type Props = { searchParams: Promise<{ denied?: string }> };

export default async function AccountPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/account/sign-in?callbackUrl=/account");
  const { denied } = await searchParams;
  return (
    <div className="container-page max-w-2xl py-16">
      <h1 className="text-3xl font-bold">My account</h1>
      {denied && (
        <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">
          Your account doesn&apos;t have access to the admin area.
        </p>
      )}
      <div className="mt-6 space-y-2 rounded-2xl border bg-card p-6">
        <p>
          <span className="text-muted-foreground">Name:</span> {session.user.name ?? "—"}
        </p>
        <p>
          <span className="text-muted-foreground">Email:</span> {session.user.email}
        </p>
        <p>
          <span className="text-muted-foreground">Role:</span> {ROLE_LABELS[session.user.role]}
        </p>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild className="bg-cta text-cta-foreground hover:bg-cta-hover">
          <Link href="/saved">Saved vehicles & searches</Link>
        </Button>
        {isStaff(session.user.role) && (
          <Button asChild variant="outline">
            <Link href="/admin">Admin dashboard</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
