import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 text-3xl font-bold md:text-4xl">We couldn&apos;t find that page</h1>
      <p className="mt-3 max-w-md text-muted-foreground">The vehicle may have sold or the link may be out of date. Try browsing our current inventory.</p>
      <div className="mt-6 flex gap-3">
        <Button asChild className="bg-cta text-cta-foreground hover:bg-cta-hover">
          <Link href="/inventory">Browse inventory</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
