"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, Pencil, Plus, X } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  addScheduleEntryAction,
  createEventAction,
  deleteEventAction,
  deleteScheduleEntryAction,
  moveEventAction,
  moveScheduleEntryAction,
  updateEventAction,
  updateScheduleEntryAction,
  type EventActionState,
} from "@/app/(dashboard)/dashboard/weddings/[id]/(sections)/events/actions";
import {
  DeleteButton,
  EmptyList,
  MoveButtons,
  RowCard,
  useAction,
} from "@/components/dashboard/content-list";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { eventFormSchema, scheduleEntrySchema } from "@/lib/validation/wedding-children";
import type { EventFormValues } from "@/lib/validation/wedding-children";
import type { ScheduleEntryValues } from "@/lib/validation/wedding-children";
import { parentsToText, type EventDto } from "@/lib/wedding-content-dto";

/**
 * Events, each with its own schedule sub-list.
 *
 * Editing is inline: a row swaps into its form rather than navigating, which
 * keeps the up/down buttons in place and avoids a page per event. The schedule
 * is a second level of the same pattern, with its own index-based actions.
 */

const EMPTY_EVENT: EventFormValues = {
  title: "",
  gratitudeLine: "With Joy & Gratitude to Almighty Allah",
  joiner: "together with",
  sideAParents: "",
  sideBParents: "",
};

export function EventsManager({
  weddingId,
  events,
}: {
  weddingId: string;
  events: EventDto[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="grid gap-6">
      <EventForm
        key="new"
        weddingId={weddingId}
        action={createEventAction.bind(null, weddingId)}
        submitLabel="Add event"
        defaults={EMPTY_EVENT}
        heading="Add an event"
      />

      {events.length === 0 ? (
        <EmptyList>No events yet. Add Engagement, Holud, Wedding or Reception above.</EmptyList>
      ) : (
        <ul className="grid gap-4">
          {events.map((event, index) => (
            <RowCard key={event.id}>
              {editingId === event.id ? (
                <EventForm
                  key={event.id}
                  weddingId={weddingId}
                  action={updateEventAction.bind(null, weddingId, event.id)}
                  submitLabel="Save event"
                  defaults={{
                    title: event.title,
                    gratitudeLine: event.gratitudeLine,
                    joiner: event.joiner,
                    sideAParents: parentsToText(event.sideAParents),
                    sideBParents: parentsToText(event.sideBParents),
                  }}
                  heading={`Edit ${event.title}`}
                  onDone={() => setEditingId(null)}
                />
              ) : (
                <EventSummary
                  event={event}
                  controls={
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(event.id)}
                      >
                        <Pencil aria-hidden className="size-4" />
                        Edit
                      </Button>
                      <MoveControls
                        weddingId={weddingId}
                        eventId={event.id}
                        isFirst={index === 0}
                        isLast={index === events.length - 1}
                      />
                      <DeleteEventButton weddingId={weddingId} eventId={event.id} />
                    </div>
                  }
                />
              )}

              <ScheduleList weddingId={weddingId} eventId={event.id} schedule={event.schedule} />
            </RowCard>
          ))}
        </ul>
      )}
    </div>
  );
}

