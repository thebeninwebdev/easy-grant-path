import "server-only";
import { connection } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { requireCurrentUserId } from "@/lib/development-user";
import { OrganizationProfile } from "@/models/OrganizationProfile";
import { AppError } from "@/lib/errors";
import type { OrganizationDetailsInput } from "@/lib/profile-validation";

export async function getOrganizationProfile() { await connection(); await connectToDatabase(); const item = await OrganizationProfile.findOne({ userId: await requireCurrentUserId() }).lean(); return item ? { ...item, id: String(item._id) } : null; }
export async function getOrganizationProfileForUserId(userId: string) { await connection(); await connectToDatabase(); const item = await OrganizationProfile.findOne({ userId }).lean(); return item ? { ...item, id: String(item._id) } : null; }
export function hasMaterialOrganizationChange(current: { organizationType?: string; name?: string; countryCode?: string; registrationStatus?: string }, next: OrganizationDetailsInput) { return current.organizationType !== next.organizationType || current.name !== next.name || current.countryCode !== next.countryCode || current.registrationStatus !== next.registrationStatus; }
export async function saveOrganizationProfile(data: OrganizationDetailsInput) { const userId = await requireCurrentUserId(); await connectToDatabase(); const current = await OrganizationProfile.findOne({ userId }).lean(); if (current && ["pending", "verified", "provisional"].includes(current.verificationStatus) && hasMaterialOrganizationChange(current, data)) throw new AppError(current.verificationStatus === "verified" ? "Verified organization details cannot be changed without re-verification. Contact support to update these details." : "Organization details cannot be changed while verification is under review.", "VERIFICATION_LOCKED", 409); return OrganizationProfile.findOneAndUpdate({ userId }, { $set: data, $setOnInsert: { userId } }, { upsert: true, returnDocument: "after", runValidators: true }).lean(); }
