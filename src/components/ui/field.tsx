"use client";

import type { ComponentProps, ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Minimal label + control + error unit.
 *
 * Hand-written rather than using shadcn's `form.tsx`, which
 * `shadcn add form` never produced. It is enough for React Hook Form's
 * `register()`: pass the registration in as `fieldProps` so the `name` the
 * input ends up with always comes from one place.
 */

type InputProps = ComponentProps<typeof Input>;

type FieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  /** The object returned by `register(...)`. */
  fieldProps?: Omit<InputProps, "id" | "name">;
  children?: ReactNode;
} & Omit<InputProps, "id" | "name">;

export function Field({
  label,
  name,
  error,
  hint,
  fieldProps,
  className,
  children,
  ...inputProps
}: FieldProps) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      {children ?? (
        <Input
          id={name}
          name={name}
          className={className}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...inputProps}
          {...fieldProps}
        />
      )}
      {error ? (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-muted-foreground text-sm">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
