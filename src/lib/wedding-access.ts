import "server-only";

import { notFound } from "next/navigation";

import { findWeddingForUser } from "@/lib/data/weddings";
import type { Wedding } from "@/lib/models/wedding";

/**
 * The ownership gate for every wedding-scoped page and action in Session 3.
 *
 * Events, contacts, gallery images and gift items have no `userId` of their
 * own, so ownership cannot be folded into their queries the way it is for
 * `Wedding` itself. Instead the wedding is resolved *first*, through the same
 * owner-scoped query Session 2 uses, and the child helpers are only ever reached
 * with an id that has already been proven to belong to the session user.
 *
 * A wedding owned by somebody else is therefore indistinguishable from one that
 * does not exist: both produce a 404. There is no path to a "forbidden"
 * response that confirms the id is real, and none to the child collection.
 *
 * Always call this before any `wedding-children` helper.
 */
export async function requireOwnedWedding(weddingId: string, userId: string): Promise<Wedding> {
  const wedding = await findWeddingForUser(weddingId, userId);

  if (!wedding) {
    notFound();
  }

  return wedding;
}
