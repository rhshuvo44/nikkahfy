/**
 * Creates (or promotes) the single SUPER_ADMIN account described in spec §17.
 *
 * There is no public "become admin" flow — this script is the only way in.
 * Credentials come from ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME in `.env.local`.
 *
 *   npm run seed:admin
 */
import process from "node:process";

import { auth } from "@/lib/auth/config";
import { connectMongoose, disconnectMongoose } from "@/lib/db/mongo";
import { disconnectRawClient, getRawDb } from "@/lib/db/mongo";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Nikkahfy Admin";

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env.local before running this script.",
    );
  }

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  }

  await connectMongoose();
  const db = getRawDb();
  const users = db.collection("user");

  const existing = await users.findOne({ email });

  if (existing) {
    await users.updateOne(
      { email },
      {
        $set: {
          role: "SUPER_ADMIN",
          disabled: false,
          name,
          updatedAt: new Date(),
        },
      },
    );

    console.log(`Promoted existing user ${email} to SUPER_ADMIN.`);
  } else {
    await auth.api.signUpEmail({ body: { email, password, name } });

    await users.updateOne({ email }, { $set: { role: "SUPER_ADMIN" } });

    console.log(`Created SUPER_ADMIN user ${email}.`);
  }

  const saved = await users.findOne(
    { email },
    { projection: { _id: 1, email: 1, name: 1, role: 1, disabled: 1 } },
  );

  console.log("Result:", saved);
}

main()
  .then(async () => {
    await disconnectMongoose();
    await disconnectRawClient();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await disconnectMongoose().catch(() => {});
    await disconnectRawClient().catch(() => {});
    process.exit(1);
  });
