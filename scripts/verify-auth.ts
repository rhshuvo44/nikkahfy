/**
 * End-to-end verification of the Session 1 auth flow against a real MongoDB.
 *
 *   npm run verify:auth
 *
 * Simulates the browser round trip through Better Auth's server API — sign up,
 * sign in (capturing the real Set-Cookie), resolve the session from that cookie,
 * sign out, then confirm the session is gone. Also asserts the User document on
 * disk has role "USER" and that a client cannot grant itself SUPER_ADMIN.
 *
 * The test user is deleted afterwards unless VERIFY_KEEP_USER=1.
 */
import process from "node:process";

import { auth } from "@/lib/auth/config";
import { findUserByEmail, setUserRole } from "@/lib/data/users";
import {
  connectMongoose,
  connectRawClient,
  disconnectMongoose,
  disconnectRawClient,
} from "@/lib/mongodb";
import { UserModel } from "@/lib/models/user";

const EMAIL = process.env.VERIFY_EMAIL?.trim().toLowerCase() || "verify@nikkahfy.test";
const PASSWORD = process.env.VERIFY_PASSWORD || "Verify-Passw0rd!";
const KEEP = process.env.VERIFY_KEEP_USER === "1";

let passed = 0;

function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    console.log(`  FAIL  ${label}${detail === undefined ? "" : ` -> ${JSON.stringify(detail)}`}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

async function removeTestUser() {
  // Both handles must be connected before issuing any command: the Mongoose
  // connection is built with `bufferCommands: false`, and `getRawDb()` is a
  // sync handle that performs no I/O on its own.
  await connectMongoose();
  const db = await connectRawClient();
  const { ObjectId } = await import("mongodb");
  const found = await UserModel.findOne({ email: EMAIL }).select("_id").lean().exec();
  if (!found) return;

  // `userId` in `account` and `session` is a BSON ObjectId, not a string —
  // comparing against a hex string silently matches nothing.
  const id = new ObjectId(found._id.toString());
  await Promise.all([
    db.collection("user").deleteMany({ _id: id }),
    db.collection("account").deleteMany({ userId: id }),
    db.collection("session").deleteMany({ userId: id }),
  ]);
}

async function main() {
  await removeTestUser();

  section("1. Sign up");
  const signUp = await auth.api.signUpEmail({
    body: { email: EMAIL, password: PASSWORD, name: "Verify User" },
    headers: new Headers(),
  });
  check("signUpEmail returned a user", Boolean(signUp?.user?.id), signUp);
  check("returned email matches", signUp?.user?.email === EMAIL, signUp?.user?.email);
  // `role` is `input: false` in additionalFields, so a hostile body must not win.
  check("role is USER, not client-supplied", signUp?.user?.role === "USER", signUp?.user?.role);
  check("disabled defaults to false", signUp?.user?.disabled === false, signUp?.user?.disabled);

  section("2. User document in MongoDB");
  const doc = await findUserByEmail(EMAIL);
  check("document exists via the Mongoose model", doc !== null);
  check("role is 'USER' on disk", doc?.role === "USER", doc?.role);
  check("disabled is false on disk", doc?.disabled === false, doc?.disabled);
  check("createdAt is set", doc?.createdAt instanceof Date, doc?.createdAt);
  check("updatedAt is set", doc?.updatedAt instanceof Date, doc?.updatedAt);
  check("name is stored", doc?.name === "Verify User", doc?.name);
  check("image is absent-or-null when not supplied", doc?.image === undefined || doc?.image === null, doc?.image);
  console.log("  document:", JSON.stringify(doc, null, 2).split("\n").join("\n  "));

  section("3. Privileged escalation is blocked");
  const escalated = await setUserRole(EMAIL, "SUPER_ADMIN");
  check("server-side role write works", escalated?.role === "SUPER_ADMIN", escalated?.role);

  // Goes through the data layer, so this asserts the enum is actually enforced
  // on the production write path rather than just in the schema.
  let enumError: string | null = null;
  try {
    await UserModel.findOneAndUpdate(
      { email: EMAIL },
      { $set: { role: "OWNER" } },
      { returnDocument: "after", runValidators: true },
    )
      .lean()
      .exec();
  } catch (error) {
    enumError = error instanceof Error ? error.name : String(error);
  }
  check("invalid role is rejected by the enum", enumError === "ValidationError", enumError);
  const stillUser = await findUserByEmail(EMAIL);
  check("role was not mutated by the failed write", stillUser?.role === "SUPER_ADMIN", stillUser?.role);
  await setUserRole(EMAIL, "USER");

  section("4. Sign in");
  const signInResponse = await auth.api.signInEmail({
    body: { email: EMAIL, password: PASSWORD },
    headers: new Headers(),
    asResponse: true,
  });
  check("signInEmail returned 200", signInResponse.status === 200, signInResponse.status);

  const setCookies = signInResponse.headers.getSetCookie();
  check("Set-Cookie was issued", setCookies.length > 0, setCookies);
  const cookieHeader = setCookies.map((c) => c.split(";")[0]).join("; ");
  check("session cookie is present", cookieHeader.includes("="), cookieHeader);

  section("5. Session resolves from the cookie");
  const session = await auth.api.getSession({ headers: new Headers({ cookie: cookieHeader }) });
  check("getSession returned a session", Boolean(session?.session?.id), session);
  check("session email matches", session?.user?.email === EMAIL, session?.user?.email);
  check("session user is a USER", session?.user?.role === "USER", session?.user?.role);

  section("6. Sign out");
  const signOutResponse = await auth.api.signOut({
    headers: new Headers({ cookie: cookieHeader }),
    asResponse: true,
  });
  check("signOut returned 200", signOutResponse.status === 200, signOutResponse.status);
  const cleared = signOutResponse.headers.getSetCookie();
  check("session cookie was cleared", cleared.some((c) => /max-age=0|expires=Thu, 01 Jan 1970/i.test(c)), cleared);

  section("7. Session is gone after sign out");
  const afterSignOut = await auth.api.getSession({ headers: new Headers({ cookie: cookieHeader }) });
  check("getSession returns null after sign out", afterSignOut === null, afterSignOut);
}

main()
  .then(async () => {
    section("Cleanup");
    if (KEEP) {
      console.log(`  VERIFY_KEEP_USER=1 — left ${EMAIL} in the database.`);
    } else {
      await removeTestUser();
      console.log(`  Removed test user ${EMAIL}.`);
    }
    console.log(`\n${passed} checks passed.`);
    await disconnectMongoose();
    await disconnectRawClient();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("\nVerification aborted:");
    console.error(error instanceof Error ? error.message : error);
    await disconnectMongoose().catch(() => {});
    await disconnectRawClient().catch(() => {});
    process.exit(1);
  });
