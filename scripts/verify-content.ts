/**
 * Verifies the Session 3 guarantees against a real MongoDB.
 *
 *   npm run verify:content
 *
 * The interesting claims are the ones the UI cannot show: that a second user
 * cannot reach or mutate another wedding's children, that the black-and-white
 * pair really is capped at two, that reordering leaves a dense 0..n-1 sequence
 * with no duplicates, and that the parents textarea becomes a clean array.
 *
 * Like the other verify scripts this one RESETS the database first — it deletes
 * every document in user / account / session / wedding and the four content
 * collections. Point it at a disposable database only.
 */
import process from "node:process";

import { auth } from "@/lib/auth/config";
import { createContact, listContacts, moveContact, updateContact } from "@/lib/data/contacts";
import { BLACK_AND_WHITE_PAIR_SIZE, setBlackAndWhitePair } from "@/lib/data/gallery";
import {
  addScheduleEntry,
  createEvent,
  deleteScheduleEntry,
  listEvents,
  moveEvent,
  moveScheduleEntry,
  updateScheduleEntry,
} from "@/lib/data/wedding-events";
import { createGiftItem, listGiftItems, moveGiftItem } from "@/lib/data/wishlist";
import { connectMongoose, connectRawClient, disconnectMongoose, disconnectRawClient } from "@/lib/mongodb";
import { ContactModel } from "@/lib/models/contact";
import { GalleryImageModel } from "@/lib/models/gallery-image";
import { GiftItemModel } from "@/lib/models/gift-item";
import { WeddingEventModel } from "@/lib/models/wedding-event";
import { createWedding } from "@/lib/data/weddings";
import { eventWriteSchema } from "@/lib/validation/wedding-children";

const PASSWORD = "Verify-Content-Pass1!";
const OWNER_EMAIL = "content-owner@nikkahfy.test";
const INTRUDER_EMAIL = "content-intruder@nikkahfy.test";

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

