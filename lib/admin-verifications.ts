import "server-only";
import { connection } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { verificationFileExists } from "@/lib/file-storage";
import { canAdminTransitionVerification, requiredOrganizationDocumentTypes, resolvedOrganizationApprovalStatus, type AdminReviewTarget, type VerificationStatus } from "@/lib/verification-policy";
import { IdentityVerification } from "@/models/IdentityVerification";
import { OrganizationProfile } from "@/models/OrganizationProfile";
import { UserProfile } from "@/models/UserProfile";
import { OrganizationVerificationDocument } from "@/models/OrganizationVerificationDocument";
import { VerificationAuditEvent } from "@/models/VerificationAuditEvent";
const statuses = ["pending", "action_required", "verified", "provisional", "rejected"];
type ReviewRecord = { _id: unknown; userId: string; verificationStatus: VerificationStatus; updatedAt: Date; registrationStatus?: "registered" | "in_progress" | "not_registered"; documentFile?: { storageKey?: string } };
type ReviewDocument = { type: string; storage?: { storageKey?: string } };

export async function listAdminVerifications() {
  await requireAdmin(); await connection(); await connectToDatabase();
  const [identities, organizations] = await Promise.all([IdentityVerification.find({ verificationStatus: { $in: statuses } }).lean(), OrganizationProfile.find({ verificationStatus: { $in: statuses } }).lean()]);
  const userIds = [...identities.map((item) => item.userId), ...organizations.map((item) => item.userId)];
  const users = await UserProfile.find({ userId: { $in: userIds } }).lean();
  const names = new Map(users.map((item) => [item.userId, { fullName: item.fullName || "", applicantType: item.applicantType || "", countryCode: item.countryCode || "" }]));
  return [...identities.map((item) => ({ id: `identity:${item._id}`, kind: "identity", userId: item.userId, ...names.get(item.userId), status: item.verificationStatus, submittedAt: item.submittedAt, documentType: item.documentType, organizationName: undefined })), ...organizations.map((item) => ({ id: `organization:${item._id}`, kind: "organization", userId: item.userId, ...names.get(item.userId), status: item.verificationStatus, submittedAt: item.verificationSubmittedAt, documentType: "organization documents", organizationName: item.name }))];
}
export async function getAdminVerification(id: string) {
  await requireAdmin(); await connection(); await connectToDatabase();
  const [kind, rawId] = id.split(":");
  if (kind === "identity") { const item = await IdentityVerification.findById(rawId).lean().catch(() => null); return item ? { kind, item, profile: await UserProfile.findOne({ userId: item.userId }).lean() } : null; }
  if (kind === "organization") { const item = await OrganizationProfile.findById(rawId).lean().catch(() => null); return item ? { kind, item, profile: await UserProfile.findOne({ userId: item.userId }).lean(), documents: await OrganizationVerificationDocument.find({ organizationProfileId: item._id }).lean() } : null; }
  return null;
}
export async function reviewAdminVerification(id: string, requestedStatus: AdminReviewTarget, actorId: string, reason?: string) {
  const admin = await requireAdmin();
  if (admin.user.id !== actorId) throw new AppError("Administrator attribution mismatch.", "FORBIDDEN", 403);
  if (["action_required", "rejected"].includes(requestedStatus) && !reason?.trim()) throw new AppError("A reason is required for this decision.", "VALIDATION_ERROR", 400);
  const db = await connectToDatabase(); const [kind, rawId] = id.split(":"); const now = new Date();

  let current: ReviewRecord | null = null; let documents: ReviewDocument[] = [];
  if (kind === "identity") current = await IdentityVerification.findById(rawId).catch(() => null) as unknown as ReviewRecord | null;
  else if (kind === "organization") { current = await OrganizationProfile.findById(rawId).catch(() => null) as unknown as ReviewRecord | null; if (current) documents = await OrganizationVerificationDocument.find({ organizationProfileId: current._id }) as unknown as ReviewDocument[]; }
  else throw new AppError("Verification not found.", "NOT_FOUND", 404);
  if (!current) throw new AppError("Verification not found.", "NOT_FOUND", 404);
  const fromStatus = current.verificationStatus as VerificationStatus;
  if (!canAdminTransitionVerification(fromStatus, requestedStatus)) throw new AppError("This review action is no longer valid for the current status.", "INVALID_STATE_TRANSITION", 409);

  const registrationStatus: "registered" | "in_progress" | "not_registered" = current.registrationStatus || "not_registered";
  if (requestedStatus === "verified") {
    if (kind === "organization" && registrationStatus === "not_registered") throw new AppError("This organization does not require document verification.", "INVALID_STATE_TRANSITION", 409);
    if (kind === "identity") {
      if (!current.documentFile?.storageKey || !(await verificationFileExists(current.documentFile.storageKey))) throw new AppError("The required identity document is missing.", "MISSING_DOCUMENTS", 409);
    } else {
      const required = requiredOrganizationDocumentTypes(registrationStatus);
      for (const type of required) {
        const document = documents.find((item) => item.type === type);
        if (!document?.storage?.storageKey || !(await verificationFileExists(document.storage.storageKey))) throw new AppError("Required organization documents are missing.", "MISSING_DOCUMENTS", 409);
      }
    }
  }
  const toStatus = kind === "organization" && requestedStatus === "verified" ? resolvedOrganizationApprovalStatus(registrationStatus) : requestedStatus;
  const action = requestedStatus === "verified" ? (toStatus === "provisional" ? "provisionally_approved" : "approved") : requestedStatus === "rejected" ? "rejected" : "resubmission_requested";
  const session = await db.startSession(); let updated: unknown;
  try {
    await session.withTransaction(async () => {
      const changes = { verificationStatus: toStatus, reviewedAt: now, reviewedBy: actorId, reviewNote: reason?.trim() || null, rejectionReason: requestedStatus === "verified" ? null : reason?.trim(), verifiedAt: toStatus === "verified" ? now : null, rejectedAt: requestedStatus === "rejected" ? now : null };
      if (kind === "identity") updated = await IdentityVerification.findOneAndUpdate({ _id: current._id, verificationStatus: fromStatus, updatedAt: current.updatedAt }, { $set: changes, $push: { reviewHistory: { action, note: reason?.trim(), actor: actorId, at: now } } }, { session, returnDocument: "after", runValidators: true });
      else {
        updated = await OrganizationProfile.findOneAndUpdate({ _id: current._id, verificationStatus: fromStatus, updatedAt: current.updatedAt }, { $set: changes, $push: { reviewHistory: { action, note: reason?.trim(), actor: actorId, at: now } } }, { session, returnDocument: "after", runValidators: true });
        if (updated) await OrganizationVerificationDocument.updateMany({ organizationProfileId: current._id }, { $set: { status: toStatus, reviewedAt: now, reviewedBy: actorId, rejectionReason: requestedStatus === "verified" ? null : reason?.trim() } }, { session, runValidators: true });
      }
      if (!updated) throw new AppError("Another reviewer changed this record. Refresh before retrying.", "CONCURRENT_UPDATE", 409);
      await VerificationAuditEvent.create([{ verificationKind: kind, verificationId: String(current._id), userId: current.userId, actorId, actorType: "admin", action, fromStatus, toStatus, reason: reason?.trim() }], { session });
    });
    return updated;
  } finally { await session.endSession(); }
}
