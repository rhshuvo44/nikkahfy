/**
 * Verifies the Session 2 guarantees against a real MongoDB.
 *
 *   npm run verify:weddings
 *
 * Focuses on the two things that are easy to get wrong and impossible to see
 * from the UI: the unique+sparse slug index, and the ownership boundary in
 * `@/lib/data/weddings`.
 */
import process from "node:process";

import { auth } from "@/lib/auth/config";
import {
  createWedding,
  deleteWeddingForUser,
  findWeddingForUser,
  listWeddingsForUser,
  updateWeddingForUser,
} from "@/lib/data/weddings";
import {
  connectMongoose,
  connectRawClient,
  disconnectMongoose,
  disconnectRawClient,
} from "@/lib/mongodb";
import { WeddingModel } from "@/lib/models/wedding";
import { deriveWeddingDateShort, weddingFormDefaults } from "@/lib/validation/wedding";

const PASSWORD = "Verify-Wedding-Pass1!";
const OWNER_EMAIL = "wed-owner@nikkahfy.test";
const INTRUDER_EMAIL = "wed-intruder@nikkahfy.test";

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

function form(overrides: Partial<typeof weddingFormDefaults> = {}) {
  return { ...weddingFormDefaults, ...overrides };
}

async function reset() {
  await connectMongoose();
  const db = await connectRawClient();
  await db.collection("wedding").deleteMany({});
  await db.collection("user").deleteMany({});
  await db.collection("account").deleteMany({});
  await db.collection("session").deleteMany({});
}

async function ensureUser(email: string) {
  try {
    const result = await auth.api.signUpEmail({
      body: { email, password: PASSWORD, name: email.split("@")[0] },
      headers: new Headers(),
    });
    return result.user.id;
  } catch {
    const user = await auth.api.signInEmail({
      body: { email, password: PASSWORD },
      headers: new Headers(),
    });
    return user.user.id;
  }
}

async function main() {
  await reset();

  const ownerId = await ensureUser(OWNER_EMAIL);
  const intruderId = await ensureUser(INTRUDER_EMAIL);
  section("Setup");
  check("two distinct users exist", ownerId !== intruderId, { ownerId, intruderId });

  section("1. Create a draft");
  const created = await createWedding(ownerId, form({ title: "Rakib & Nusrat" }));
  check("draft created", created !== null);
  check("status defaults to draft", created?.status === "draft", created?.status);
  check("slug is absent, not null", created !== null && !("slug" in created), created?.slug);
  check("userId matches the session user", created?.userId?.toString() === ownerId, {
    stored: created?.userId?.toString(),
    ownerId,
  });
  check("publishedAt is unset", created?.publishedAt === null || created?.publishedAt === undefined, created?.publishedAt);

  const weddingId = created!._id.toString();

  section("2. Unique + sparse slug index");
  // The whole point of `sparse`: many drafts with no slug must coexist.
  const extras = [];
  for (let i = 0; i < 3; i += 1) {
    extras.push(await createWedding(ownerId, form({ title: `Draft ${i}` })));
  }
  check("4 slug-less drafts coexist", extras.every(Boolean) && created !== null);
  const slugless = await WeddingModel.countDocuments({ userId: created!.userId, slug: { $exists: false } });
  check("all 4 have no slug key", slugless === 4, slugless);

  await WeddingModel.updateOne({ _id: created!._id }, { $set: { slug: "rakib-nusrat" } });
  const collision = await WeddingModel.updateOne(
    { _id: extras[0]!._id },
    { $set: { slug: "rakib-nusrat" } },
  ).then(
    () => "no error",
    (error: { code?: number }) => `code ${error.code}`,
  );
  check("duplicate slug is rejected by the index", collision !== "no error", collision);
  const afterCollision = await WeddingModel.findById(extras[0]!._id).lean().exec();
  check("the rejected document kept no slug", !afterCollision?.slug, afterCollision?.slug);

  section("3. Ownership on read");
  check("owner can read their wedding", (await findWeddingForUser(weddingId, ownerId)) !== null);
  check(
    "a different user gets null",
    (await findWeddingForUser(weddingId, intruderId)) === null,
  );
  check("unknown id gets null", (await findWeddingForUser("6aba222a456f83b04fcf38ce", ownerId)) === null);
  let malformedThrew = false;
  try {
    await findWeddingForUser("not-an-object-id", ownerId);
  } catch {
    malformedThrew = true;
  }
  check("a malformed id returns null instead of throwing", !malformedThrew);

  section("4. Ownership on write");
  const hijack = await updateWeddingForUser(
    weddingId,
    intruderId,
    form({ title: "Hijacked" }),
  );
  check("intruder update returns null", hijack === null);
  const untouched = await findWeddingForUser(weddingId, ownerId);
  check("document is unchanged after the hijack", untouched?.title === "Rakib & Nusrat", untouched?.title);

  section("5. Owner update persists");
  const updated = await updateWeddingForUser(
    weddingId,
    ownerId,
    form({
      title: "Rakib & Nusrat",
      groomName: "Rakib",
      brideName: "Nusrat",
      weddingDate: "2025-10-24",
      weddingTime: "6:30 PM",
      venueName: "The Rose Garden",
      musicType: "youtube",
      musicUrl: "https://www.youtube.com/watch?v=abc",
    }),
  );
  check("update returned the new state", updated?.groomName === "Rakib", updated?.groomName);
  check("weddingTime stored", updated?.weddingTime === "6:30 PM", updated?.weddingTime);
  check("musicType stored", updated?.musicType === "youtube", updated?.musicType);
  check(
    "weddingDateShort derived from the date",
    updated?.weddingDateShort === "Friday • 10.24.25",
    updated?.weddingDateShort,
  );
  check(
    "weddingDate stored as UTC midnight",
    updated?.weddingDate?.toISOString() === "2025-10-24T00:00:00.000Z",
    updated?.weddingDate?.toISOString(),
  );

  section("6. Short-date derivation is timezone safe");
  check("maps to the correct weekday", deriveWeddingDateShort("2025-10-24") === "Friday • 10.24.25", deriveWeddingDateShort("2025-10-24"));
  check("handles a leap day", deriveWeddingDateShort("2024-02-29") === "Thursday • 02.29.24", deriveWeddingDateShort("2024-02-29"));
  check("handles a January date", deriveWeddingDateShort("2026-01-05") === "Monday • 01.05.26", deriveWeddingDateShort("2026-01-05"));
  check("empty input yields empty string", deriveWeddingDateShort("") === "" && deriveWeddingDateShort(null) === "");
  check("a Date object is read in UTC", deriveWeddingDateShort(new Date("2025-10-24T00:00:00.000Z")) === "Friday • 10.24.25");

  section("7. Listing is scoped per user");
  const ownerList = await listWeddingsForUser(ownerId);
  const intruderList = await listWeddingsForUser(intruderId);
  check("owner sees all 4 of their weddings", ownerList.length === 4, ownerList.length);
  check("intruder sees none of them", intruderList.length === 0, intruderList.length);
  check("a malformed user id lists nothing", (await listWeddingsForUser("nope")).length === 0);

  section("8. Delete is owner-scoped");
  check("intruder cannot delete", (await deleteWeddingForUser(weddingId, intruderId)) === false);
  check("document still there", (await findWeddingForUser(weddingId, ownerId)) !== null);
  check("owner can delete", (await deleteWeddingForUser(weddingId, ownerId)) === true);
  check("document is gone", (await findWeddingForUser(weddingId, ownerId)) === null);
}

main()
  .then(async () => {
    await reset();
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
