import "server-only";

import type { Model, Types } from "mongoose";

import { toObjectId } from "@/lib/data/object-id";
import { getMongoose } from "@/lib/mongodb";

/**
 * Generic data access for the wedding-scoped children — events, contacts,
 * gallery images, gift items.
 *
 * Every function takes the *wedding's* id rather than the child's id alone, so
 * the parent scope is part of the query filter itself. That mirrors the Session 
 * 2 rule: a row belonging to another wedding is not found, there is no
 * "fetch, then compare" step for a forged id to slip past.
 *
 * Note what this layer does *not* do: it does not check that the caller owns the
 * wedding. The four collections have no denormalised `userId` to filter on, so
 * the ownership decision happens once, in `requireOwnedWedding`, before any
 * function here is reached. Call it first or these helpers are not safe.
 *
 * `sortOrder` is always rewritten as a dense 0..n-1 sequence. Keeping it dense
 * is what makes up/down reordering exact: gaps and duplicate values from an
 * interrupted reorder would otherwise make "the item above" ambiguous.
 */

/**
 * Every wedding-scoped child, as far as this layer is concerned.
 *
 * `weddingId` is part of the constraint rather than just `sortOrder`, because the
 * parent scope is what makes these queries owner-safe *and* what lets
 * Mongoose's `FilterQuery` typing accept the filter at all.
 */
type Child = { _id: Types.ObjectId; weddingId: Types.ObjectId; sortOrder: number };

/**
 * Mongoose's own `FilterQuery` / `UpdateQuery` are not exported from the package
 * root in this version, and they cannot resolve while `T` is still an unresolved
 * type parameter. The two shapes actually used below are concrete and
 * self-documenting, so they are declared here instead of cast through `any`.
 */
type ChildFilter = { _id: Types.ObjectId; weddingId: Types.ObjectId };
type ChildUpdate = { $set: Record<string, unknown> };

// Tie-break on _id so the order is total and repeatable even if two rows ever
// share a sortOrder.
const ORDER = { sortOrder: 1 as const, _id: 1 as const };

export type SortDirection = "up" | "down";

export async function listChildren<T extends Child>(
  model: Model<T>,
  weddingId: string,
): Promise<T[]> {
  const owner = toObjectId(weddingId);
  if (!owner) return [];

  return model.find({ weddingId: owner } as ChildFilter).sort(ORDER).lean().exec();
}

export async function createChild<T extends Child>(
  model: Model<T>,
  weddingId: string,
  values: Record<string, unknown>,
): Promise<T> {
  const owner = toObjectId(weddingId);
  if (!owner) throw new Error("Invalid wedding id.");

  const count = await model.countDocuments({ weddingId: owner }).exec();

  // `values` arrives as a plain record from a Zod-parsed payload; the cast
  // hands responsibility for its shape to the per-entity callers, which all
  // pass a schema-validated object.
  return model.create({ ...values, weddingId: owner, sortOrder: count } as unknown as T);
}

export async function updateChild<T extends Child>(
  model: Model<T>,
  weddingId: string,
  childId: string,
  values: Record<string, unknown>,
): Promise<T | null> {
  const owner = toObjectId(weddingId);
  const id = toObjectId(childId);
  if (!owner || !id) return null;

  // A `sortOrder` in the payload would let a crafted form edit jump an item
  // anywhere in the list; ordering only ever changes through `moveChild`.
  const rest: Record<string, unknown> = { ...values };
  delete rest.sortOrder;
  delete rest.weddingId;

  // The cast is needed because Mongoose's `findOneAndUpdate` overloads resolve to
  // a union that includes the array form; this call cannot return an array.
  return model
    .findOneAndUpdate(
      { _id: id, weddingId: owner } as ChildFilter,
      { $set: rest } as ChildUpdate,
      { returnDocument: "after", runValidators: true },
    )
    .lean()
    .exec() as Promise<T | null>;
}

export async function deleteChild<T extends Child>(
  model: Model<T>,
  weddingId: string,
  childId: string,
): Promise<T | null> {
  const owner = toObjectId(weddingId);
  const id = toObjectId(childId);
  if (!owner || !id) return null;

  const deleted = (await model
    .findOneAndDelete({ _id: id, weddingId: owner } as ChildFilter)
    .lean()
    .exec()) as T | null;

  // Close the gap the removed row left behind.
  if (deleted) await renumber(model, owner);

  return deleted;
}

/**
 * Move a child one slot up or down, then renumber the whole list.
 *
 * Reading the list and writing back a dense sequence is a little more work than
 * swapping two numbers, but it cannot leave the list in a state where two rows
 * claim the same position.
 */
export async function moveChild<T extends Child>(
  model: Model<T>,
  weddingId: string,
  childId: string,
  direction: SortDirection,
): Promise<boolean> {
  const owner = toObjectId(weddingId);
  const id = toObjectId(childId);
  if (!owner || !id) return false;

  const items = await model
    .find({ weddingId: owner } as ChildFilter)
    .sort(ORDER)
    .lean()
    .exec();

  const index = items.findIndex((item) => item._id.equals(id));
  if (index === -1) return false;

  const target = direction === "up" ? index - 1 : index + 1;
  // Already at the end of the list — a no-op, not an error.
  if (target < 0 || target >= items.length) return false;

  [items[index], items[target]] = [items[target], items[index]];

  await writeOrder(model, items);
  return true;
}

/** Rewrite sortOrder as 0..n-1 following the current stored order. */
export async function renumber<T extends Child>(
  model: Model<T>,
  owner: Types.ObjectId,
): Promise<void> {
  const items = await model
    .find({ weddingId: owner } as ChildFilter)
    .sort(ORDER)
    .lean()
    .exec();
  await writeOrder(model, items);
}

async function writeOrder<T extends Child>(model: Model<T>, items: T[]): Promise<void> {
  if (items.length === 0) return;

  await (await getMongoose()).connection.db!.collection(model.collection.name).bulkWrite(
    items.map((item, index) => ({
      updateOne: {
        filter: { _id: item._id },
        update: { $set: { sortOrder: index } },
      },
    })),
  );
}
