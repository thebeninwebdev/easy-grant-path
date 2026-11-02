import "server-only";
import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type FileMetadata = { storageKey: string; filename: string; mimeType: string; size: number };
// Development adapter: only metadata is persisted in MongoDB. Connect a private object
// store here for production; never put file bytes or public URLs in verification models.
const privateRoot = path.join(process.cwd(), ".private", "verification");
export async function saveVerificationFile(file: File): Promise<FileMetadata> { const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_"); const storageKey = `development/${randomUUID()}/${filename}`; await mkdir(path.join(privateRoot, path.dirname(storageKey)), { recursive: true }); await writeFile(path.join(privateRoot, storageKey), Buffer.from(await file.arrayBuffer())); return { storageKey, filename: file.name, mimeType: file.type, size: file.size }; }
export async function getVerificationFile(storageKey: string) { const resolved = path.resolve(privateRoot, storageKey); if (!resolved.startsWith(path.resolve(privateRoot) + path.sep)) throw new Error("Invalid storage key."); return readFile(resolved); }
export const ACCEPTED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;
export function validateUploadedFile(file: File | null) { if (!file || !file.size) return "Choose a document to upload."; if (!(ACCEPTED_DOCUMENT_TYPES as readonly string[]).includes(file.type)) return "Upload a PDF, JPG, or PNG file."; if (file.size > MAX_DOCUMENT_SIZE) return "Documents must be 5 MB or smaller."; return null; }
