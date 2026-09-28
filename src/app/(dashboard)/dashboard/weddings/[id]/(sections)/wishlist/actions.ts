"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { deleteImage, isCloudinaryConfigured, uploadImage } from "@/lib/cloudinary";
import {
  createGiftItem,
  deleteGiftItem,
  findGiftItem,
  moveGiftItem,
  updateGiftItem,
} from "@/lib/data/wishlist";
import { requireOwnedWedding } from "@/lib/wedding-access";
import { fieldErrors, giftItemSchema } from "@/lib/validation/wedding-children";

/**
 * Wishlist mutations.
 *
 * Like the gallery, the save action takes a `FormData` so the optional image can
 * ride along with the text fields. An empty wishlist is valid, so nothing here
 * requires a row to exist and there is no "add at least one" guard.
 */

export type WishlistActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string>;
};

export type SimpleResult = { ok: boolean; message?: string };

const DONE: WishlistActionState = { status: "success" };

function revalidate(weddingId: string) {
  revalidatePath(`/dashboard/weddings/${weddingId}/wishlist`);
}

/** The form's own text fields, pulled back out of the multipart body. */
function readValues(formData: FormData): Record<string, unknown> {
  return {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    link: String(formData.get("link") ?? ""),
  };
}

export async function createGiftItemAction(
  weddingId: string,
  _previous: WishlistActionState,
  formData: FormData,
): Promise<WishlistActionState> {
  const user = await requireUser(`/dashboard/weddings/${weddingId}/wishlist`);
  await requireOwnedWedding(weddingId, user.id);

  const parsed = giftItemSchema.safeParse(readValues(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Some fields need attention.",
      errors: fieldErrors(parsed.error),
    };
  }

  // The image is optional, so an unconfigured account can still use the rest of
  // the wishlist — only an actual upload attempt reports the missing keys.
  const file = formData.get("image");
  const hasFile = file instanceof File && file.size > 0;

  if (hasFile && !isCloudinaryConfigured()) {
    return {
      status: "error",
      message: "Image uploads are not configured. Add the CLOUDINARY_* keys to .env.local.",
    };
  }

  let uploaded: { url: string; publicId: string } | null = null;

  try {
    if (hasFile) {
      const result = await uploadImage(file as File, "nikkahfy/wishlist");
      uploaded = result;
    }

    await createGiftItem(weddingId, {
      ...parsed.data,
      imageUrl: uploaded?.url ?? "",
      imagePublicId: uploaded?.publicId ?? "",
    });
  } catch (error) {
    // Avoid orphaning the asset if the row failed to save.
    if (uploaded) await deleteImage(uploaded.publicId).catch(() => undefined);

    return {
      status: "error",
      message: error instanceof Error ? error.message : "That gift could not be saved.",
    };
  }

  revalidate(weddingId);

  return DONE;
}

export async function updateGiftItemAction(
  weddingId: string,
  itemId: string,
  _previous: WishlistActionState,
  formData: FormData,
): Promise<WishlistActionState> {
  const user = await requireUser(`/dashboard/weddings/${weddingId}/wishlist`);
  await requireOwnedWedding(weddingId, user.id);

  const parsed = giftItemSchema.safeParse(readValues(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Some fields need attention.",
      errors: fieldErrors(parsed.error),
    };
  }

  const file = formData.get("image");
  const hasFile = file instanceof File && file.size > 0;

  if (hasFile && !isCloudinaryConfigured()) {
    return {
      status: "error",
      message: "Image uploads are not configured. Add the CLOUDINARY_* keys to .env.local.",
    };
  }

  // The previous asset has to be read *before* the write: after the update the row
  // already points at the new image, so there is no way left to learn what the
  // old one was, and it would be orphaned on Cloudinary forever.
  const existing = await findGiftItem(weddingId, itemId);
  if (!existing) return { status: "error", message: "That gift no longer exists." };

  const previousPublicId = existing.imagePublicId;
  let uploaded: { url: string; publicId: string } | null = null;

  try {
    if (hasFile) {
      uploaded = await uploadImage(file as File, "nikkahfy/wishlist");
    }

    const updated = await updateGiftItem(weddingId, itemId, {
      ...parsed.data,
      // Omitted means "keep what is already there", so a text-only edit never
      // blanks the image.
      ...(uploaded ? { imageUrl: uploaded.url, imagePublicId: uploaded.publicId } : {}),
    });

    if (!updated) {
      if (uploaded) await deleteImage(uploaded.publicId).catch(() => undefined);
      return { status: "error", message: "That gift no longer exists." };
    }

    // Only safe now that the row points at the new asset.
    if (uploaded && previousPublicId && previousPublicId !== uploaded.publicId) {
      await deleteImage(previousPublicId).catch(() => undefined);
    }
  } catch (error) {
    if (uploaded) await deleteImage(uploaded.publicId).catch(() => undefined);

    return {
      status: "error",
      message: error instanceof Error ? error.message : "That gift could not be saved.",
    };
  }

  revalidate(weddingId);

  return DONE;
}

export async function deleteGiftItemAction(
  weddingId: string,
  itemId: string,
): Promise<SimpleResult> {
  const user = await requireUser(`/dashboard/weddings/${weddingId}/wishlist`);
  await requireOwnedWedding(weddingId, user.id);

  const deleted = await deleteGiftItem(weddingId, itemId);
  if (!deleted) return { ok: false, message: "That gift no longer exists." };

  if (deleted.imagePublicId) {
    await deleteImage(deleted.imagePublicId).catch(() => undefined);
  }

  revalidate(weddingId);

  return { ok: true };
}

export async function moveGiftItemAction(
  weddingId: string,
  itemId: string,
  direction: "up" | "down",
): Promise<SimpleResult> {
  const user = await requireUser(`/dashboard/weddings/${weddingId}/wishlist`);
  await requireOwnedWedding(weddingId, user.id);

  await moveGiftItem(weddingId, itemId, direction);
  revalidate(weddingId);

  return { ok: true };
}

