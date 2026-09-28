import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * A gift item. The wishlist is allowed to be empty — that is a valid state, not
 * a half-finished one, so there is no "must have at least one" rule anywhere.
 *
 * `link` is deliberately a string rather than a URL field: it holds either an
 * external store URL or bank/e-wallet text like "bKash: 01700-000000".
 *
 * The optional `imagePublicId` is not in the session prompt but is required to
 * clean up the Cloudinary asset when the item is deleted; without it the images
 * would leak on every delete.
 */
const giftItemSchema = new Schema(
  {
    weddingId: { type: Schema.Types.ObjectId, ref: "Wedding", required: true, index: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    link: { type: String, trim: true, default: "" },
    imageUrl: { type: String, trim: true, default: "" },
    imagePublicId: { type: String, trim: true, default: "" },

    sortOrder: { type: Number, required: true, default: 0, index: true },
  },
  {
    collection: "giftitem",
    timestamps: true,
    versionKey: false,
  },
);

export type GiftItem = {
  _id: Types.ObjectId;
  weddingId: Types.ObjectId;
  title: string;
  description: string;
  link: string;
  imageUrl: string;
  imagePublicId: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export const GiftItemModel =
  (models.GiftItem as Model<GiftItem> | undefined) ?? model<GiftItem>("GiftItem", giftItemSchema);