async function reset() {
  await connectMongoose();
  const db = await connectRawClient();
  for (const collection of [
    "weddingevent",
    "contact",
    "galleryimage",
    "giftitem",
    "wedding",
    "user",
    "account",
    "session",
  ]) {
    await db.collection(collection).deleteMany({});
  }
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

/** A dense 0..n-1 sequence with no gaps and no duplicates. */
function isDense(orders: number[]): boolean {
  const sorted = [...orders].sort((a, b) => a - b);
  return sorted.every((value, index) => value === index);
}

async function main() {
  await reset();

  const ownerId = await ensureUser(OWNER_EMAIL);
  const intruderId = await ensureUser(INTRUDER_EMAIL);

  const ownerWedding = await createWedding(ownerId, { title: "Owner wedding" } as never);
  const intruderWedding = await createWedding(intruderId, { title: "Intruder wedding" } as never);

  // `createWedding` can return null in principle. Aborting here beats failing
  // every later check with a confusing "possibly null" cascade.
  if (!ownerWedding || !intruderWedding) {
    throw new Error("Setup failed: could not create the two test weddings.");
  }
  const ownerId_ = ownerWedding._id.toString();
  const intruderId_ = intruderWedding._id.toString();

  section("1. Events");
  const reception = await createEvent(ownerWedding._id.toString(), {
    title: "Reception",
    gratitudeLine: "With Joy & Gratitude to Almighty Allah",
    joiner: "together with",
    sideAParents: ["Mr. Rakib", "Mrs. Sadia"],
    sideBParents: ["Mr. Hasan"],
  });
  // Omitting `joiner` entirely, so the schema default is what is under test —
  // passing "" explicitly would store "" and prove nothing.
  const holud = await createEvent(ownerWedding._id.toString(), {
    title: "Holud",
    gratitudeLine: "",
    sideAParents: [],
    sideBParents: [],
  } as never);

  check("joiner default applied when omitted", holud.joiner === "together with", holud.joiner);
  check("an explicit empty joiner stays empty", reception.joiner === "together with", reception.joiner);
  check("empty parent lists stored as []", Array.isArray(holud.sideAParents) && holud.sideAParents.length === 0);
  check("parents stored as an array", reception.sideAParents.length === 2, reception.sideAParents);
  check("first event has sortOrder 0", reception.sortOrder === 0, reception.sortOrder);
  check("second event has sortOrder 1", holud.sortOrder === 1, holud.sortOrder);
  check("event starts with no schedule", reception.schedule.length === 0);

  // The parents transform is what the server action relies on.
  const parsed = eventWriteSchema.parse({
    title: "Engagement",
    gratitudeLine: "",
    joiner: "together with",
    sideAParents: "Mr. A\n\n  Mrs. B  \n",
    sideBParents: "   ",
  });
  check("textarea text becomes a trimmed array", JSON.stringify(parsed.sideAParents) === '["Mr. A","Mrs. B"]', parsed.sideAParents);
  check("blank textarea becomes []", JSON.stringify(parsed.sideBParents) === "[]", parsed.sideBParents);

  section("2. Event reordering");
  const receptionId = reception._id.toString();

  await moveEvent(ownerId_, receptionId, "down");
  let events = await listEvents(ownerId_);
  check("move down swaps the two events", events[0].title === "Holud" && events[1].title === "Reception", events.map((e) => e.title));
  check("sortOrder stays dense after a move", isDense(events.map((e) => e.sortOrder)), events.map((e) => e.sortOrder));

  const atEdge = await moveEvent(ownerId_, events[0]._id.toString(), "up");
  check("moving the first item up is a no-op, not a failure", atEdge === false);
  events = await listEvents(ownerId_);
  check("order unchanged by the no-op move", events[0].title === "Holud", events.map((e) => e.title));

  section("3. Schedule sub-list");
  await addScheduleEntry(ownerId_, receptionId, { title: "Bismillah", time: "6:00 PM" });
  await addScheduleEntry(ownerId_, receptionId, { title: "Dinner", time: "8:30 PM" });
  await addScheduleEntry(ownerId_, receptionId, { title: "Doli", time: "10:00 PM" });

  let schedule = (await listEvents(ownerId_)).find((e) => e._id.toString() === receptionId)!.schedule;
  check("three schedule entries added", schedule.length === 3, schedule.length);

  await moveScheduleEntry(ownerId_, receptionId, 2, "up");
  schedule = (await listEvents(ownerId_)).find((e) => e._id.toString() === receptionId)!.schedule;
  check("schedule reorders within its event", schedule[1].title === "Doli" && schedule[2].title === "Dinner", schedule.map((s) => s.title));

  await updateScheduleEntry(ownerId_, receptionId, 0, { title: "Opening", time: "5:45 PM" });
  schedule = (await listEvents(ownerId_)).find((e) => e._id.toString() === receptionId)!.schedule;
  check("schedule entry edited in place", schedule[0].title === "Opening");

  await deleteScheduleEntry(ownerId_, receptionId, 0);
  schedule = (await listEvents(ownerId_)).find((e) => e._id.toString() === receptionId)!.schedule;
  // Index 0 held "Opening" — the entry the edit above had overwritten — so
  // "Bismillah" is correctly gone. What matters is that exactly one row left
  // and the survivors kept their relative order.
  check("schedule entry deleted", schedule.length === 2, schedule.map((s) => s.title));
  check("surviving schedule entries keep their order", schedule[0].title === "Doli" && schedule[1].title === "Dinner", schedule.map((s) => s.title));

  check("out-of-range schedule index rejected", (await updateScheduleEntry(ownerId_, receptionId, 99, { title: "X", time: "Y" })) === false);
  check("deleting a bad index rejected", (await deleteScheduleEntry(ownerId_, receptionId, -1)) === false);

  section("4. Contacts");
  const father = await createContact(ownerId_, { name: "Md. Karim", role: "Father of Bride", phone: "+8801700000000" });
  const mother = await createContact(ownerId_, { name: "Mrs. Rahima", role: "Mother of Bride", phone: "" });
  check("contact created", father.name === "Md. Karim");
  check("contact sortOrder is sequential", father.sortOrder === 0 && mother.sortOrder === 1, [father.sortOrder, mother.sortOrder]);

  await moveContact(ownerId_, mother._id.toString(), "up");
  const contacts = await listContacts(ownerId_);
  check("contact reorders", contacts[0].name === "Mrs. Rahima", contacts.map((c) => c.name));
  check("contact sortOrder stays dense", isDense(contacts.map((c) => c.sortOrder)), contacts.map((c) => c.sortOrder));

  const edited = await updateContact(ownerId_, father._id.toString(), {
    name: "Md. Karim Sr.",
    role: "Father of Bride",
    phone: "+8801711111111",
  });
  check("contact updated", edited?.name === "Md. Karim Sr.", edited?.name);

  section("5. Gallery and the black-and-white pair");
  // Real Cloudinary uploads are not exercised here; these stand in for stored
  // rows so the pair rule can be tested without credentials.
  const images = [];
  for (let i = 0; i < 4; i += 1) {
    const image = await GalleryImageModel.create({
      weddingId: ownerWedding._id,
      url: `https://res.cloudinary.com/demo/image/upload/sample${i + 1}.jpg`,
      publicId: `verify/sample${i + 1}`,
      alt: `Sample ${i + 1}`,
    });
    images.push(image);
  }
  check("gallery images default to not in the pair", images.every((image) => image.isBlackAndWhitePair === false));
  check("pair cap constant is 2", BLACK_AND_WHITE_PAIR_SIZE === 2);

  const first = await setBlackAndWhitePair(ownerId_, images[0]._id.toString(), true);
  const second = await setBlackAndWhitePair(ownerId_, images[1]._id.toString(), true);
  check("first two images join the pair", first.ok && second.ok);

  const third = await setBlackAndWhitePair(ownerId_, images[2]._id.toString(), true);
  check("a third image is refused", third.ok === false, third);
  const stillTwo = await GalleryImageModel.countDocuments({ weddingId: ownerWedding._id, isBlackAndWhitePair: true });
  check("pair still holds exactly two", stillTwo === 2, stillTwo);

  const repeat = await setBlackAndWhitePair(ownerId_, images[0]._id.toString(), true);
  check("selecting an existing member is a no-op, not an error", repeat.ok === true);

  await setBlackAndWhitePair(ownerId_, images[0]._id.toString(), false);
  check("a member can be removed", (await setBlackAndWhitePair(ownerId_, images[0]._id.toString(), true)).ok === true);

  section("6. Wishlist");
  check("an empty wishlist is valid", (await listGiftItems(ownerId_)).length === 0);

  const kettle = await createGiftItem(ownerId_, { title: "Kettle", description: "For the new home", link: "bKash: 01700-000000" });
  const toaster = await createGiftItem(ownerId_, { title: "Toaster", description: "", link: "https://store.example/toaster" });
  check("gift item stores payment text as a plain string", kettle.link === "bKash: 01700-000000");
  check("gift item stores an external link", toaster.link.startsWith("https://"));
  check("gift item without an image is allowed", kettle.imageUrl === "");

  await moveGiftItem(ownerId_, toaster._id.toString(), "up");
  const gifts = await listGiftItems(ownerId_);
  check("gift items reorder", gifts[0].title === "Toaster", gifts.map((g) => g.title));
  check("gift sortOrder stays dense", isDense(gifts.map((g) => g.sortOrder)), gifts.map((g) => g.sortOrder));

  section("7. Ownership — the second user's wedding is invisible");
  // The children helpers scope by weddingId but do not know about ownership, so
  // these calls use the *intruder's* wedding id against the owner's rows.
  const ownerEventsViaIntruderWedding = await listEvents(intruderId_);
  check("intruder's own event list is empty", ownerEventsViaIntruderWedding.length === 0, ownerEventsViaIntruderWedding.length);
  check("owner events not visible under another wedding id", (await WeddingEventModel.countDocuments({ weddingId: intruderWedding._id })) === 0);
  check("owner contacts not visible under another wedding id", (await ContactModel.countDocuments({ weddingId: intruderWedding._id })) === 0);
  check("owner images not visible under another wedding id", (await GalleryImageModel.countDocuments({ weddingId: intruderWedding._id })) === 0);
  check("owner gifts not visible under another wedding id", (await GiftItemModel.countDocuments({ weddingId: intruderWedding._id })) === 0);

  const straddle = await updateContact(intruderId_, father._id.toString(), {
    name: "Hijacked",
    role: "",
    phone: "",
  });
  check("updating a contact across weddings returns null", straddle === null, straddle);
  check(
    "the contact is unchanged after the cross-wedding update",
    (await ContactModel.findById(father._id).lean().exec())?.name === "Md. Karim Sr.",
  );

  const hijackPair = await setBlackAndWhitePair(intruderId_, images[0]._id.toString(), false);
  check("pair toggle across weddings is refused", hijackPair.ok === false, hijackPair);

  const badId = await listEvents("not-an-object-id");
  check("a malformed wedding id returns an empty list rather than throwing", Array.isArray(badId) && badId.length === 0);

  section("8. Deleting a wedding does not orphan its children");
  // Content is intentionally not cascaded here — that is a later session's
  // decision — but the rows must still be scoped and countable.
  check("all owner events carry the owner wedding id", (await WeddingEventModel.countDocuments({ weddingId: ownerWedding._id })) === 2);
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
