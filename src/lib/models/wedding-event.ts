import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * A ceremony on the wedding timeline — "Engagement", "Holud", "Wedding",
 * "Reception" — with its own parents, a joining line, and a schedule.
 *
 * Ownership is *never* checked here. A caller must have already resolved the
 * parent `Wedding` through `requireOwnedWedding`; these documents are then only
 * ever addressed by `weddingId`.
 */
const scheduleEntrySchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    time: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const weddingEventSchema = new Schema(
  {
    weddingId: { type: Schema.Types.ObjectId, ref: "Wedding", required: true, index: true },

    title: { type: String, required: true, trim: true },
    sortOrder: { type: Number, required: true, default: 0, index: true },

    gratitudeLine: { type: String, trim: true, default: "" },
    // "With Joy & Gratitude to Almighty Allah"
    joiner: { type: String, trim: true, default: "together with" },

    sideAParents: { type: [String], default: [] },
    sideBParents: { type: [String], default: [] },

    schedule: { type: [scheduleEntrySchema], default: [] },
  },
  {
    collection: "weddingevent",
    timestamps: true,
    versionKey: false,
  },
);

export type WeddingEvent = {
  _id: Types.ObjectId;
  weddingId: Types.ObjectId;
  title: string;
  sortOrder: number;
  gratitudeLine: string;
  joiner: string;
  sideAParents: string[];
  sideBParents: string[];
  schedule: { title: string; time: string }[];
  createdAt: Date;
  updatedAt: Date;
};

export const WeddingEventModel =
  (models.WeddingEvent as Model<WeddingEvent> | undefined) ??
  model<WeddingEvent>("WeddingEvent", weddingEventSchema);
