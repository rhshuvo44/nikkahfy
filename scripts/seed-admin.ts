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
import { findUserByEmail, setUserDisabled, setUserRole } from "@/lib/data/users";
import { disconnectMongoose } from "@/lib/mongodb";

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

  const existing = await findUserByEmail(email);

  if (existing) {
    await setUserRole(email, "SUPER_ADMIN");
    await setUserDisabled(email, false);
    console.log(`Promoted existing user ${email} to SUPER_ADMIN.`);
  } else {
    // Sign-up goes through Better Auth so password hashing and the account
    // collection are written exactly as they would be for a real user.
    await auth.api.signUpEmail({ body: { email, password, name } });
    await setUserRole(email, "SUPER_ADMIN");
    console.log(`Created SUPER_ADMIN user ${email}.`);
  }

  console.log("Result:", await findUserByEmail(email));
}

main()
  .then(async () => {
    await disconnectMongoose();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await disconnectMongoose().catch(() => {});
    process.exit(1);
  });
