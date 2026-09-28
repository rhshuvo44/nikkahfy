import { Schema, model, models, type Model, type Types } from "mongoose";

import { DEFAULT_USER_ROLE, USER_ROLES, type UserRole } from "@/lib/roles";

/**
 * The `user` collection.
 *
 * Better Auth's MongoDB adapter owns this collection — it creates and writes the
 * rows during sign-up, sign-in and session refresh. This model is a typed view
 * onto those same documents so the rest of the app can query them with Mongoose
 * instead of dropping to the raw driver.
 *
 * Consequence: the field names below must stay in lockstep with
 * `user.additionalFields` in `@/lib/auth/config`. Adding a field there means
 * adding it here, and vice versa.
 */
const userSchema = new Schema(
  {
    name: { type: String, required: true },
    // `unique` creates a real index in MongoDB. Better Auth only checks for an
    // existing email in application code, which leaves a window where two
    // concurrent sign-ups for the same address both succeed.
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    // Written by Better Auth, not by us — declared so documents round-trip
    // through Mongoose without the field being dropped as unknown.
    emailVerified: { type: Boolean, default: false },
    image: { type: String, default: null },
  role: {
    type: String,
    enum: USER_ROLES,
    default: DEFAULT_USER_ROLE,
    index: true,
  },
  disabled: { type: Boolean, default: false },
},

  {
    collection: "user",
    timestamps: true,
    versionKey: false,
  },
);

export type User = {
  _id: Types.ObjectId;
  name: string;
  email: string;
  emailVerified: boolean;
  // Better Auth only writes `image` when one was supplied, so the key is absent
  // on documents it creates — this is not merely "null".
  image?: string | null;
  role: UserRole;
  disabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// `models.User` survives dev hot reload; re-registering would throw OverwriteModelError.
export const UserModel = (models.User as Model<User> | undefined) ?? model<User>("User", userSchema);
