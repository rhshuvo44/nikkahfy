"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Check, Loader2 } from "lucide-react";
import { useActionState, useEffect, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { saveWeddingAction, type SaveWeddingState } from "@/app/(dashboard)/dashboard/weddings/[id]/edit/actions";
import {
  deriveWeddingDateShort,
  weddingFormDefaults,
  weddingFormSchema,
  type WeddingFormValues,
} from "@/lib/validation/wedding";

const MUSIC_OPTIONS = [
  { value: "upload", label: "Uploaded audio" },
  { value: "youtube", label: "YouTube link" },
] as const;

export function WeddingForm({
  weddingId,
  defaultValues,
}: {
  weddingId: string;
  defaultValues: WeddingFormValues;
}) {
  const [state, formAction, isPending] = useActionState<SaveWeddingState, WeddingFormValues>(
    saveWeddingAction.bind(null, weddingId),
    { status: "idle" },
  );
  const [, startTransition] = useTransition();

  const form = useForm<WeddingFormValues>({
    resolver: zodResolver(weddingFormSchema),
    defaultValues: { ...weddingFormDefaults, ...defaultValues },
  });

  const errors = form.formState.errors;
  const watchedDate = useWatch({ control: form.control, name: "weddingDate" });
  const watchedMusicType = useWatch({ control: form.control, name: "musicType" });
  const datePreview = deriveWeddingDateShort(watchedDate);

  // Surface server-side field errors on the matching inputs.
  useEffect(() => {
    if (state.status !== "error" || !state.errors) return;
    for (const [name, message] of Object.entries(state.errors)) {
      form.setError(name as keyof WeddingFormValues, { type: "server", message });
    }
  }, [state, form]);

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      await formAction(values);
    });
  });

  const busy = isPending;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-8">
      <Section title="The couple" description="How the invitation addresses you both.">
        <Field
          label="Invitation title"
          name="title"
          error={errors.title?.message}
          hint="Shown as the card name in your dashboard."
          fieldProps={form.register("title")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Groom name"
            name="groomName"
            placeholder="Rakib"
            error={errors.groomName?.message}
            fieldProps={form.register("groomName")}
          />
          <Field
            label="Bride name"
            name="brideName"
            placeholder="Nusrat"
            error={errors.brideName?.message}
            fieldProps={form.register("brideName")}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Groom full name"
            name="groomFullName"
            placeholder="Rakib Hasan"
            error={errors.groomFullName?.message}
            fieldProps={form.register("groomFullName")}
          />
          <Field
            label="Bride full name"
            name="brideFullName"
            placeholder="Nusrat Jahan"
            error={errors.brideFullName?.message}
            fieldProps={form.register("brideFullName")}
          />
        </div>
      </Section>

      <Section title="Date & time" description="The short date is generated from the date below.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Wedding date"
            name="weddingDate"
            type="date"
            error={errors.weddingDate?.message}
            fieldProps={form.register("weddingDate")}
          />
          <Field
            label="Time"
            name="weddingTime"
            placeholder="6:30 PM"
            error={errors.weddingTime?.message}
            fieldProps={form.register("weddingTime")}
          />
        </div>
        <div className="text-muted-foreground grid gap-1 rounded-lg border border-dashed p-3 text-sm">
          <span className="text-foreground flex items-center gap-2 font-medium">
            <CalendarDays className="size-4" aria-hidden />
            {datePreview || "Friday • 10.24.25"}
          </span>
          <span>Generated automatically — matches the date above.</span>
        </div>
      </Section>

      <Section title="Venue" description="Where guests should go, and how to find it.">
        <Field
          label="Venue name"
          name="venueName"
          placeholder="The Rose Garden, Gulshan"
          error={errors.venueName?.message}
          fieldProps={form.register("venueName")}
        />
        <div className="grid gap-2">
          <label htmlFor="venueAddress" className="text-sm leading-none font-medium">
            Venue address
          </label>
          <Textarea
            id="venueAddress"
            rows={3}
            aria-invalid={errors.venueAddress ? true : undefined}
            aria-describedby={errors.venueAddress ? "venueAddress-error" : undefined}
            {...form.register("venueAddress")}
          />
          {errors.venueAddress?.message ? (
            <p id="venueAddress-error" role="alert" className="text-destructive text-sm">
              {errors.venueAddress.message}
            </p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Map link"
            name="mapUrl"
            placeholder="https://maps.google.com/…"
            error={errors.mapUrl?.message}
            fieldProps={form.register("mapUrl")}
          />
          <Field
            label="Waze link"
            name="wazeUrl"
            placeholder="https://waze.com/ul/…"
            error={errors.wazeUrl?.message}
            fieldProps={form.register("wazeUrl")}
          />
        </div>
      </Section>

      <Section title="Details" description="Dress code and a contact for guests.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Dress code"
            name="dressCode"
            placeholder="Traditional / Emerald green"
            error={errors.dressCode?.message}
            fieldProps={form.register("dressCode")}
          />
          <Field
            label="Phone"
            name="phone"
            type="tel"
            placeholder="+880 1XXX-XXXXXX"
            error={errors.phone?.message}
            fieldProps={form.register("phone")}
          />
        </div>
      </Section>

      <Section title="Music" description="Background music for the invitation page.">
        <fieldset className="grid gap-2">
          <legend className="text-sm leading-none font-medium">Music source</legend>
          <div className="flex flex-wrap gap-4">
            {MUSIC_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  value={option.value}
                  className="accent-primary"
                  {...form.register("musicType")}
                />
                {option.label}
              </label>
            ))}
          </div>
          {errors.musicType?.message ? (
            <p role="alert" className="text-destructive text-sm">
              {errors.musicType.message}
            </p>
          ) : null}
        </fieldset>

        {watchedMusicType === "youtube" ? (
          <Field
            label="YouTube link"
            name="musicUrl"
            placeholder="https://www.youtube.com/watch?v=…"
            error={errors.musicUrl?.message}
            fieldProps={form.register("musicUrl")}
          />
        ) : (
          <p className="text-muted-foreground text-sm">
            Audio uploads are wired up in a later session — the field is stored but not yet
            played.
          </p>
        )}
      </Section>

      <div className="flex flex-wrap items-center gap-4 border-t pt-6">
        <Button type="submit" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              Saving
            </>
          ) : (
            "Save changes"
          )}
        </Button>
        {state.status === "success" ? (
          <p role="status" className="text-muted-foreground flex items-center gap-2 text-sm">
            <Check className="text-primary size-4" aria-hidden />
            Saved
          </p>
        ) : null}
        {state.status === "error" && state.message ? (
          <p role="alert" className="text-destructive text-sm">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4">
      <div className="grid gap-1">
        <h2 className="font-serif text-lg font-medium">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {children}
    </section>
  );
}
