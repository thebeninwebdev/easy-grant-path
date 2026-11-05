import "server-only";
import { createHash } from "node:crypto";
import { connectToDatabase } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { VerificationUploadRateLimit } from "@/models/VerificationUploadRateLimit";
import { VerificationPendingUpload } from "@/models/VerificationPendingUpload";
const WINDOW_MS = 15 * 60 * 1000;
export async function enforceVerificationUploadRateLimit(userId: string) {
  await connectToDatabase();
  const now = Date.now(); const windowStart = Math.floor(now / WINDOW_MS) * WINDOW_MS;
  const id = createHash("sha256").update(`${userId}:${windowStart}`).digest("hex");
  const result = await VerificationUploadRateLimit.findByIdAndUpdate(id, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(windowStart + WINDOW_MS * 2) } }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }).lean();
  if ((result?.count || 0) > 8) throw new AppError("Too many verification upload attempts. Try again later.", "RATE_LIMITED", 429, { retryAfterSeconds: Math.ceil((windowStart + WINDOW_MS - now) / 1000) });
}
export async function registerPendingVerificationUpload(userId: string, kind: "identity" | "organization", storageKey: string) {
  await connectToDatabase();
  await VerificationPendingUpload.create({ _id: storageKey, userId, kind, expiresAt: new Date(Date.now() + 15 * 60 * 1000) });
}
export async function claimPendingVerificationUpload(userId: string, kind: "identity" | "organization", storageKey: string) {
  await connectToDatabase();
  const claimed = await VerificationPendingUpload.findOneAndUpdate({ _id: storageKey, userId, kind, consumedAt: null, expiresAt: { $gt: new Date() } }, { $set: { consumedAt: new Date() } }, { returnDocument: "after" }).lean();
  if (!claimed) throw new AppError("This upload is expired, already used, or belongs to another account.", "INVALID_UPLOAD_OWNER", 403);
}
