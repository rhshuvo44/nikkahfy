import "server-only";

import { createChild, deleteChild, listChildren, moveChild, updateChild } from "@/lib/data/wedding-children";
import { ContactModel, type Contact } from "@/lib/models/contact";
import type { ContactValues } from "@/lib/validation/wedding-children";

/** People guests can call. Fields are exactly the session prompt's. */
export function listContacts(weddingId: string): Promise<Contact[]> {
  return listChildren(ContactModel, weddingId);
}

export function createContact(weddingId: string, values: ContactValues): Promise<Contact> {
  return createChild(ContactModel, weddingId, values);
}

export function updateContact(
  weddingId: string,
  contactId: string,
  values: ContactValues,
): Promise<Contact | null> {
  return updateChild(ContactModel, weddingId, contactId, values);
}

export function deleteContact(weddingId: string, contactId: string): Promise<Contact | null> {
  return deleteChild(ContactModel, weddingId, contactId);
}

export function moveContact(
  weddingId: string,
  contactId: string,
  direction: "up" | "down",
): Promise<boolean> {
  return moveChild(ContactModel, weddingId, contactId, direction);
}
