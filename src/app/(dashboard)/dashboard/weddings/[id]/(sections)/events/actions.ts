"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import {
  addScheduleEntry,
  createEvent,
  deleteEvent,
  deleteScheduleEntry,
  moveEvent,
  moveScheduleEntry,
  updateEvent,
  updateScheduleEntry,
} from "@/lib/data/wedding-events";
import { requireOwnedWedding } from "@/lib/wedding-access";
import {
  eventWriteSchema,
  fieldErrors,
  scheduleEntrySchema,
  type EventFormValues,
  type ScheduleEntryValues,
} from "@/lib/validation/wedding-children";

/**
 * Event and schedule mutations.
 *
 * Every action starts with `requireUser` then `requireOwnedWedding`, so the
 * wedding id is proven to belong to the session user before any child document
 * is touched. The `weddingId` argument is bound by the form but is untrusted
 * input like any other POST field — another user's wedding resolves to `null`
 * and the action returns 404, the same response as a wedding that does not
 * exist.
 *
 * The Zod parse is repeated here on purpose: the client copy is only for
 * immediate feedback, and these are ordinary HTTP endpoints.
 */

export type EventActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string>;
};

export type SimpleResult = { ok: boolean; message?: string };

const DONE: EventActionState = { status: "success" };

function revalidate(weddingId: string) {
  revalidatePath(`/dashboard/weddings/${weddingId}/events`);
}

export async function createEventAction(
  weddingId: string,
  _previous: EventActionState,
  values: EventFormValues,
): Promise<EventActionState> {
  const user = await requireUser(`/dashboard/weddings/${weddingId}/events`);
  await requireOwnedWedding(weddingId, user.id);

  const parsed = eventWriteSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: "Some fields need attention.", errors: fieldErrors(parsed.error) };
  }

  await createEvent(weddingId, parsed.data);
  revalidate(weddingId);

  return DONE;
}

export async function updateEventAction(
  weddingId: string,
  eventId: string,
  _previous: EventActionState,
  values: EventFormValues,
): Promise<EventActionState> {
  const user = await requireUser(`/dashboard/weddings/${weddingId}/events`);
  await requireOwnedWedding(weddingId, user.id);

  const parsed = eventWriteSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: "Some fields need attention.", errors: fieldErrors(parsed.error) };
  }

  const updated = await updateEvent(weddingId, eventId, parsed.data);
  if (!updated) return { status: "error", message: "That event no longer exists." };

  revalidate(weddingId);

  return DONE;
}

export async function deleteEventAction(
  weddingId: string,
  eventId: string,
): Promise<SimpleResult> {
  const user = await requireUser(`/dashboard/weddings/${weddingId}/events`);
  await requireOwnedWedding(weddingId, user.id);

  const deleted = await deleteEvent(weddingId, eventId);
  if (!deleted) return { ok: false, message: "That event no longer exists." };

  revalidate(weddingId);

  return { ok: true };
}

export async function moveEventAction(
  weddingId: string,
  eventId: string,
  direction: "up" | "down",
): Promise<SimpleResult> {
  const user = await requireUser(`/dashboard/weddings/${weddingId}/events`);
  await requireOwnedWedding(weddingId, user.id);

  // A move to the end of the list is a no-op, not a failure, so a stale button
  // click while the list is re-rendering cannot raise an error toast.
  await moveEvent(weddingId, eventId, direction);
  revalidate(weddingId);

  return { ok: true };
}

/**
 * Schedule entries live inside the event document, so these are thin wrappers
 * that re-verify the wedding and then hand off to the embedded-array helpers.
 * The index is a number from the rendered list and is bounds-checked there.
 */

export async function addScheduleEntryAction(
  weddingId: string,
  eventId: string,
  _previous: EventActionState,
  values: ScheduleEntryValues,
): Promise<EventActionState> {
  const user = await requireUser(`/dashboard/weddings/${weddingId}/events`);
  await requireOwnedWedding(weddingId, user.id);

  const parsed = scheduleEntrySchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: "Check the schedule item.", errors: fieldErrors(parsed.error) };
  }

  const added = await addScheduleEntry(weddingId, eventId, parsed.data);
  if (!added) return { status: "error", message: "That event no longer exists." };

  revalidate(weddingId);

  return DONE;
}

export async function updateScheduleEntryAction(
  weddingId: string,
  eventId: string,
  index: number,
  _previous: EventActionState,
  values: ScheduleEntryValues,
): Promise<EventActionState> {
  const user = await requireUser(`/dashboard/weddings/${weddingId}/events`);
  await requireOwnedWedding(weddingId, user.id);

  const parsed = scheduleEntrySchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: "Check the schedule item.", errors: fieldErrors(parsed.error) };
  }

  const updated = await updateScheduleEntry(weddingId, eventId, index, parsed.data);
  if (!updated) return { status: "error", message: "That schedule item no longer exists." };

  revalidate(weddingId);

  return DONE;
}

export async function deleteScheduleEntryAction(
  weddingId: string,
  eventId: string,
  index: number,
): Promise<SimpleResult> {
  const user = await requireUser(`/dashboard/weddings/${weddingId}/events`);
  await requireOwnedWedding(weddingId, user.id);

  const deleted = await deleteScheduleEntry(weddingId, eventId, index);
  if (!deleted) return { ok: false, message: "That schedule item no longer exists." };

  revalidate(weddingId);

  return { ok: true };
}

export async function moveScheduleEntryAction(
  weddingId: string,
  eventId: string,
  index: number,
  direction: "up" | "down",
): Promise<SimpleResult> {
  const user = await requireUser(`/dashboard/weddings/${weddingId}/events`);
  await requireOwnedWedding(weddingId, user.id);

  await moveScheduleEntry(weddingId, eventId, index, direction);
  revalidate(weddingId);

  return { ok: true };
}