function EventSummary({
  event,
  controls,
}: {
  event: EventDto;
  controls: React.ReactNode;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-semibold">{event.title}</h2>
        {controls}
      </div>

      {event.gratitudeLine ? (
        <p className="text-muted-foreground text-sm italic">{event.gratitudeLine}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
        <ParentList label="Side A" parents={event.sideAParents} />
        <p className="text-muted-foreground self-center text-sm italic">{event.joiner}</p>
        <ParentList label="Side B" parents={event.sideBParents} />
      </div>
    </div>
  );
}

function ParentList({ label, parents }: { label: string; parents: string[] }) {
  if (parents.length === 0) return null;

  return (
    <div className="grid gap-1">
      <h3 className="text-xs font-medium tracking-wide uppercase">{label} parents</h3>
      <ul className="text-muted-foreground text-sm">
        {parents.map((parent) => (
          <li key={parent}>{parent}</li>
        ))}
      </ul>
    </div>
  );
}

function EventForm({
  action,
  submitLabel,
  defaults,
  heading,
  onDone,
}: {
  weddingId: string;
  action: (state: EventActionState, values: EventFormValues) => Promise<EventActionState>;
  submitLabel: string;
  defaults: EventFormValues;
  heading: string;
  onDone?: () => void;
}) {
  const [state, formAction, isActionPending] = useActionState<EventActionState, EventFormValues>(
    action,
    { status: "idle" },
  );
  const [, startTransition] = useTransition();

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: defaults,
  });

  const isPending = isActionPending || form.formState.isSubmitting;
  const errors = form.formState.errors;

  // The parents fields are transformed into arrays server-side, so the
  // server-side errors use the same field names as the inputs.
  useEffect(() => {
    if (state.status !== "error" || !state.errors) return;
    for (const [name, message] of Object.entries(state.errors)) {
      form.setError(name as keyof EventFormValues, { type: "server", message });
    }
  }, [state, form]);

  useEffect(() => {
    if (state.status === "success") onDone?.();
  }, [state, onDone]);

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        startTransition(async () => {
          await formAction(values);
        });
      })}
      noValidate
      className="grid gap-4"
    >
      <h2 className="text-sm font-semibold">{heading}</h2>

      <Field
        label="Event title"
        name="title"
        placeholder="Reception"
        error={errors.title?.message}
        fieldProps={form.register("title")}
      />

      <Field
        label="Gratitude line"
        name="gratitudeLine"
        placeholder="With Joy & Gratitude to Almighty Allah"
        error={errors.gratitudeLine?.message}
        fieldProps={form.register("gratitudeLine")}
      />

      <Field
        label="Joiner"
        name="joiner"
        placeholder="together with"
        hint="The line between the two parent lists."
        error={errors.joiner?.message}
        fieldProps={form.register("joiner")}
      />

      <Field
        label="Side A parents"
        name="sideAParents"
        hint="One name per line."
        error={errors.sideAParents?.message}
      >
        <Textarea
          id="sideAParents"
          rows={4}
          aria-invalid={errors.sideAParents ? true : undefined}
          {...form.register("sideAParents")}
        />
      </Field>

      <Field
        label="Side B parents"
        name="sideBParents"
        hint="One name per line."
        error={errors.sideBParents?.message}
      >
        <Textarea
          id="sideBParents"
          rows={4}
          aria-invalid={errors.sideBParents ? true : undefined}
          {...form.register("sideBParents")}
        />
      </Field>

      {state.status === "error" && state.message ? (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Check aria-hidden className="size-4" />}
          {submitLabel}
        </Button>
        {onDone ? (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function ScheduleList({
  weddingId,
  eventId,
  schedule,
}: {
  weddingId: string;
  eventId: string;
  schedule: { title: string; time: string }[];
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <section className="border-border grid gap-3 border-t pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Schedule</h3>
        {!adding ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus aria-hidden className="size-4" />
            Add item
          </Button>
        ) : null}
      </div>

      {schedule.length === 0 && !adding ? (
        <p className="text-muted-foreground text-sm">No schedule items yet.</p>
      ) : null}

      <ul className="grid gap-2">
        {schedule.map((entry, index) => (
          <li
            key={`${entry.title}-${index}`}
            className="bg-muted/40 flex items-center gap-3 rounded-md px-3 py-2"
          >
            {editingIndex === index ? (
              <ScheduleForm
                className="flex-1"
                action={updateScheduleEntryAction.bind(null, weddingId, eventId, index)}
                submitLabel="Save"
                defaults={entry}
                onDone={() => setEditingIndex(null)}
              />
            ) : (
              <>
                <span className="flex-1 text-sm">
                  {entry.title} <span className="text-muted-foreground">— {entry.time}</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Edit schedule item"
                  onClick={() => setEditingIndex(index)}
                >
                  <Pencil aria-hidden className="size-4" />
                </Button>
                <MoveScheduleControls
                  weddingId={weddingId}
                  eventId={eventId}
                  index={index}
                  length={schedule.length}
                />
                <DeleteScheduleButton weddingId={weddingId} eventId={eventId} index={index} />
              </>
            )}
          </li>
        ))}
      </ul>

      {adding ? (
        <ScheduleForm
          action={addScheduleEntryAction.bind(null, weddingId, eventId)}
          submitLabel="Add item"
          defaults={{ title: "", time: "" }}
          onDone={() => setAdding(false)}
        />
      ) : null}
    </section>
  );
}

function ScheduleForm({
  action,
  submitLabel,
  defaults,
  onDone,
  className,
}: {
  action: (state: EventActionState, values: ScheduleEntryValues) => Promise<EventActionState>;
  submitLabel: string;
  defaults: ScheduleEntryValues;
  onDone: () => void;
  className?: string;
}) {
  const [state, formAction, isActionPending] = useActionState<EventActionState, ScheduleEntryValues>(
    action,
    { status: "idle" },
  );
  const [, startTransition] = useTransition();

  const form = useForm<ScheduleEntryValues>({
    resolver: zodResolver(scheduleEntrySchema),
    defaultValues: defaults,
  });

  const isPending = isActionPending || form.formState.isSubmitting;

  const errors = form.formState.errors;

  useEffect(() => {
    if (state.status !== "error" || !state.errors) return;
    for (const [name, message] of Object.entries(state.errors)) {
      form.setError(name as keyof ScheduleEntryValues, { type: "server", message });
    }
  }, [state, form]);

  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state, onDone]);

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        startTransition(async () => {
          await formAction(values);
        });
      })}
      noValidate
      className={className ?? "grid gap-2"}
    >
      <div className={className ? "flex flex-wrap items-start gap-2" : "grid gap-2"}>
        <div className="min-w-40 flex-1">
          <Field
            label="Title"
            name="title"
            error={errors.title?.message}
            fieldProps={form.register("title")}
          />
        </div>
        <div className="min-w-32 flex-1">
          <Field
            label="Time"
            name="time"
            placeholder="6:30 PM"
            error={errors.time?.message}
            fieldProps={form.register("time")}
          />
        </div>
        <div className="flex items-center gap-1 pt-6">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : (
              <Check aria-hidden className="size-4" />
            )}
            {submitLabel}
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Cancel" onClick={onDone}>
            <X aria-hidden className="size-4" />
          </Button>
        </div>
      </div>
    </form>
  );
}

