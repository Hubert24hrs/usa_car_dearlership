"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addLeadNote, updateLead } from "@/lib/admin/actions";

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "APPOINTMENT_SET", "WON", "LOST"] as const;

export function LeadControls({
  id,
  status,
  assignedToId,
  staff,
}: {
  id: string;
  status: string;
  assignedToId: string | null;
  staff: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const update = (patch: Parameters<typeof updateLead>[1]) =>
    startTransition(async () => {
      const result = await updateLead(id, patch);
      if (result.ok) {
        toast.success("Lead updated");
        router.refresh();
      } else toast.error(result.error);
    });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Status</span>
          <select defaultValue={status} disabled={pending} onChange={(e) => update({ status: e.target.value })} className="h-9 w-full rounded-md border bg-background px-2">
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ").toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Assigned to</span>
          <select
            defaultValue={assignedToId ?? ""}
            disabled={pending}
            onChange={(e) => update({ assignedToId: e.target.value || null })}
            className="h-9 w-full rounded-md border bg-background px-2"
          >
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!note.trim()) return;
          startTransition(async () => {
            const result = await addLeadNote(id, note);
            if (result.ok) {
              setNote("");
              router.refresh();
            } else toast.error(result.error);
          });
        }}
      >
        <label htmlFor="lead-note" className="text-sm font-medium">
          Add note
        </label>
        <Textarea id="lead-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Called, left voicemail…" />
        <Button type="submit" size="sm" disabled={pending || !note.trim()}>
          {pending && <Loader2 className="animate-spin" />} Save note
        </Button>
      </form>
    </div>
  );
}
