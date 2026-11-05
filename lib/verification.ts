import "server-only";
import { connection } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { requireCurrentUserId } from "@/lib/development-user";
import { IdentityVerification } from "@/models/IdentityVerification";
import { OrganizationProfile } from "@/models/OrganizationProfile";
import { OrganizationVerificationDocument } from "@/models/OrganizationVerificationDocument";
import { VerificationAuditEvent } from "@/models/VerificationAuditEvent";
import { canUserSubmitVerification, requiredOrganizationDocumentTypes, type VerificationStatus } from "@/lib/verification-policy";
import type { FileMetadata } from "@/lib/file-storage";

export async function getIdentityVerificationForUserId(userId: string) { await connection(); await connectToDatabase(); return IdentityVerification.findOne({ userId }).lean(); }
export async function getIdentityVerification() { return getIdentityVerificationForUserId(await requireCurrentUserId()); }
export async function getOrganizationVerificationForUserId(userId: string) {
  await connection(); await connectToDatabase();
  const profile = await OrganizationProfile.findOne({ userId }).lean();
  const documents = profile ? await OrganizationVerificationDocument.find({ organizationProfileId: profile._id }).lean() : [];
  return { profile, documents };
}
export async function getOrganizationVerification() { return getOrganizationVerificationForUserId(await requireCurrentUserId()); }

export async function assertCanSubmitIdentity(userId: string) {
  await connectToDatabase();
  const current = await IdentityVerification.findOne({ userId }).select("verificationStatus").lean();
  if (!canUserSubmitVerification(current?.verificationStatus as VerificationStatus | undefined)) throw new AppError(current?.verificationStatus === "pending" ? "Your identity documents are already under review." : "This identity record cannot be replaced.", "INVALID_STATE_TRANSITION", 409);
}
export async function assertCanSubmitOrganization(userId: string) {
  await connectToDatabase();
  const profile = await OrganizationProfile.findOne({ userId }).lean();
  if (!profile) throw new AppError("Complete your organization profile first.", "PROFILE_REQUIRED", 400);
  if (profile.registrationStatus === "not_registered") throw new AppError("Verification documents are not required for this organization.", "VERIFICATION_NOT_REQUIRED", 400);
  if (!canUserSubmitVerification(profile.verificationStatus as VerificationStatus)) throw new AppError(profile.verificationStatus === "pending" ? "Your organization documents are already under review." : "This organization verification cannot be replaced.", "INVALID_STATE_TRANSITION", 409);
  return profile;
}

export async function submitIdentityVerification(userId: string, documentType: string, metadata: FileMetadata) {
  const db = await connectToDatabase(); const session = await db.startSession();
  let record: unknown; let replacedStorageKey: string | undefined;
  try {
    await session.withTransaction(async () => {
      const current = await IdentityVerification.findOne({ userId }).session(session);
      const fromStatus = (current?.verificationStatus || "unverified") as VerificationStatus;
      if (!canUserSubmitVerification(fromStatus)) throw new AppError("This identity record cannot be submitted from its current state.", "INVALID_STATE_TRANSITION", 409);
      const now = new Date(); const action = fromStatus === "action_required" ? "resubmitted" : "submitted";
      if (current) {
        replacedStorageKey = current.documentFile?.storageKey;
        record = await IdentityVerification.findOneAndUpdate({ _id: current._id, verificationStatus: fromStatus, updatedAt: current.updatedAt }, { $set: { documentType, documentFile: metadata, verificationStatus: "pending", submittedAt: now, reviewedAt: null, reviewedBy: null, reviewNote: null, rejectionReason: null }, $push: { reviewHistory: { action, actor: userId, at: now } } }, { session, returnDocument: "after", runValidators: true });
        if (!record) throw new AppError("The verification changed while you were submitting. Please retry.", "CONCURRENT_UPDATE", 409);
      } else {
        [record] = await IdentityVerification.create([{ userId, documentType, documentFile: metadata, verificationStatus: "pending", submittedAt: now, reviewHistory: [{ action, actor: userId, at: now }] }], { session });
      }
      const id = String((record as { _id: unknown })._id);
      await VerificationAuditEvent.create([{ verificationKind: "identity", verificationId: id, userId, actorId: userId, actorType: "user", action, fromStatus, toStatus: "pending" }], { session });
    });
    return { record, replacedStorageKeys: replacedStorageKey && replacedStorageKey !== metadata.storageKey ? [replacedStorageKey] : [] };
  } finally { await session.endSession(); }
}

export async function submitOrganizationDocuments(userId: string, files: { type: string; metadata: FileMetadata }[]) {
  const db = await connectToDatabase(); const session = await db.startSession();
  let profileResult: unknown; const replacedStorageKeys: string[] = [];
  try {
    await session.withTransaction(async () => {
      const profile = await OrganizationProfile.findOne({ userId }).session(session);
      if (!profile) throw new AppError("Complete your organization profile first.", "PROFILE_REQUIRED", 400);
      const fromStatus = profile.verificationStatus as VerificationStatus;
      if (!canUserSubmitVerification(fromStatus)) throw new AppError("This organization verification cannot be submitted from its current state.", "INVALID_STATE_TRANSITION", 409);
      const allowed = new Set(["registration_certificate", "authorized_representative_id"]);
      if (!files.length || files.some((file) => !allowed.has(file.type)) || new Set(files.map((file) => file.type)).size !== files.length) throw new AppError("Invalid organization documents.", "VALIDATION_ERROR", 400);
      const required = requiredOrganizationDocumentTypes(profile.registrationStatus);
      const existing = await OrganizationVerificationDocument.find({ userId }).session(session);
      const available = new Set([...existing.map((doc) => doc.type), ...files.map((file) => file.type)]);
      if (required.some((type) => !available.has(type))) throw new AppError("Upload every required organization document.", "MISSING_DOCUMENTS", 400);
      const now = new Date(); const action = fromStatus === "action_required" ? "resubmitted" : "submitted";
      for (const file of files) {
        const previous = existing.find((doc) => doc.type === file.type);
        if (previous?.storage?.storageKey) replacedStorageKeys.push(previous.storage.storageKey);
        const updated = await OrganizationVerificationDocument.findOneAndUpdate(previous ? { _id: previous._id, updatedAt: previous.updatedAt } : { userId, type: file.type }, { $set: { userId, type: file.type, organizationProfileId: profile._id, storage: file.metadata, status: "pending", submittedAt: now, reviewedAt: null, reviewedBy: null, rejectionReason: null } }, { session, upsert: !previous, returnDocument: "after", runValidators: true });
        if (!updated) throw new AppError("The documents changed while you were submitting. Please retry.", "CONCURRENT_UPDATE", 409);
      }
      profileResult = await OrganizationProfile.findOneAndUpdate({ _id: profile._id, verificationStatus: fromStatus, updatedAt: profile.updatedAt }, { $set: { verificationStatus: "pending", verificationSubmittedAt: now, reviewedAt: null, reviewedBy: null, rejectionReason: null, reviewNote: null }, $push: { reviewHistory: { action, actor: userId, at: now } } }, { session, returnDocument: "after", runValidators: true });
      if (!profileResult) throw new AppError("The profile changed while you were submitting. Please retry.", "CONCURRENT_UPDATE", 409);
      await VerificationAuditEvent.create([{ verificationKind: "organization", verificationId: String(profile._id), userId, actorId: userId, actorType: "user", action, fromStatus, toStatus: "pending" }], { session });
    });
    return { record: profileResult, replacedStorageKeys: [...new Set(replacedStorageKeys)] };
  } finally { await session.endSession(); }
}
