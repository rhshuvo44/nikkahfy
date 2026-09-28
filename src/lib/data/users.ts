import "server-only";

import { getMongoose } from "@/lib/mongodb";
import { UserModel, type User } from "@/lib/models/user";
import type { UserRole } from "@/lib/roles";

/**
 * Data layer for users.
 *
 * Every read connects first because the Mongoose connection is created with
 * `bufferCommands: false` — a query issued before the connection is up throws
 * instead of silently queueing.
 *
 * Note: Mongoose's schema-level `runValidators` option is NOT applied to update
 * operations (verified against mongoose 9), so every write here goes through
 * `updateUser`, which sets the flag explicitly. Without it the `role` enum is
 * skipped and an invalid role reaches the database.
 */

type UserUpdate = Partial<Pick<User, "name" | "image" | "role" | "disabled">>;

async function updateUser(email: string, update: UserUpdate): Promise<User | null> {
  await getMongoose();

  return UserModel.findOneAndUpdate(
    { email: email.trim().toLowerCase() },
    { $set: update },
    { returnDocument: "after", runValidators: true },
  )
    .lean()
    .exec();
}

export async function findUserByEmail(email: string): Promise<User | null> {
  await getMongoose();

  return UserModel.findOne({ email: email.trim().toLowerCase() }).lean().exec();
}

export async function findUserById(id: string): Promise<User | null> {
  await getMongoose();

  return UserModel.findById(id).lean().exec();
}

export async function setUserRole(email: string, role: UserRole): Promise<User | null> {
  return updateUser(email, { role });
}

export async function setUserDisabled(email: string, disabled: boolean): Promise<User | null> {
  return updateUser(email, { disabled });
}
