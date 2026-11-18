"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="mt-3 max-w-md text-muted-foreground">Please try again. If the problem continues, give us a call. We&apos;re happy to help.</p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset} className="bg-cta text-cta-foreground hover:bg-cta-hover">
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
      {error.digest && <p className="mt-6 text-xs text-muted-foreground">Reference: {error.digest}</p>}
    </div>
  );
}
