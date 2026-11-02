import "server-only";
import { connection } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { requireCurrentUserId } from "@/lib/development-user";
import { OrganizationProfile } from "@/models/OrganizationProfile";
import type { OrganizationApplicantType } from "@/lib/applicant-types";

export async function getOrganizationProfile() { await connection(); await connectToDatabase(); const item = await OrganizationProfile.findOne({ userId: await requireCurrentUserId() }).lean(); return item ? { ...item, id: String(item._id) } : null; }
export async function saveOrganizationProfile(data: { organizationType: OrganizationApplicantType; name: string; countryCode: string; registrationStatus: "registered" | "in_progress" | "not_registered" }) { const userId = await requireCurrentUserId(); await connectToDatabase(); return OrganizationProfile.findOneAndUpdate({ userId }, { $set: data, $setOnInsert: { userId } }, { upsert: true, new: true, runValidators: true }).lean(); }
