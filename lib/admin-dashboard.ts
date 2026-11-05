import "server-only";
import { connectToDatabase } from "@/lib/db";
import { Opportunity } from "@/models/Opportunity";
import { UserProfile } from "@/models/UserProfile";
import { SourceSyncRun } from "@/models/SourceSyncRun";
import { IdentityVerification } from "@/models/IdentityVerification";
import { OrganizationVerification } from "@/models/OrganizationVerification";
import { ProposalApplication } from "@/models/ProposalApplication";
import { AuditLog } from "@/models/AuditLog";

export async function getAdminAttentionCount() {
  await connectToDatabase();
  const [opportunities, identity, organizations, failedSyncs] = await Promise.all([
    Opportunity.countDocuments({ verificationStatus: "needs_review" }),
    IdentityVerification.countDocuments({ verificationStatus: "pending" }),
    OrganizationVerification.countDocuments({ status: "pending" }),
    SourceSyncRun.countDocuments({ status: "failed", createdAt: { $gte: new Date(Date.now() - 86_400_000) } }),
  ]);
  return opportunities + identity + organizations + failedSyncs;
}

export async function getAdminDashboard(days = 30) {
  await connectToDatabase();
  const since = new Date(Date.now() - days * 86_400_000);
  const month = new Date(); month.setUTCDate(1); month.setUTCHours(0, 0, 0, 0);
  const [customers, newCustomers, activeAccess, published, needsReview, missingDeadline,
    pendingIdentity, pendingOrganizations, failedSyncs, applications, recentActivity] = await Promise.all([
    UserProfile.countDocuments(), UserProfile.countDocuments({ createdAt: { $gte: month } }),
    UserProfile.countDocuments({ accessStatus: "active" }),
    Opportunity.countDocuments({ status: "published", verificationStatus: "verified" }),
    Opportunity.countDocuments({ verificationStatus: "needs_review" }),
    Opportunity.countDocuments({ deadline: { $exists: false }, verificationStatus: "verified" }),
    IdentityVerification.countDocuments({ verificationStatus: "pending" }),
    OrganizationVerification.countDocuments({ status: "pending" }),
    SourceSyncRun.countDocuments({ status: "failed", createdAt: { $gte: since } }),
    ProposalApplication.countDocuments(),
    AuditLog.find().sort({ createdAt: -1 }).limit(8).lean(),
  ]);
  return {
    days,
    metrics: { customers, newCustomers, activeAccess, published, needsReview, applications },
    attention: { missingDeadline, pendingVerifications: pendingIdentity + pendingOrganizations, failedSyncs },
    capabilities: {
      payments: { available: false, reason: "No payment provider or immutable transaction ledger is configured." },
      assistance: { available: false, reason: "No assistance-service workflow is configured." },
    },
    activity: recentActivity.map((item) => ({
      id: String(item._id), summary: item.summary, action: item.action,
      actorEmail: item.actorEmail, createdAt: item.createdAt?.toISOString() ?? "",
    })),
  };
}
