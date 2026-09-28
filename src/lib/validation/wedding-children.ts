import { z } from "zod";

/**
 * Validation for the four wedding-scoped children, shared verbatim between the
 * React Hook Form instances and the server actions.
 *
 * Keeping one schema per layer is the point: the client copy is for fast
 * feedback, and the server re-parses with the same rules because a server
 * action is a public HTTP endpoint that anything can POST to directly.
 *
 * The parent lists (`sideAParents`, `sideBParents`) arrive as textarea text and
 * are split into arrays here rather than in the form, so a pasted multi-line
 * list is one field for the user and one clean array for the document.
 */

const trimmed = z.string().trim();
const optionalLine = trimmed.max(200, "Keep this under 200 characters.");

/** One line of the parents textarea -> the string itself, blanks dropped. */
function parentList(label: string) {
  return z
    .string()
    .max(2000, `${label} looks too long.`)
    .transform((value) =>
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    );
}

export const scheduleEntrySchema = z.object({
  title: trimmed.min(1, "Give the schedule item a title.").max(120, "Title is too long."),
  // Free text, like the wedding's own time: "6:30 PM", "after Maghrib".
  time: trimmed.min(1, "Add a time for this schedule item.").max(60, "Time is too long."),
});

export type ScheduleEntryValues = z.infer<typeof scheduleEntrySchema>;

/**
 * The event fields, defined once.
 *
 * The parent lists are the awkward part: a textarea of newline-separated names
 * has to become `string[]` for the document, and that `.transform()` makes the
 * resolver's output type differ from its input. Passing the transformed value
 * back to the server action would then fail `eventWriteSchema`, which expects
 * text.
 *
 * So there are two schemas over the same field definitions — a plain one the
 * form binds to, and a transforming one the action parses with. The transform
 * happens exactly once, on the server, where it belongs.
 */
const eventFields = {
  title: trimmed.min(1, "Name the event.").max(80, "Title is too long."),
  gratitudeLine: optionalLine,
  joiner: trimmed.max(80, "Joiner is too long."),
  sideAParents: trimmed.max(2000, "That parent list is too long."),
  sideBParents: trimmed.max(2000, "That parent list is too long."),
};

/** Client-side: parents stay as the text the user typed. */
export const eventFormSchema = z.object(eventFields);

/**
 * Server-side: the same rules, with the text split into arrays.
 *
 * `schedule` is deliberately absent — entries are managed as their own sub-list
 * with their own actions, so saving an event must not rewrite them.
 */
export const eventWriteSchema = z.object({
  ...eventFields,
  sideAParents: parentList("Parents"),
  sideBParents: parentList("Parents"),
});

/** What the form holds. */
export type EventFormValues = z.infer<typeof eventFormSchema>;
/** What gets written to MongoDB. */
export type WeddingEventValues = z.infer<typeof eventWriteSchema>;

export const contactSchema = z.object({
  name: trimmed.min(1, "Add a name.").max(120, "Name is too long."),
  role: trimmed.max(120, "Role is too long."),
  phone: trimmed.max(40, "That is not a phone number."),
});

export type ContactValues = z.infer<typeof contactSchema>;

/**
 * `link` is deliberately not validated as a URL. The field doubles as a
 * destination label, and a store URL and "bKash: 01700-000000" are both valid
 * inputs for the same column.
 */
export const giftItemSchema = z.object({
  title: trimmed.min(1, "Name the gift.").max(120, "Title is too long."),
  description: trimmed.max(500, "Description is too long."),
  link: trimmed.max(300, "Link is too long."),
});

export type GiftItemValues = z.infer<typeof giftItemSchema>;

/** The gallery's only editable field; the image itself arrives as a file. */
export const galleryImageSchema = z.object({
  alt: trimmed.max(160, "Alt text is too long."),
});

export type GalleryImageValues = z.infer<typeof galleryImageSchema>;

/**
 * Flattens Zod issues into `{ field: message }` for RHF's `setError`, which
 * cannot consume the nested issue array Zod returns.
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !result[key]) result[key] = issue.message;
  }

  return result;
}
