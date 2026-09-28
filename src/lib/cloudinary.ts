import "server-only";

import { Readable } from "node:stream";

import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

/**
 * Server-side Cloudinary client.
 *
 * Uploads go through this server rather than an unsigned browser preset, so the
 * API secret never reaches the client. Callers pass a `File` straight from
 * `FormData`.
 *
 * `getCloudinary()` throws a readable error when the credentials are missing.
 * That matters here because the placeholders in `.env.example` are `""`, which
 * is a truthy two-character string — a naive `if (!cloudName)` would sail
 * straight through and fail later inside the SDK with an opaque error.
 */

const FOLDER = "nikkahfy";

function required(name: string, value: string | undefined): string {
  // Trim, and treat a quoted-empty placeholder as absent.
  const cleaned = value?.trim().replace(/^["']|["']$/g, "").trim() ?? "";

  if (!cleaned) {
    throw new Error(
      `${name} is not set. Add it to .env.local (see .env.example) — image uploads need Cloudinary.`,
    );
  }

  return cleaned;
}

export type UploadedImage = {
  url: string;
  publicId: string;
  width: number;
  height: number;
  bytes: number;
};

/** Throws when the environment is not configured. Use for guarding the UI. */
export function isCloudinaryConfigured(): boolean {
  try {
    cloudinaryConfig();
    return true;
  } catch {
    return false;
  }
}

function cloudinaryConfig() {
  cloudinary.config({
    cloud_name: required("CLOUDINARY_CLOUD_NAME", process.env.CLOUDINARY_CLOUD_NAME),
    api_key: required("CLOUDINARY_API_KEY", process.env.CLOUDINARY_API_KEY),
    api_secret: required("CLOUDINARY_API_SECRET", process.env.CLOUDINARY_API_SECRET),
    secure: true,
  });

  return cloudinary;
}

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function uploadImage(file: File, folder = FOLDER): Promise<UploadedImage> {
  if (!file || file.size === 0) {
    throw new Error("Choose an image to upload.");
  }

  if (file.size > MAX_BYTES) {
    throw new Error("Images must be 10 MB or smaller.");
  }

  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    throw new Error("Upload a JPEG, PNG, WebP or AVIF image.");
  }

  const client = cloudinaryConfig();

  // Read the buffer before opening the promise: an executor callback is not an
  // async function, so `await` is not allowed inside it.
  const buffer = Buffer.from(await file.arrayBuffer());

  // `upload_stream` is the SDK's supported way to take binary data server-side
  // (`upload` only types string inputs).
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        // The gallery renders a B/W pair plus colour tiles, so keep some width.
        transformation: [{ width: 2000, height: 2000, crop: "limit", quality: "auto" }],
      },
      (error, response) => {
        if (error) reject(error);
        else if (response) resolve(response);
        else reject(new Error("Cloudinary returned no response."));
      },
    );

    Readable.from(buffer).pipe(stream);
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width ?? 0,
    height: result.height ?? 0,
    bytes: result.bytes ?? 0,
  };
}

/**
 * Best-effort delete. Used when a row is removed, so a stale asset never
 * accumulates — but a failure here must not block the user-facing delete, so
 * callers log rather than surface it.
 */
export async function deleteImage(publicId: string): Promise<void> {
  if (!publicId) return;
  await cloudinaryConfig().uploader.destroy(publicId, { invalidate: true });
}
