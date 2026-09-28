import type { Contact } from "@/lib/models/contact";
import type { GalleryImage } from "@/lib/models/gallery-image";
import type { GiftItem } from "@/lib/models/gift-item";
import type { WeddingEvent } from "@/lib/models/wedding-event";

/**
 * Server -> client shapes.
 *
 * A Mongoose document carries `ObjectId`s, `Date`s and a hydrated-document
 * wrapper, none of which should be handed to a client component: `ObjectId`
 * serialises to an empty object, so `event._id.toString()` would be
 * `undefined` on the other side. Each mapper flattens the document to plain
 * primitives at the page boundary, which is also the only place `_id` becomes
 * a string the forms can round-trip.
 */

export type EventDto = {
  id: string;
  title: string;
  gratitudeLine: string;
  joiner: string;
  sideAParents: string[];
  sideBParents: string[];
  schedule: { title: string; time: string }[];
};

export type ContactDto = {
  id: string;
  name: string;
  role: string;
  phone: string;
};

export type GalleryImageDto = {
  id: string;
  url: string;
  publicId: string;
  alt: string;
  isBlackAndWhitePair: boolean;
};

export type GiftItemDto = {
  id: string;
  title: string;
  description: string;
  link: string;
  imageUrl: string;
};

export function toEventDto(event: WeddingEvent): EventDto {
  return {
    id: event._id.toString(),
    title: event.title,
    // Coalesced rather than copied. Mongoose fills these defaults on insert,
    // but a document written by a seed script, a data migration, or an older
    // build can be missing them, and an undefined array reaching the client
    // takes the whole page down with a 500 on the first `.map`.
    gratitudeLine: event.gratitudeLine ?? "",
    joiner: event.joiner ?? "",
    sideAParents: event.sideAParents ?? [],
    sideBParents: event.sideBParents ?? [],
    schedule: (event.schedule ?? []).map((entry) => ({ title: entry.title, time: entry.time })),
  };
}

/** Flattens the parent arrays back into the textarea the form binds to. */
export function parentsToText(parents: string[]): string {
  return parents.join("\n");
}

export function toContactDto(contact: Contact): ContactDto {
  return {
    id: contact._id.toString(),
    name: contact.name,
    role: contact.role ?? "",
    phone: contact.phone ?? "",
  };
}

export function toGalleryImageDto(image: GalleryImage): GalleryImageDto {
  return {
    id: image._id.toString(),
    url: image.url,
    publicId: image.publicId,
    alt: image.alt ?? "",
    isBlackAndWhitePair: image.isBlackAndWhitePair === true,
  };
}

export function toGiftItemDto(item: GiftItem): GiftItemDto {
  return {
    id: item._id.toString(),
    title: item.title,
    description: item.description ?? "",
    link: item.link ?? "",
    imageUrl: item.imageUrl ?? "",
  };
}
