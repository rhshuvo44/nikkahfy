"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import {
  createContact,
  deleteContact,
  moveContact,
  updateContact,
} from "@/lib/data/contacts";
import { requireOwnedWedding } from "@/lib/wedding-access";
import {
  contactSchema,
  fieldErrors,
  type ContactValues,
} from "@/lib/validation/wedding-children";

/**
 * Contact mutations. Same ownership gate as every other section: authenticate,
 * then prove the wedding belongs to the session user, then touch the child.
 */

export type ContactActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string>;
};

export type SimpleResult = { ok: boolean; message?: string };

const DONE: ContactActionState = { status: "success" };

function revalidate(weddingId: string) {
  revalidatePath(`/dashboard/weddings/${weddingId}/contacts`);
}

export async function createContactAction(
  weddingId: string,
  _previous: ContactActionState,
  values: ContactValues,
): Promise<ContactActionState> {
  const user = await requireUser(`/dashboard/weddings/${weddingId}/contacts`);
  await requireOwnedWedding(weddingId, user.id);

  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Some fields need attention.",
      errors: fieldErrors(parsed.error),
    };
  }

  await createContact(weddingId, parsed.data);
  revalidate(weddingId);

  return DONE;
}

export async function updateContactAction(
  weddingId: string,
  contactId: string,
  _previous: ContactActionState,
  values: ContactValues,
): Promise<ContactActionState> {
  const user = await requireUser(`/dashboard/weddings/${weddingId}/contacts`);
  await requireOwnedWedding(weddingId, user.id);

  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Some fields need attention.",
      errors: fieldErrors(parsed.error),
    };
  }

  const updated = await updateContact(weddingId, contactId, parsed.data);
  if (!updated) return { status: "error", message: "That contact no longer exists." };

  revalidate(weddingId);

  return DONE;
}

export async function deleteContactAction(
  weddingId: string,
  contactId: string,
): Promise<SimpleResult> {
  const user = await requireUser(`/dashboard/weddings/${weddingId}/contacts`);
  await requireOwnedWedding(weddingId, user.id);

  const deleted = await deleteContact(weddingId, contactId);
  if (!deleted) return { ok: false, message: "That contact no longer exists." };

  revalidate(weddingId);

  return { ok: true };
}

export async function moveContactAction(
  weddingId: string,
  contactId: string,
  direction: "up" | "down",
): Promise<SimpleResult> {
  const user = await requireUser(`/dashboard/weddings/${weddingId}/contacts`);
  await requireOwnedWedding(weddingId, user.id);

  await moveContact(weddingId, contactId, direction);
  revalidate(weddingId);

  return { ok: true };
}
