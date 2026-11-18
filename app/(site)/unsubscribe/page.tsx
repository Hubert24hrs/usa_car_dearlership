import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

type Props = { searchParams: Promise<{ type?: string; token?: string; done?: string }> };

export default async function UnsubscribePage({ searchParams }: Props) {
  const { type, token, done } = await searchParams;
  const valid = (type === "alert" || type === "newsletter") && token && /^[0-9a-f-]{36}$/i.test(token);
  return (
    <>
      <PageHeader title="Email preferences" crumbs={[{ name: "Unsubscribe", href: "/unsubscribe" }]} />
      <div className="container-page max-w-xl py-12">
        {done ? (
          <p role="status" className="rounded-2xl border bg-card p-6">
            You&apos;ve been unsubscribed. You won&apos;t receive these emails anymore.
          </p>
        ) : valid ? (
          <form method="post" action={`/api/unsubscribe`} className="space-y-4 rounded-2xl border bg-card p-6">
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="token" value={token} />
            <p>{type === "alert" ? "Stop saved-search alert emails for this search?" : "Unsubscribe from deal alerts and newsletters?"}</p>
            <Button type="submit" className="bg-cta text-cta-foreground hover:bg-cta-hover">
              Unsubscribe
            </Button>
          </form>
        ) : (
          <p className="rounded-2xl border bg-card p-6">This unsubscribe link is invalid or has expired.</p>
        )}
      </div>
    </>
  );
}
