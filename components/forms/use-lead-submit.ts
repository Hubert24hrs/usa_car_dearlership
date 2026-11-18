"use client";

import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { submitLead } from "@/lib/leads/actions";
import { LEAD_TYPE_LABELS, type LeadTypeValue } from "@/lib/leads/schema";

/**
 * Shared submit handler for every lead form: adds anti-spam metadata, calls
 * the server action, maps server field errors back onto the form, fires the
 * analytics conversion and exposes a success state.
 */
export function useLeadSubmit<T extends FieldValues>(
  type: LeadTypeValue,
  setError: UseFormSetError<T>,
  extra: { vehicleId?: string; vin?: string; price?: number; locationId?: string } = {},
) {
  const pathname = usePathname();
  const startedAt = useRef(Date.now());
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  async function onSubmit(values: T) {
    const result = await submitLead({
      ...values,
      type,
      vehicleId: extra.vehicleId,
      locationId: extra.locationId,
      sourcePath: pathname,
      startedAt: startedAt.current,
    });
    if (!result.ok) {
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(field as Path<T>, { type: "server", message });
      }
      toast.error(result.error);
      return;
    }
    track({ name: "generate_lead", params: { lead_type: type, vin: extra.vin, value: extra.price } });
    toast.success("Request sent!", { description: `${LEAD_TYPE_LABELS[type]} — we'll be in touch shortly.` });
    setSubmittedId(result.id);
  }

  return { onSubmit, submittedId, reset: () => setSubmittedId(null) };
}
