import "server-only";
import { connection } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { requireCurrentUserId } from "@/lib/development-user";
import { AppError } from "@/lib/errors";
import { serializePublicOpportunity } from "@/lib/public-opportunities";
import type { SupportedLocale } from "@/lib/config";
import { Opportunity } from "@/models/Opportunity";
import { SavedOpportunity } from "@/models/SavedOpportunity";

function iso(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function listSavedOpportunityIds() {
  await connection(); await connectToDatabase();
  const items = await SavedOpportunity.find({ userId: await requireCurrentUserId() }).select("opportunityId").lean();
  return items.map((item) => String(item.opportunityId));
}

export async function listSavedOpportunities(locale: SupportedLocale = "en") {
  await connection(); await connectToDatabase();
  const userId = await requireCurrentUserId();
  const saved = await SavedOpportunity.find({ userId }).sort({ createdAt: -1 }).lean();
  const opportunities = await Opportunity.find({ _id: { $in: saved.map((item) => item.opportunityId) }, verificationStatus: { $ne: "rejected" } }).lean();
  const byId = new Map(opportunities.map((item) => [String(item._id), item]));
  return saved.flatMap((bookmark) => {
    const item = byId.get(String(bookmark.opportunityId));
    if (!item) return [];
    const deadline = iso(item.deadline);
    const publicItem = serializePublicOpportunity(item as unknown as Record<string, unknown>, locale);
    return [{ bookmarkId: String(bookmark._id), ...publicItem, closed: item.status === "closed" || item.status === "expired" || Boolean(deadline && new Date(deadline).getTime() < Date.now()) }];
  });
}

export async function saveOpportunity(opportunityId: string) {
  if (!isValidObjectId(opportunityId)) throw new AppError("Invalid opportunity ID.", "VALIDATION_ERROR", 400);
  await connectToDatabase();
  const userId = await requireCurrentUserId();
  const exists = await Opportunity.exists({ _id: opportunityId, verificationStatus: "verified" });
  if (!exists) throw new AppError("Opportunity not found.", "NOT_FOUND", 404);
  await SavedOpportunity.updateOne({ userId, opportunityId }, { $setOnInsert: { userId, opportunityId } }, { upsert: true });
}

export async function removeSavedOpportunity(opportunityId: string) {
  if (!isValidObjectId(opportunityId)) throw new AppError("Invalid opportunity ID.", "VALIDATION_ERROR", 400);
  await connectToDatabase();
  await SavedOpportunity.deleteOne({ userId: await requireCurrentUserId(), opportunityId });
}
