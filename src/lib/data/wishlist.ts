import "server-only";

import { createChild, deleteChild, listChildren, moveChild, updateChild } from "@/lib/data/wedding-children";
import { toObjectId } from "@/lib/data/object-id";
import { GiftItemModel, type GiftItem } from "@/lib/models/gift-item";
import type { GiftItemValues } from "@/lib/validation/wedding-children";

/**
 * Gift items. An empty wishlist is a valid state, so nothing here requires a
 * row to exist.
 */
export function listGiftItems(weddingId: string): Promise<GiftItem[]> {
  return listChildren(GiftItemModel, weddingId);
}

export function createGiftItem(
  weddingId: string,
  values: GiftItemValues & { imageUrl?: string; imagePublicId?: string },
): Promise<GiftItem> {
  return createChild(GiftItemModel, weddingId, {
    ...values,
    imageUrl: values.imageUrl ?? "",
    imagePublicId: values.imagePublicId ?? "",
  });
}

export function updateGiftItem(
  weddingId: string,
  contactId: string,
  values: GiftItemValues & { imageUrl?: string; imagePublicId?: string },
): Promise<GiftItem | null> {
  // An omitted image field means "keep the current image", so the form always
  // sends both and the model never ends up with a url it cannot resolve.
  return updateChild(GiftItemModel, weddingId, contactId, values);
}

export function deleteGiftItem(weddingId: string, itemId: string): Promise<GiftItem | null> {
  return deleteChild(GiftItemModel, weddingId, itemId);
}

/** Reads one item, scoped to its wedding. Used to capture the current image. */
export function findGiftItem(weddingId: string, itemId: string): Promise<GiftItem | null> {
  const owner = toObjectId(weddingId);
  const id = toObjectId(itemId);
  if (!owner || !id) return Promise.resolve(null);

  return GiftItemModel.findOne({ _id: id, weddingId: owner }).lean().exec() as Promise<GiftItem | null>;
}

export function moveGiftItem(
  weddingId: string,
  itemId: string,
  direction: "up" | "down",
): Promise<boolean> {
  return moveChild(GiftItemModel, weddingId, itemId, direction);
}
