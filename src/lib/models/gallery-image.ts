import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * A gallery image. `publicId` is kept so the asset can be removed from
 * Cloudinary when the row is deleted, rather than only unlinking the document.
 *
 * `isBlackAndWhitePair` marks membership of the first-row pair. The cap of two
 * is enforced in the data layer, not here — Mongoose has no concept of a
 * conditional uniqueness constraint.
 */
const galleryImageSchema = new Schema(
  {
    weddingId: { type: Schema.Types.ObjectId, ref: "Wedding", required: true, index: true },

    url: { type: String, required: true },
    publicId: { type: String, required: true },
    alt: { type: String, trim: true, default: "" },

    sortOrder: { type: Number, required: true, default: 0, index: true },
    isBlackAndWhitePair: { type: Boolean, default: false },
  },
  {
    collection: "galleryimage",
    timestamps: true,
    versionKey: false,
  },
);

export type GalleryImage = {
  _id: Types.ObjectId;
  weddingId: Types.ObjectId;
  url: string;
  publicId: string;
  alt: string;
  sortOrder: number;
  isBlackAndWhitePair: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const GalleryImageModel =
  (models.GalleryImage as Model<GalleryImage> | undefined) ??
  model<GalleryImage>("GalleryImage", galleryImageSchema);
