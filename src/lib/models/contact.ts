import { Schema, model, models, type Model, type Types } from "mongoose";

/** A person guests can call — "Father of Bride", "Coordinator", etc. */
const contactSchema = new Schema(
  {
    weddingId: { type: Schema.Types.ObjectId, ref: "Wedding", required: true, index: true },

    name: { type: String, required: true, trim: true },
    role: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },

    sortOrder: { type: Number, required: true, default: 0, index: true },
  },
  {
    collection: "contact",
    timestamps: true,
    versionKey: false,
  },
);

export type Contact = {
  _id: Types.ObjectId;
  weddingId: Types.ObjectId;
  name: string;
  role: string;
  phone: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export const ContactModel =
  (models.Contact as Model<Contact> | undefined) ?? model<Contact>("Contact", contactSchema);
