import { z } from "zod";

/**
 * Shared by the client form (via @hookform/resolvers) and the server action,
 * so it must stay free of server-only imports and Mongoose types.
 */

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/**
 * Builds "Friday • 10.24.25" from a calendar date.
 *
 * Uses UTC getters deliberately: a wedding date is a calendar day, and reading
 * it in local time shifts it by a day for anyone west of UTC.
 */
export function deriveWeddingDateShort(value: Date | string | null | undefined): string {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "";

  const day = DAY_NAMES[date.getUTCDay()];
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(date.getUTCDate()).padStart(2, "0");
  const year = String(date.getUTCFullYear()).slice(-2);

  return `${day} • ${month}.${dayOfMonth}.${year}`;
}

/** Formats a stored Date back into the `YYYY-MM-DD` an <input type="date"> wants. */
export function toDateInputValue(value: Date | string | null | undefined): string {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate(),
  ).padStart(2, "0")}`;
}

/** An optional free-text field: empty string is valid, but a long value is not. */
const optionalText = (label: string, max = 160) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`);

/** An optional URL: blank is fine, but a non-blank value must be http(s). */
const optionalUrl = (label: string) =>
  z
    .string()
    .trim()
    .max(2048, `${label} is too long`)
    .refine((value) => {
      if (!value) return true;
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }, `${label} must be a valid http(s) URL`);

const isYouTubeUrl = (value: string) => {
  try {
    const url = new URL(value);
    return (
      url.hostname === "youtu.be" ||
      url.hostname === "www.youtube.com" ||
      url.hostname === "youtube.com" ||
      url.hostname.endsWith(".youtube.com")
    );
  } catch {
    return false;
  }
};

export const weddingFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Give the invitation a title")
      .max(120, "Title must be 120 characters or fewer"),

    groomName: optionalText("Groom name", 80),
    groomFullName: optionalText("Groom full name", 160),
    brideName: optionalText("Bride name", 80),
    brideFullName: optionalText("Bride full name", 160),

    // Kept as a `YYYY-MM-DD` string in the form so the value survives a
    // round trip through FormData without timezone surprises.
    weddingDate: z
      .string()
      .trim()
      .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Enter a valid date")
      .refine((value) => {
        if (!value) return true;
        return !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());
      }, "That date does not exist"),
    weddingTime: optionalText("Time", 80),

    dressCode: optionalText("Dress code", 200),

    venueName: optionalText("Venue name", 160),
    venueAddress: optionalText("Venue address", 400),
    mapUrl: optionalUrl("Map link"),
    wazeUrl: optionalUrl("Waze link"),

    phone: optionalText("Phone", 40),

    musicType: z.enum(["upload", "youtube"]),
    musicUrl: optionalUrl("Music link"),
  })
  .superRefine((values, ctx) => {
    if (values.musicType === "youtube" && values.musicUrl && !isYouTubeUrl(values.musicUrl)) {
      ctx.addIssue({
        code: "custom",
        path: ["musicUrl"],
        message: "Enter a YouTube link",
      });
    }
  });

export type WeddingFormValues = z.infer<typeof weddingFormSchema>;

export const weddingFormDefaults: WeddingFormValues = {
  title: "",
  groomName: "",
  groomFullName: "",
  brideName: "",
  brideFullName: "",
  weddingDate: "",
  weddingTime: "",
  dressCode: "",
  venueName: "",
  venueAddress: "",
  mapUrl: "",
  wazeUrl: "",
  phone: "",
  musicType: "upload",
  musicUrl: "",
};

export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !result[key]) result[key] = issue.message;
  }

  return result;
}
