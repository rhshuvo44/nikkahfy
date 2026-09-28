import "server-only";

import { createChild, deleteChild, listChildren, moveChild, updateChild } from "@/lib/data/wedding-children";
import { toObjectId } from "@/lib/data/object-id";
import { getMongoose } from "@/lib/mongodb";
import { WeddingEventModel, type WeddingEvent } from "@/lib/models/wedding-event";
import type { ScheduleEntryValues, WeddingEventValues } from "@/lib/validation/wedding-children";

/**
 * Events, plus the per-event schedule.
 *
 * The schedule is an embedded array, so its entries are addressed by *position*
 * and saved as part of the event document — there is no schedule collection and
 * no second ownership check. The trade-off is that two tabs editing one event's
 * schedule could interleave; each action re-reads the document, so within a
 * single action the index is always resolved against current state.
 */

export function listEvents(weddingId: string): Promise<WeddingEvent[]> {
  return listChildren(WeddingEventModel, weddingId);
}

export function createEvent(
  weddingId: string,
  values: WeddingEventValues,
): Promise<WeddingEvent> {
  return createChild(WeddingEventModel, weddingId, { ...values, schedule: [] });
}

export function updateEvent(
  weddingId: string,
  eventId: string,
  values: WeddingEventValues,
): Promise<WeddingEvent | null> {
  return updateChild(WeddingEventModel, weddingId, eventId, values);
}

export function deleteEvent(weddingId: string, eventId: string): Promise<WeddingEvent | null> {
  return deleteChild(WeddingEventModel, weddingId, eventId);
}

export function moveEvent(
  weddingId: string,
  eventId: string,
  direction: "up" | "down",
): Promise<boolean> {
  return moveChild(WeddingEventModel, weddingId, eventId, direction);
}

/** Loads the event itself, scoped to its wedding. Used by the schedule helpers. */
async function findEvent(weddingId: string, eventId: string) {
  const owner = toObjectId(weddingId);
  const id = toObjectId(eventId);
  if (!owner || !id) return null;

  return WeddingEventModel.findOne({ _id: id, weddingId: owner }).exec();
}

export async function addScheduleEntry(
  weddingId: string,
  eventId: string,
  entry: ScheduleEntryValues,
): Promise<boolean> {
  const event = await findEvent(weddingId, eventId);
  if (!event) return false;

  event.schedule.push({ title: entry.title, time: entry.time });
  await event.save();

  return true;
}

export async function updateScheduleEntry(
  weddingId: string,
  eventId: string,
  index: number,
  entry: ScheduleEntryValues,
): Promise<boolean> {
  const event = await findEvent(weddingId, eventId);
  if (!event) return false;

  if (index < 0 || index >= event.schedule.length) return false;

  // Plain index assignment rather than Mongoose's Array#set: `WeddingEvent` is
  // a hand-written type where `schedule` is a normal array, and the document is
  // re-saved immediately after.
  event.schedule[index] = { title: entry.title, time: entry.time };
  await event.save();

  return true;
}

export async function deleteScheduleEntry(
  weddingId: string,
  eventId: string,
  index: number,
): Promise<boolean> {
  const event = await findEvent(weddingId, eventId);
  if (!event) return false;

  if (index < 0 || index >= event.schedule.length) return false;

  event.schedule.splice(index, 1);
  await event.save();

  return true;
}

export async function moveScheduleEntry(
  weddingId: string,
  eventId: string,
  index: number,
  direction: "up" | "down",
): Promise<boolean> {
  const event = await findEvent(weddingId, eventId);
  if (!event) return false;

  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || index >= event.schedule.length) return false;
  if (target < 0 || target >= event.schedule.length) return false;

  const [entry] = event.schedule.splice(index, 1);
  event.schedule.splice(target, 0, entry);
  await event.save();

  return true;
}

/**
 * Kept for parity with the other children: the generic layer reuses it to
 * renumber after a delete, and it is exercised by the verification script.
 */
export async function countEvents(weddingId: string): Promise<number> {
  const owner = toObjectId(weddingId);
  if (!owner) return 0;

  await getMongoose();
  return WeddingEventModel.countDocuments({ weddingId: owner }).exec();
}
