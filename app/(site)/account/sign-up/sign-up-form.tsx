"use client";

import { Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpCustomer } from "@/lib/account/actions";

export function SignUpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { update } = useSession();
  const raw = params.get("callbackUrl");
  const callbackUrl = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/saved";
  const [values, setValues] = useState({ name: "", email: "", password: "", website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [key]: e.target.value }));

  return (
    <form
      className="relative space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setErrors({});
        setFormError(null);
        const result = await signUpCustomer(values);
        setPending(false);
        if (!result.ok) {
          setErrors(result.fieldErrors ?? {});
          setFormError(result.error);
          return;
        }
        await update();
        router.push(callbackUrl);
        router.refresh();
      }}
    >
      {formError && (
        <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">
          {formError}
        </p>
      )}
      {(
        [
          { key: "name", label: "Full name", type: "text", auto: "name" },
          { key: "email", label: "Email", type: "email", auto: "email" },
          { key: "password", label: "Password", type: "password", auto: "new-password" },
        ] as const
      ).map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label htmlFor={f.key}>{f.label}</Label>
          <Input
            id={f.key}
            type={f.type}
            autoComplete={f.auto}
            required
            value={values[f.key]}
            onChange={set(f.key)}
            aria-invalid={errors[f.key] ? true : undefined}
            aria-describedby={errors[f.key] ? `${f.key}-error` : f.key === "password" ? "password-hint" : undefined}
          />
          {f.key === "password" && !errors.password && (
            <p id="password-hint" className="text-xs text-muted-foreground">
              At least 10 characters with letters and a number.
            </p>
          )}
          {errors[f.key] && (
            <p id={`${f.key}-error`} className="text-xs font-medium text-destructive">
              {errors[f.key]}
            </p>
          )}
        </div>
      ))}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <input tabIndex={-1} autoComplete="off" value={values.website} onChange={set("website")} name="website" />
      </div>
      <Button type="submit" size="lg" disabled={pending} className="w-full bg-cta text-cta-foreground hover:bg-cta-hover">
        {pending ? <Loader2 className="animate-spin" /> : <UserPlus />} Create account
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/account/sign-in" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
