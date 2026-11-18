"use client";

import { BellRing, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { saveSearch } from "@/lib/account/actions";
import { track } from "@/lib/analytics";
import { buildInventoryHref } from "@/lib/inventory/filters";
import { useInventoryNav } from "./inventory-nav";

export function SaveSearchDialog({ defaultName }: { defaultName: string }) {
  const { filters } = useInventoryNav();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState("");
  const [alerts, setAlerts] = useState(true);
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY">("DAILY");
  const [pending, setPending] = useState(false);
  const [website, setWebsite] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const result = await saveSearch({
      name: name.trim() || defaultName,
      url: buildInventoryHref({ ...filters, page: 1, view: "grid" }, { includePage: false }),
      email: session?.user?.email ? undefined : email,
      alertsEnabled: alerts,
      frequency,
      website,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    track({ name: "save_search", params: { alerts } });
    toast.success("Search saved", { description: alerts ? "We'll email you when new matches arrive." : undefined });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setName(defaultName); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BellRing /> Save search
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save this search</DialogTitle>
          <DialogDescription>Get an email when new vehicles match. Unsubscribe anytime.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="relative space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="search-name">Name</Label>
            <Input id="search-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>
          {!session?.user?.email && (
            <div className="space-y-1.5">
              <Label htmlFor="search-email">Email for alerts</Label>
              <Input id="search-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          )}
          <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/60 p-3">
            <Label htmlFor="search-alerts" className="text-sm">
              Email me new matches
            </Label>
            <Switch id="search-alerts" checked={alerts} onCheckedChange={setAlerts} />
          </div>
          {alerts && (
            <fieldset className="flex gap-4 text-sm">
              <legend className="sr-only">Alert frequency</legend>
              {(["DAILY", "WEEKLY"] as const).map((f) => (
                <label key={f} className="flex items-center gap-2">
                  <input type="radio" name="frequency" value={f} checked={frequency === f} onChange={() => setFrequency(f)} />
                  {f === "DAILY" ? "Daily" : "Weekly"}
                </label>
              ))}
            </fieldset>
          )}
          <div aria-hidden="true" className="absolute -left-[9999px]">
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" />
          </div>
          <Button type="submit" disabled={pending} className="w-full bg-cta text-cta-foreground hover:bg-cta-hover">
            {pending && <Loader2 className="animate-spin" />} Save search
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
