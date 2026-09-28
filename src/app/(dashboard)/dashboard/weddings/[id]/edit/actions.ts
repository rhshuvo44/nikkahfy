"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { updateWeddingForUser } from "@/lib/data/weddings";
import {
  toFieldErrors,
  weddingFormSchema,
  type WeddingFormValues,
} from "@/lib/validation/wedding";

export type SaveWeddingState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string>;
};

/**
 * Saves the edit form.
 *
 * The `weddingId` is bound by the caller, but it is treated as untrusted input:
 * `updateWeddingForUser` folds both the id and the session user's id into a
 * single query filter, so another user's wedding simply does not match and this
 * returns 404. The Zod parse is re-run here because the client copy is only a
 * convenience — the payload arrives over the network and is not validated yet.
 */
export async function saveWeddingAction(
  weddingId: string,
  _previous: SaveWeddingState,
  values: WeddingFormValues,
): Promise<SaveWeddingState> {
  const user = await requireUser(`/dashboard/weddings/${weddingId}/edit`);

  const parsed = weddingFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Some fields need attention.",
      errors: toFieldErrors(parsed.error),
    };
  }

  const updated = await updateWeddingForUser(weddingId, user.id, parsed.data);

  if (!updated) {
    // Either it does not exist or it belongs to someone else. Same response for
    // both, so this cannot be used to probe for other people's weddings.
    notFound();
  }

  revalidatePath("/dashboard");

  return { status: "success" };
}
