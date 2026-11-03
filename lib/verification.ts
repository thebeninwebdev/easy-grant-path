import "server-only";
import { connection } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { requireCurrentUserId } from "@/lib/development-user";
import { IdentityVerification } from "@/models/IdentityVerification";
import { OrganizationProfile } from "@/models/OrganizationProfile";
import { OrganizationVerificationDocument } from "@/models/OrganizationVerificationDocument";
import type { FileMetadata } from "@/lib/file-storage";

const actor = "development-admin";
export async function getIdentityVerification() { await connection(); await connectToDatabase(); return IdentityVerification.findOne({ userId: await requireCurrentUserId() }).lean(); }
export async function submitIdentityVerification(documentType: string, file: FileMetadata) { await connectToDatabase(); const current = await IdentityVerification.findOne({ userId: await requireCurrentUserId() }); const action = current?.verificationStatus === "action_required" ? "resubmitted" : "submitted"; return IdentityVerification.findOneAndUpdate({ userId: await requireCurrentUserId() }, { $set: { documentType, documentFile: file, verificationStatus: "pending", submittedAt: new Date(), reviewedAt: null, reviewedBy: null, reviewNote: null }, $push: { reviewHistory: { action, actor, at: new Date() } } }, { upsert: true, returnDocument: "after", runValidators: true }).lean(); }
export async function getOrganizationVerification() { await connection(); await connectToDatabase(); const profile = await OrganizationProfile.findOne({ userId: await requireCurrentUserId() }).lean(); const documents = profile ? await OrganizationVerificationDocument.find({ organizationProfileId: profile._id }).lean() : []; return { profile, documents }; }
export async function submitOrganizationDocuments(files: { type: string; metadata: FileMetadata }[]) { const userId = await requireCurrentUserId(); await connectToDatabase(); const profile = await OrganizationProfile.findOne({ userId }); if (!profile) throw new Error("Complete your organization profile first."); const action = profile.verificationStatus === "action_required" ? "resubmitted" : "submitted"; await Promise.all(files.map((file) => OrganizationVerificationDocument.findOneAndUpdate({ userId, type: file.type }, { $set: { organizationProfileId: profile._id, storage: file.metadata, status: "pending", submittedAt: new Date(), reviewedAt: null, reviewedBy: null, rejectionReason: null } }, { upsert: true, returnDocument: "after", runValidators: true }))); await OrganizationProfile.updateOne({ _id: profile._id }, { $set: { verificationStatus: "pending", verificationSubmittedAt: new Date(), rejectionReason: null, reviewNote: null }, $push: { reviewHistory: { action, actor, at: new Date() } } }); return getOrganizationVerification(); }
