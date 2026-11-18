"use client";

import type { UseFormRegister } from "react-hook-form";
import { Field, Input } from "./fields";

type FieldMessage = { message?: string } | undefined;
type ContactErrors = { firstName?: FieldMessage; lastName?: FieldMessage; email?: FieldMessage; phone?: FieldMessage };

/** Name / email / phone block reused by every lead form. */
export function ContactFields({
  register,
  errors,
  phoneRequired = false,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  errors: ContactErrors;
  phoneRequired?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="First name" required error={errors.firstName?.message}>
        {(p) => <Input autoComplete="given-name" {...p} {...register("firstName")} />}
      </Field>
      <Field label="Last name" required error={errors.lastName?.message}>
        {(p) => <Input autoComplete="family-name" {...p} {...register("lastName")} />}
      </Field>
      <Field label="Email" required error={errors.email?.message}>
        {(p) => <Input type="email" autoComplete="email" inputMode="email" {...p} {...register("email")} />}
      </Field>
      <Field label="Phone" required={phoneRequired} error={errors.phone?.message} hint={phoneRequired ? undefined : "Optional"}>
        {(p) => <Input type="tel" autoComplete="tel" inputMode="tel" placeholder="(555) 555-0100" {...p} {...register("phone")} />}
      </Field>
    </div>
  );
}
