import { Schema, model, models, type Model, type Types } from "mongoose";

export const MUSIC_TYPES = ["upload", "youtube"] as const;
export const WEDDING_STATUSES = ["draft", "published", "archived"] as const;

export type MusicType = (typeof MUSIC_TYPES)[number];
export type WeddingStatus = (typeof WEDDING_STATUSES)[number];

/**
 * A single invitation, owned by exactly one user.
 *
 * `userId` is an ObjectId because Better Auth stores the user `_id` that way.
 * The session exposes it as a *string*, so every caller must go through
 * `toObjectId()` in `@/lib/data/weddings` — a bare `userId: session.user.id`
 * silently matches nothing.
 *
 * `slug` is unique + sparse: drafts leave the key absent so MongoDB skips them
 * in the index, which is what allows many drafts to coexist. Never write
 * `slug: null` — null *is* indexed, and a single null would collide with the
 * next draft. A slug is assigned at publish time (a later session).
 */
const weddingSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    slug: { type: String, unique: true, sparse: true, trim: true, lowercase: true },

    title: { type: String, required: true, trim: true },

    groomName: { type: String, trim: true, default: "" },
    groomFullName: { type: String, trim: true, default: "" },
    brideName: { type: String, trim: true, default: "" },
    brideFullName: { type: String, trim: true, default: "" },

    // e.g. "Friday • 10.24.25". Derived from `weddingDate` on every write so the
    // two can never drift; not user-editable.
    weddingDateShort: { type: String, trim: true, default: "" },

    weddingDate: { type: Date },
    // Kept as a string because invitations use natural language ("6:30 PM",
    // "Sunset") far more often than a 24-hour time.
    weddingTime: { type: String, trim: true, default: "" },

    dressCode: { type: String, trim: true, default: "" },

    venueName: { type: String, trim: true, default: "" },
    venueAddress: { type: String, trim: true, default: "" },
    mapUrl: { type: String, trim: true, default: "" },
    wazeUrl: { type: String, trim: true, default: "" },

    phone: { type: String, trim: true, default: "" },

    musicType: { type: String, enum: MUSIC_TYPES, default: "upload" },
    musicUrl: { type: String, trim: true, default: "" },

    status: { type: String, enum: WEDDING_STATUSES, default: "draft", index: true },
    publishedAt: { type: Date },
  },
  {
    collection: "wedding",
    timestamps: true,
    versionKey: false,
  },
);

export type Wedding = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  slug?: string | null;
  title: string;
  groomName: string;
  groomFullName: string;
  brideName: string;
  brideFullName: string;
  weddingDateShort: string;
  weddingDate?: Date | null;
  weddingTime: string;
  dressCode: string;
  venueName: string;
  venueAddress: string;
  mapUrl: string;
  wazeUrl: string;
  phone: string;
  musicType: MusicType;
  musicUrl: string;
  status: WeddingStatus;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const WeddingModel =
  (models.Wedding as Model<Wedding> | undefined) ??
  model<Wedding>("Wedding", weddingSchema);
