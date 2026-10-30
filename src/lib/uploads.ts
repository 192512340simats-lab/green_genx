import "server-only";
import { randomUUID } from "crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export const PRIVATE_BUCKET = "participant-docs";
export const PUBLIC_BUCKET = "site-assets";

/** Must match the bucket limit set in migration 0001 (3 MB). */
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

type ImageKind = { mime: "image/jpeg" | "image/png" | "image/webp"; ext: "jpg" | "png" | "webp" };

export interface ValidatedImage {
  buffer: Buffer;
  mime: ImageKind["mime"];
  ext: ImageKind["ext"];
  size: number;
}

export class UploadError extends Error {}

/** Detects the real image type from the file's first bytes ("magic bytes"). */
function sniffImage(buf: Buffer): ImageKind | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (
    buf.length >= 8 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { mime: "image/png", ext: "png" };
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

/**
 * Validates an uploaded file on the server:
 *  - it is a real File and not empty
 *  - size <= maxBytes
 *  - the browser-declared MIME type is an allowed image type
 *  - the actual bytes are a JPEG/PNG/WebP image AND agree with the declared type
 * Throws UploadError with a user-friendly message otherwise.
 */
export async function validateImageUpload(
  value: FormDataEntryValue | null,
  label: string,
  maxBytes: number = MAX_UPLOAD_BYTES
): Promise<ValidatedImage> {
  if (!(value instanceof File) || value.size === 0) {
    throw new UploadError(`${label} is required.`);
  }
  if (value.size > maxBytes) {
    throw new UploadError(`${label} must be smaller than ${(maxBytes / 1024 / 1024).toFixed(0)} MB.`);
  }

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(value.type)) {
    throw new UploadError(`${label} must be a JPG, PNG or WebP image.`);
  }

  const buffer = Buffer.from(await value.arrayBuffer());
  if (buffer.length > maxBytes) {
    throw new UploadError(`${label} must be smaller than ${(maxBytes / 1024 / 1024).toFixed(0)} MB.`);
  }

  const sniffed = sniffImage(buffer);
  if (!sniffed || sniffed.mime !== value.type) {
    throw new UploadError(`${label} is not a valid JPG, PNG or WebP image.`);
  }

  return { buffer, mime: sniffed.mime, ext: sniffed.ext, size: buffer.length };
}

export type PrivateDocKind = "id-cards" | "payments";

/** Uploads to the PRIVATE bucket under a random, unguessable path. Returns the path. */
export async function uploadPrivateDoc(kind: PrivateDocKind, image: ValidatedImage): Promise<string> {
  const supabase = createSupabaseServiceClient();
  const path = `${kind}/${randomUUID()}.${image.ext}`;

  const { error } = await supabase.storage.from(PRIVATE_BUCKET).upload(path, image.buffer, {
    contentType: image.mime,
    upsert: false,
    cacheControl: "0",
  });
  if (error) {
    console.error("private upload failed:", error.message);
    throw new UploadError("Could not store the uploaded file. Please try again.");
  }
  return path;
}

/** Best-effort cleanup (e.g. when the database insert fails after files were uploaded). */
export async function deletePrivateDocs(paths: Array<string | null | undefined>): Promise<void> {
  const clean = paths.filter((p): p is string => isValidPrivatePath(p));
  if (clean.length === 0) return;
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.storage.from(PRIVATE_BUCKET).remove(clean);
  if (error) console.error("private cleanup failed:", error.message);
}

const PRIVATE_PATH_RE = /^(id-cards|payments)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

export function isValidPrivatePath(path: string | null | undefined): path is string {
  return typeof path === "string" && PRIVATE_PATH_RE.test(path);
}

/** How long an admin preview link stays valid. */
export const SIGNED_URL_SECONDS = 60;

/**
 * Creates a short-lived signed URL for one private document.
 * ONLY call this after requireAdminApi() has succeeded.
 */
export async function createDocPreviewUrl(path: string): Promise<string | null> {
  if (!isValidPrivatePath(path)) return null;
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.storage
    .from(PRIVATE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) {
    console.error("signed url failed:", error?.message);
    return null;
  }
  return data.signedUrl;
}

/** Uploads the public payment QR (admin only). Returns the object path in the public bucket. */
export async function uploadPublicQr(image: ValidatedImage): Promise<string> {
  const supabase = createSupabaseServiceClient();
  const path = `payment-qr/${randomUUID()}.${image.ext}`;
  const { error } = await supabase.storage.from(PUBLIC_BUCKET).upload(path, image.buffer, {
    contentType: image.mime,
    upsert: false,
    cacheControl: "3600",
  });
  if (error) {
    console.error("qr upload failed:", error.message);
    throw new UploadError("Could not store the QR image. Please try again.");
  }
  return path;
}

/** Removes one or more files from the public asset bucket after replacement/rollback. */
export async function deletePublicAssets(paths: Array<string | null | undefined>): Promise<void> {
  const clean = paths.filter((path): path is string =>
    typeof path === "string" &&
    /^payment-qr\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/.test(path)
  );
  if (!clean.length) return;
  const { error } = await createSupabaseServiceClient().storage.from(PUBLIC_BUCKET).remove(clean);
  if (error) console.error("public asset cleanup failed:", error.message);
}

/** Public URL of an object in the public bucket (used for the payment QR). */
export function publicAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/${PUBLIC_BUCKET}/${path}`;
}
