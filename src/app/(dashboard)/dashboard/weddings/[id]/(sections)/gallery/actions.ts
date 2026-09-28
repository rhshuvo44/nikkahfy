"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { deleteImage, isCloudinaryConfigured, uploadImage } from "@/lib/cloudinary";
import {
  createGalleryImage,
  deleteGalleryImage,
  moveGalleryImage,
  setBlackAndWhitePair,
  updateGalleryAlt,
} from "@/lib/data/gallery";
import { requireOwnedWedding } from "@/lib/wedding-access";
import { galleryImageSchema } from "@/lib/validation/wedding-children";

/**
 * Gallery mutations.
 *
 * The upload action takes a `FormData` rather than a values object, because a
 * `File` cannot survive the JSON serialisation `useActionState` uses. The text
 * field is still parsed with the same Zod schema the form binds to.
 */

export type SimpleResult = { ok: boolean; message?: string };

function revalidate(weddingId: string) {
  revalidatePath(`/dashboard/weddings/${weddingId}/gallery`);
}

export async function uploadGalleryImageAction(
  weddingId: string,
  formData: FormData,
): Promise<SimpleResult> {
  const user = await requireUser(`/dashboard/weddings/${weddingId}/gallery`);
  await requireOwnedWedding(weddingId, user.id);

  // Checked before the file so an unconfigured account gets the useful message
  // rather than a Cloudinary SDK error about a missing cloud name.
  if (!isCloudinaryConfigured()) {
    return {
      ok: false,
      message: "Image uploads are not configured. Add the CLOUDINARY_* keys to .env.local.",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose an image to upload." };
  }

  const parsed = galleryImageSchema.safeParse({ alt: String(formData.get("alt") ?? "") });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the alt text." };
  }

  let publicId: string | null = null;

  try {
    const uploaded = await uploadImage(file, "nikkahfy/gallery");
    publicId = uploaded.publicId;

    await createGalleryImage(weddingId, {
      url: uploaded.url,
      publicId: uploaded.publicId,
      alt: parsed.data.alt,
    });
  } catch (error) {
    // The upload succeeded but the row did not, so the asset would be orphaned
    // with nothing pointing at it. Remove it before reporting the failure.
    if (publicId) {
      await deleteImage(publicId).catch(() => undefined);
    }

    return {
      ok: false,
      message: error instanceof Error ? error.message : "That upload failed. Try again.",
    };
  }

  revalidate(weddingId);

  return { ok: true };
}

export async function updateGalleryAltAction(
  weddingId: string,
  imageId: string,
  alt: string,
): Promise<SimpleResult> {
  const user = await requireUser(`/dashboard/weddings/${weddingId}/gallery`);
  await requireOwnedWedding(weddingId, user.id);

  const parsed = galleryImageSchema.safeParse({ alt });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the alt text." };
  }

  const updated = await updateGalleryAlt(weddingId, imageId, parsed.data.alt);
  if (!updated) return { ok: false, message: "That image no longer exists." };

  revalidate(weddingId);

  return { ok: true };
}

export async function deleteGalleryImageAction(
  weddingId: string,
  imageId: string,
): Promise<SimpleResult> {
  const user = await requireUser(`/dashboard/weddings/${weddingId}/gallery`);
  await requireOwnedWedding(weddingId, user.id);

  const deleted = await deleteGalleryImage(weddingId, imageId);
  if (!deleted) return { ok: false, message: "That image no longer exists." };

  // The document is already gone and the user has their answer; a leftover
  // asset is recoverable by hand, a failed delete that looks like it worked is
  // not. So this is best effort and deliberately does not change the result.
  if (deleted.publicId) {
    await deleteImage(deleted.publicId).catch(() => undefined);
  }

  revalidate(weddingId);

  return { ok: true };
}

export async function moveGalleryImageAction(
  weddingId: string,
  imageId: string,
  direction: "up" | "down",
): Promise<SimpleResult> {
  const user = await requireUser(`/dashboard/weddings/${weddingId}/gallery`);
  await requireOwnedWedding(weddingId, user.id);

  await moveGalleryImage(weddingId, imageId, direction);
  revalidate(weddingId);

  return { ok: true };
}

/**
 * Mark or unmark an image as one of the two black-and-white first-row images.
 *
 * The cap is enforced in the data layer, not here — see `setBlackAndWhitePair`.
 * This action only relays the rule's outcome.
 */
export async function setBlackAndWhitePairAction(
  weddingId: string,
  imageId: string,
  isMember: boolean,
): Promise<SimpleResult> {
  const user = await requireUser(`/dashboard/weddings/${weddingId}/gallery`);
  await requireOwnedWedding(weddingId, user.id);

  const result = await setBlackAndWhitePair(weddingId, imageId, isMember);
  if (!result.ok) return { ok: false, message: result.reason };

  revalidate(weddingId);

  return { ok: true };
}