function MoveControls({
  weddingId,
  eventId,
  isFirst,
  isLast,
}: {
  weddingId: string;
  eventId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { isPending, run } = useAction();

  return (
    <MoveButtons
      isFirst={isFirst}
      isLast={isLast}
      disabled={isPending}
      onMove={(direction) =>
        run(() => moveEventAction(weddingId, eventId, direction), { success: "Event reordered." })
      }
    />
  );
}

function MoveScheduleControls({
  weddingId,
  eventId,
  index,
  length,
}: {
  weddingId: string;
  eventId: string;
  index: number;
  length: number;
}) {
  const { isPending, run } = useAction();

  return (
    <MoveButtons
      isFirst={index === 0}
      isLast={index === length - 1}
      disabled={isPending}
      onMove={(direction) => run(() => moveScheduleEntryAction(weddingId, eventId, index, direction))}
    />
  );
}

function DeleteEventButton({ weddingId, eventId }: { weddingId: string; eventId: string }) {
  const { isPending, run } = useAction();

  return (
    <DeleteButton
      disabled={isPending}
      label="Delete event"
      onDelete={() =>
        run(() => deleteEventAction(weddingId, eventId), {
          success: "Event deleted.",
          pending: "Deleting…",
        })
      }
    />
  );
}

function DeleteScheduleButton({
  weddingId,
  eventId,
  index,
}: {
  weddingId: string;
  eventId: string;
  index: number;
}) {
  const { isPending, run } = useAction();

  return (
    <DeleteButton
      disabled={isPending}
      label="Delete schedule item"
      onDelete={() => run(() => deleteScheduleEntryAction(weddingId, eventId, index))}
    />
  );
}
