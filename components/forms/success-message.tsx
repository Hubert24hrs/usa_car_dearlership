import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SuccessMessage({ title, children, onReset }: { title: string; children?: React.ReactNode; onReset?: () => void }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 rounded-2xl bg-ev-soft p-6 text-center">
      <CheckCircle2 className="size-10 text-ev-strong" aria-hidden="true" />
      <p className="font-heading text-lg font-semibold">{title}</p>
      {children && <div className="text-sm text-muted-foreground">{children}</div>}
      {onReset && (
        <Button variant="outline" size="sm" onClick={onReset}>
          Send another request
        </Button>
      )}
    </div>
  );
}
