import "server-only";

import { createChild, deleteChild, listChildren, moveChild, updateChild } from "@/lib/data/wedding-children";
import { toObjectId } from "@/lib/data/object-id";
import { GalleryImageModel, type GalleryImage } from "@/lib/models/gallery-image";

/** Gallery images, plus the "which two open the page" rule. */
export function listGalleryImages(weddingId: string): Promise<GalleryImage[]> {
  return listChildren(GalleryImageModel, weddingId);
}

export function createGalleryImage(
  weddingId: string,
  values: Pick<GalleryImage, "url" | "publicId" | "alt">,
): Promise<GalleryImage> {
  // Never inherits isBlackAndWhitePair: a fresh upload is a colour tile.
  return createChild(GalleryImageModel, weddingId, {
    ...values,
    isBlackAndWhitePair: false,
  });
}

export function updateGalleryAlt(
  weddingId: string,
  imageId: string,
  alt: string,
): Promise<GalleryImage | null> {
  return updateChild(GalleryImageModel, weddingId, imageId, { alt });
}

/** Returns the removed document so the caller can clean up the Cloudinary asset. */
export function deleteGalleryImage(
  weddingId: string,
  imageId: string,
): Promise<GalleryImage | null> {
  return deleteChild(GalleryImageModel, weddingId, imageId);
}

export function moveGalleryImage(
  weddingId: string,
  imageId: string,
  direction: "up" | "down",
): Promise<boolean> {
  return moveChild(GalleryImageModel, weddingId, imageId, direction);
}

export const BLACK_AND_WHITE_PAIR_SIZE = 2;

export async function countBlackAndWhitePair(weddingId: string): Promise<number> {
  const owner = toObjectId(weddingId);
  if (!owner) return 0;

  return GalleryImageModel.countDocuments({ weddingId: owner, isBlackAndWhitePair: true }).exec();
}

export type PairResult = { ok: true } | { ok: false; reason: string };

/**
 * Add or remove an image from the black-and-white first-row pair.
 *
 * The cap is two and it lives here rather than in the schema, because Mongoose
 * cannot express a conditional uniqueness constraint. `updateChild` alone would
 * let a third image slip in via a hand-crafted POST, so the count is checked
 * here, inside the same data layer, and the *form* disables the remaining
 * checkboxes once two are picked.
 *
 * Swapping is done by the user in two steps (turn one off, then the other on)
 * rather than by silently evicting the oldest — losing a deliberate choice
 * without being asked is worse than making the user click twice.
 */
export async function setBlackAndWhitePair(
  weddingId: string,
  imageId: string,
  isMember: boolean,
): Promise<PairResult> {
  const owner = toObjectId(weddingId);
  const id = toObjectId(imageId);
  if (!owner || !id) return { ok: false, reason: "Image not found." };

  const image = await GalleryImageModel.findOne({ _id: id, weddingId: owner }).lean().exec();
  if (!image) return { ok: false, reason: "Image not found." };

  if (image.isBlackAndWhitePair === isMember) return { ok: true };

  if (isMember) {
    const current = await countBlackAndWhitePair(weddingId);
    if (current >= BLACK_AND_WHITE_PAIR_SIZE) {
      return {
        ok: false,
        reason: "Only two images can form the black-and-white pair. Unselect one first.",
      };
    }
  }

  const updated = await GalleryImageModel.findOneAndUpdate(
    { _id: id, weddingId: owner },
    { $set: { isBlackAndWhitePair: isMember } },
    { returnDocument: "after", runValidators: true },
  )
    .lean()
    .exec();

  return updated ? { ok: true } : { ok: false, reason: "Image not found." };
}
