"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Forms are loaded on demand so listing pages ship less JavaScript.
const loading = () => (
  <div className="space-y-3" aria-busy="true">
    <Skeleton className="h-9 w-full" />
    <Skeleton className="h-9 w-full" />
    <Skeleton className="h-24 w-full" />
  </div>
);
const AvailabilityForm = dynamic(() => import("@/components/forms/lead-forms").then((m) => m.AvailabilityForm), { loading });
const TestDriveForm = dynamic(() => import("@/components/forms/lead-forms").then((m) => m.TestDriveForm), { loading });
const TextUsForm = dynamic(() => import("@/components/forms/lead-forms").then((m) => m.TextUsForm), { loading });

export type LeadDialogKind = "availability" | "test-drive" | "text";

const COPY: Record<LeadDialogKind, { title: string; description: string; cta: string }> = {
  availability: {
    title: "Check availability",
    description: "We'll confirm this vehicle is on the lot and hold it for you.",
    cta: "Check availability",
  },
  "test-drive": {
    title: "Schedule a test drive",
    description: "Pick a time and we'll have it cleaned, charged or fueled, and ready.",
    cta: "Schedule test drive",
  },
  text: {
    title: "Text us about this vehicle",
    description: "Prefer texting? Send a message and we'll reply by SMS.",
    cta: "Text us",
  },
};

export function LeadDialog({
  kind,
  vehicle,
  trigger,
  buttonClassName,
  buttonVariant = "default",
}: {
  kind: LeadDialogKind;
  vehicle: { vehicleId: string; vin: string; title: string; price: number; locationId?: string };
  trigger?: React.ReactNode;
  buttonClassName?: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const copy = COPY[kind];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant={buttonVariant}
            className={cn(buttonVariant === "default" && "bg-cta text-cta-foreground hover:bg-cta-hover", buttonClassName)}
          >
            {copy.cta}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            {vehicle.title}. {copy.description}
          </DialogDescription>
        </DialogHeader>
        {open && kind === "availability" && <AvailabilityForm vehicle={vehicle} />}
        {open && kind === "test-drive" && <TestDriveForm vehicle={vehicle} />}
        {open && kind === "text" && <TextUsForm vehicle={vehicle} />}
      </DialogContent>
    </Dialog>
  );
}
