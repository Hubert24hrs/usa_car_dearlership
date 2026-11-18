"use client";

import { Loader2, Play, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteFeedSource, runFeedNow, saveFeedSource } from "@/lib/admin/actions";
import { formatDate } from "@/lib/format";

type Feed = {
  id: string;
  name: string;
  provider: string;
  url: string;
  authEnvVar: string | null;
  locationId: string | null;
  enabled: boolean;
  markMissingAsSold: boolean;
  lastRunAt: string | null;
  lastStatus: string | null;
  lastMessage: string | null;
};

const PROVIDERS = [
  ["HOMENET", "HomeNet"],
  ["VAUTO", "vAuto"],
  ["DEALERCOM", "Dealer.com"],
  ["CDK", "CDK Global"],
  ["GENERIC_CSV", "Generic CSV"],
  ["GENERIC_JSON", "Generic JSON"],
] as const;

function FeedEditor({ feed, locations, onDone }: { feed?: Feed; locations: { id: string; name: string }[]; onDone: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [v, setV] = useState({
    name: feed?.name ?? "",
    provider: feed?.provider ?? "HOMENET",
    url: feed?.url ?? "",
    authEnvVar: feed?.authEnvVar ?? "",
    locationId: feed?.locationId ?? "",
    enabled: feed?.enabled ?? true,
    markMissingAsSold: feed?.markMissingAsSold ?? true,
  });
  return (
    <form
      className="grid gap-4 rounded-2xl border bg-card p-5 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await saveFeedSource(v, feed?.id);
          if (!result.ok) return void toast.error(result.error);
          toast.success("Feed saved");
          onDone();
          router.refresh();
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="feed-name">Name</Label>
        <Input id="feed-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="feed-provider">Provider</Label>
        <select id="feed-provider" value={v.provider} onChange={(e) => setV({ ...v, provider: e.target.value })} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
          {PROVIDERS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="feed-url">Feed URL (https)</Label>
        <Input id="feed-url" type="url" value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="feed-auth">Credential env var (optional)</Label>
        <Input id="feed-auth" placeholder="HOMENET_FEED_TOKEN" value={v.authEnvVar} onChange={(e) => setV({ ...v, authEnvVar: e.target.value.toUpperCase() })} />
        <p className="text-xs text-muted-foreground">Store the secret in an environment variable — never in the database.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="feed-location">Default location</Label>
        <select id="feed-location" value={v.locationId} onChange={(e) => setV({ ...v, locationId: e.target.value })} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
          <option value="">Primary location</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={v.enabled} onChange={(e) => setV({ ...v, enabled: e.target.checked })} /> Enabled (synced by the daily cron)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={v.markMissingAsSold} onChange={(e) => setV({ ...v, markMissingAsSold: e.target.checked })} /> Mark vehicles missing from the feed as sold
      </label>
      <div className="flex gap-2 md:col-span-2">
        <Button type="submit" disabled={pending} className="bg-cta text-cta-foreground hover:bg-cta-hover">
          {pending && <Loader2 className="animate-spin" />} Save feed
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function FeedManager({ feeds, locations }: { feeds: Feed[]; locations: { id: string; name: string }[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [running, setRunning] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {editing === "new" ? (
        <FeedEditor locations={locations} onDone={() => setEditing(null)} />
      ) : (
        <Button onClick={() => setEditing("new")} variant="outline">
          <Plus /> Add feed source
        </Button>
      )}
      <ul className="space-y-3">
        {feeds.map((feed) =>
          editing === feed.id ? (
            <li key={feed.id}>
              <FeedEditor feed={feed} locations={locations} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={feed.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5">
              <div className="min-w-0">
                <p className="font-semibold">
                  {feed.name} <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{feed.provider}</span>
                  {!feed.enabled && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">disabled</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{feed.url}</p>
                <p className="mt-1 text-sm">
                  {feed.lastRunAt ? (
                    <>
                      Last run {formatDate(feed.lastRunAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} —{" "}
                      <span className={feed.lastStatus === "FAILED" ? "font-medium text-destructive" : "font-medium"}>{feed.lastStatus}</span>
                      {feed.lastMessage && <span className="text-muted-foreground"> · {feed.lastMessage}</span>}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Never run</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={running === feed.id}
                  onClick={async () => {
                    setRunning(feed.id);
                    const result = await runFeedNow(feed.id);
                    setRunning(null);
                    if (result.ok) toast.success("Feed synced", { description: result.message });
                    else toast.error(result.error);
                    router.refresh();
                  }}
                >
                  {running === feed.id ? <Loader2 className="animate-spin" /> : <Play />} Run now
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(feed.id)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Delete ${feed.name}`}
                  onClick={async () => {
                    if (!window.confirm(`Delete feed "${feed.name}"? Vehicles already imported are kept.`)) return;
                    const result = await deleteFeedSource(feed.id);
                    if (result.ok) router.refresh();
                    else toast.error(result.error);
                  }}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
