"use client";

import { FileUp, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { importInventoryFile } from "@/lib/admin/actions";

type Summary = Extract<Awaited<ReturnType<typeof importInventoryFile>>, { ok: true }>["data"];

export function ImportForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [summary, setSummary] = useState<Summary | null>(null);

  return (
    <div className="space-y-6">
      <form
        className="space-y-4 rounded-2xl border bg-card p-5"
        action={(formData) =>
          startTransition(async () => {
            const result = await importInventoryFile(formData);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            setSummary(result.data ?? null);
            toast.success(result.data?.dryRun ? "Dry run complete. Nothing was saved." : "Import complete");
            router.refresh();
          })
        }
      >
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <div className="space-y-1.5">
            <label htmlFor="file" className="text-sm font-medium">
              CSV or JSON file
            </label>
            <input id="file" name="file" type="file" accept=".csv,.json,text/csv,application/json" required className="block w-full rounded-md border bg-background p-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="provider" className="text-sm font-medium">
              Format / provider
            </label>
            <select id="provider" name="provider" className="h-10 w-full rounded-md border bg-background px-2 text-sm" defaultValue="">
              <option value="">Auto (spec column names)</option>
              <option value="HOMENET">HomeNet export</option>
              <option value="VAUTO">vAuto export</option>
              <option value="DEALERCOM">Dealer.com feed</option>
              <option value="CDK">CDK extract</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="dryRun" defaultChecked /> Dry run (validate & preview only)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="markMissingAsSold" /> Full snapshot: mark vehicles missing from this provider as sold
          </label>
        </div>
        <Button type="submit" disabled={pending} className="bg-cta text-cta-foreground hover:bg-cta-hover">
          {pending ? <Loader2 className="animate-spin" /> : <FileUp />} Upload & process
        </Button>
      </form>

      {summary && (
        <section className="space-y-4 rounded-2xl border bg-card p-5" aria-live="polite">
          <h2 className="font-semibold">
            {summary.dryRun ? "Dry run results" : "Import results"}: {summary.status}
          </h2>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-6">
            {[
              ["Rows", summary.totalRows],
              [summary.dryRun ? "Would create" : "Created", summary.created],
              [summary.dryRun ? "Would update" : "Updated", summary.updated],
              ["Skipped (dupes)", summary.skipped],
              ["Failed", summary.failed],
              [summary.dryRun ? "Would mark sold" : "Marked sold", summary.markedSold],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl bg-muted/60 p-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-xl font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          {summary.errors.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-destructive">Errors ({summary.errors.length})</h3>
              <ul className="max-h-72 space-y-1 overflow-y-auto rounded-xl bg-destructive/5 p-3 font-mono text-xs">
                {summary.errors.map((e, i) => (
                  <li key={i}>
                    Row {e.row}
                    {e.vin ? ` (${e.vin})` : ""}
                    {e.field ? ` · ${e.field}` : ""}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {summary.warnings.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm font-semibold">Warnings ({summary.warnings.length})</summary>
              <ul className="mt-2 max-h-60 space-y-1 overflow-y-auto font-mono text-xs text-muted-foreground">
                {summary.warnings.map((w, i) => (
                  <li key={i}>
                    Row {w.row}
                    {w.vin ? ` (${w.vin})` : ""}: {w.message}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}
    </div>
  );
}
