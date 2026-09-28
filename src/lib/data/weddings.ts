import "server-only";

import { toObjectId } from "@/lib/data/object-id";
import { getMongoose } from "@/lib/mongodb";
import { WeddingModel, type Wedding } from "@/lib/models/wedding";
import { deriveWeddingDateShort, type WeddingFormValues } from "@/lib/validation/wedding";

/**
 * Every function here takes the *session user's id* and folds it into the query
 * filter. A wedding belonging to someone else is therefore not found at all —
 * there is no "fetch, then compare" step for a URL param to slip past.
 *
 * The session exposes the user id as a string while MongoDB stores it as an
 * ObjectId, so all of it goes through `toObjectId`. A malformed id yields
 * `null`, and every function treats that as "no such record" rather than
 * throwing, which keeps a junk URL param from producing a 500.
 */

/** The subset of the form that maps onto document fields, after derivation. */
type WeddingWrite = Omit<WeddingFormValues, "weddingDate"> & {
  weddingDate: Date | null;
  weddingDateShort: string;
};

function toWrite(values: WeddingFormValues): WeddingWrite {
  return {
    ...values,
    title: values.title.trim(),
    weddingDate: values.weddingDate ? new Date(`${values.weddingDate}T00:00:00.000Z`) : null,
    // Derived, never taken from the request, so the short label cannot drift
    // away from the real date.
    weddingDateShort: deriveWeddingDateShort(values.weddingDate),
  };
}

export async function listWeddingsForUser(userId: string): Promise<Wedding[]> {
  const owner = toObjectId(userId);
  if (!owner) return [];

  await getMongoose();

  return WeddingModel.find({ userId: owner }).sort({ createdAt: -1 }).lean().exec();
}

export async function findWeddingForUser(id: string, userId: string): Promise<Wedding | null> {
  const weddingId = toObjectId(id);
  const owner = toObjectId(userId);
  if (!weddingId || !owner) return null;

  await getMongoose();

  return WeddingModel.findOne({ _id: weddingId, userId: owner }).lean().exec();
}

export async function createWedding(
  userId: string,
  values: WeddingFormValues,
): Promise<Wedding | null> {
  const owner = toObjectId(userId);
  if (!owner) return null;

  await getMongoose();

  const [created] = await WeddingModel.create([{ userId: owner, ...toWrite(values) }]);
  return created?.toObject() ?? null;
}

export async function updateWeddingForUser(
  id: string,
  userId: string,
  values: WeddingFormValues,
): Promise<Wedding | null> {
  const weddingId = toObjectId(id);
  const owner = toObjectId(userId);
  if (!weddingId || !owner) return null;

  await getMongoose();

  // `runValidators` is set explicitly because Mongoose's schema-level option is
  // not applied to updates (see the note in `@/lib/data/users`).
  return WeddingModel.findOneAndUpdate(
    { _id: weddingId, userId: owner },
    { $set: toWrite(values) },
    { returnDocument: "after", runValidators: true },
  )
    .lean()
    .exec();
}

export async function deleteWeddingForUser(id: string, userId: string): Promise<boolean> {
  const weddingId = toObjectId(id);
  const owner = toObjectId(userId);
  if (!weddingId || !owner) return false;

  await getMongoose();

  const result = await WeddingModel.deleteOne({ _id: weddingId, userId: owner }).exec();
  return result.deletedCount === 1;
}

export async function countWeddingsForUser(userId: string): Promise<number> {
  const owner = toObjectId(userId);
  if (!owner) return 0;

  await getMongoose();

  return WeddingModel.countDocuments({ userId: owner }).exec();
}
