"use client";

import { Loader2, Mail } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subscribeNewsletter } from "@/lib/leads/actions";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const startedAt = useRef(Date.now());

  if (done) {
    return (
      <p role="status" className="rounded-2xl bg-white/10 p-4 text-sm font-medium">
        You&apos;re subscribed! Watch your inbox for new arrivals and price drops.
      </p>
    );
  }

  return (
    <form
      className="relative flex flex-col gap-2 sm:flex-row"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const result = await subscribeNewsletter({ email, dealAlerts: true, website, startedAt: startedAt.current });
        setPending(false);
        if (result.ok) setDone(true);
        else toast.error(result.error);
      }}
    >
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <Input
        id="newsletter-email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-12 rounded-xl border-white/20 bg-white text-foreground"
      />
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" />
      </div>
      <Button type="submit" disabled={pending} size="lg" className="h-12 rounded-xl bg-cta px-6 text-cta-foreground hover:bg-cta-hover">
        {pending ? <Loader2 className="animate-spin" /> : <Mail />} Get deal alerts
      </Button>
    </form>
  );
}
