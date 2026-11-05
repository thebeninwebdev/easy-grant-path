import "server-only";
import { createHash, randomUUID } from "crypto";
import { copy, del, get, head, list } from "@vercel/blob";
import { AppError } from "@/lib/errors";
import { detectDocumentContent, sanitizeDocumentFilename } from "@/lib/verification-policy";
export const ACCEPTED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export const MAX_DOCUMENT_SIZE = 4 * 1024 * 1024;
export const MAX_UPLOAD_REQUEST_SIZE = 96 * 1024;
const INCOMING_PREFIX = "verification/v1/incoming/";
const DOCUMENT_PREFIX = "verification/v1/documents/";
export type FileMetadata = { storageKey: string; filename: string; mimeType: (typeof ACCEPTED_DOCUMENT_TYPES)[number]; size: number; sha256: string; provider: "vercel_blob" };
export type PendingUpload = { storageKey: string; filename: string; mimeType: string; size: number };
export function assertPrivateStorageConfigured() {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !(process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID)) throw new AppError("Private verification storage is unavailable.", "STORAGE_UNAVAILABLE", 503);
}
function isOpaqueKey(key: string, prefix: string) { return key.startsWith(prefix) && /^verification\/v1\/(?:incoming|documents)\/[0-9a-f-]{36}\.(?:pdf|jpg|png)$/.test(key); }
export function assertIncomingStorageKey(key: string) { if (!isOpaqueKey(key, INCOMING_PREFIX)) throw new AppError("Invalid pending upload.", "INVALID_UPLOAD", 400); }
export function assertStoredStorageKey(key: string) {
  if (key.startsWith("development/")) throw new AppError("This legacy document must be uploaded again.", "LEGACY_DOCUMENT", 410);
  if (!isOpaqueKey(key, DOCUMENT_PREFIX)) throw new AppError("Invalid document reference.", "INVALID_DOCUMENT", 400);
}
export function createIncomingStorageKey(mimeType: string) {
  const extension = mimeType === "application/pdf" ? "pdf" : mimeType === "image/png" ? "png" : mimeType === "image/jpeg" ? "jpg" : null;
  if (!extension) throw new AppError("Upload a PDF, JPG, or PNG file.", "UNSUPPORTED_DOCUMENT", 415);
  return `${INCOMING_PREFIX}${randomUUID()}.${extension}`;
}
export function assertUploadRequestSize(request: Request) {
  const raw = request.headers.get("content-length");
  if (raw && Number(raw) > MAX_UPLOAD_REQUEST_SIZE) throw new AppError("Upload request is too large.", "REQUEST_TOO_LARGE", 413);
}
export async function readUploadRequestJson(request: Request): Promise<unknown> {
  assertUploadRequestSize(request);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_UPLOAD_REQUEST_SIZE) throw new AppError("Upload request is too large.", "REQUEST_TOO_LARGE", 413);
  try { return JSON.parse(text); } catch { throw new AppError("Invalid upload request.", "VALIDATION_ERROR", 400); }
}
export function validateClientFile(file: Pick<File, "size" | "type"> | null) {
  if (!file?.size) return "Choose a document to upload.";
  if (!(ACCEPTED_DOCUMENT_TYPES as readonly string[]).includes(file.type)) return "Upload a PDF, JPG, or PNG file.";
  if (file.size > MAX_DOCUMENT_SIZE) return "Documents must be 4 MB or smaller.";
  return null;
}
export async function finalizeVerificationUpload(upload: PendingUpload): Promise<FileMetadata> {
  assertPrivateStorageConfigured(); assertIncomingStorageKey(upload.storageKey);
  if (!(ACCEPTED_DOCUMENT_TYPES as readonly string[]).includes(upload.mimeType)) throw new AppError("Unsupported document type.", "UNSUPPORTED_DOCUMENT", 415);
  if (!Number.isSafeInteger(upload.size) || upload.size <= 0 || upload.size > MAX_DOCUMENT_SIZE) throw new AppError("Invalid document size.", "INVALID_DOCUMENT_SIZE", 400);
  const result = await get(upload.storageKey, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200) throw new AppError("The uploaded document could not be found.", "UPLOAD_NOT_FOUND", 400);
  const bytes = new Uint8Array(await new Response(result.stream).arrayBuffer());
  if (!bytes.length || bytes.length > MAX_DOCUMENT_SIZE || bytes.length !== upload.size) { await del(upload.storageKey).catch(() => undefined); throw new AppError("The uploaded document size is invalid.", "INVALID_DOCUMENT_SIZE", 400); }
  const detected = detectDocumentContent(bytes);
  if (!detected || detected.mimeType !== upload.mimeType) { await del(upload.storageKey).catch(() => undefined); throw new AppError("The document contents do not match its file type.", "INVALID_DOCUMENT_CONTENT", 415); }
  const storageKey = `${DOCUMENT_PREFIX}${randomUUID()}.${detected.extension}`;
  await copy(upload.storageKey, storageKey, { access: "private", contentType: detected.mimeType, addRandomSuffix: false });
  await del(upload.storageKey);
  return { storageKey, filename: sanitizeDocumentFilename(upload.filename, detected.extension), mimeType: detected.mimeType, size: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), provider: "vercel_blob" };
}
export async function getVerificationFile(storageKey: string) {
  assertPrivateStorageConfigured(); assertStoredStorageKey(storageKey);
  const result = await get(storageKey, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200) throw new AppError("Document not found.", "DOCUMENT_NOT_FOUND", 404);
  return result;
}
export async function verificationFileExists(storageKey: string) { assertPrivateStorageConfigured(); assertStoredStorageKey(storageKey); try { await head(storageKey); return true; } catch { return false; } }
export async function deleteVerificationFiles(keys: Array<string | null | undefined>) {
  const valid = [...new Set(keys.filter((key): key is string => Boolean(key) && isOpaqueKey(key!, DOCUMENT_PREFIX)))];
  if (valid.length) await del(valid);
}
export async function listStaleIncomingUploads(cursor?: string) { assertPrivateStorageConfigured(); return list({ prefix: INCOMING_PREFIX, cursor, limit: 1000 }); }
