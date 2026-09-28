"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { createWedding } from "@/lib/data/weddings";
import { weddingFormDefaults } from "@/lib/validation/wedding";

/** Placeholder for the required `title` on a fresh draft. */
const DRAFT_TITLE = "Untitled wedding";

/**
 * Creates an empty draft owned by the current user, then redirects to its edit
 * page. `userId` comes from the session — never from the form.
 */
export async function createWeddingAction(): Promise<void> {
  const user = await requireUser("/dashboard/weddings/new");

  const wedding = await createWedding(user.id, {
    ...weddingFormDefaults,
    // Mongoose's `required` rejects an empty string, so a draft needs a real
    // title even though the user has not typed one yet.
    title: DRAFT_TITLE,
  });

  if (!wedding) {
    throw new Error("Could not create the wedding. Please try again.");
  }

  redirect(`/dashboard/weddings/${wedding._id.toString()}/edit`);
}
