import "server-only";
import { redirect } from "next/navigation";
import { hasAdminRole } from "@/lib/admin-auth";
import { getCurrentSession } from "@/lib/development-user";
import { AppError } from "@/lib/errors";
import { getIdentityVerificationForUserId } from "@/lib/verification";
import { isIdentityVerificationApproved, type VerificationStatus } from "@/lib/verification-policy";
/** Admins preview the dashboard as themselves; this never grants ownership of another user's records. */
export async function getDashboardAccess() { const session = await getCurrentSession(); return { session, isAdmin: hasAdminRole(session?.user.role) }; }
/** Customer verification has no role-based bypass, including administrators. */
export function canBypassCustomerDashboardGuards(_isAdmin: boolean) { return false; }

export { isIdentityVerificationApproved };

export async function getIdentityVerificationStatus(userId: string): Promise<VerificationStatus> {
  const record = await getIdentityVerificationForUserId(userId);
  return (record?.verificationStatus || "unverified") as VerificationStatus;
}

export async function assertIdentityVerificationApproved(userId: string) {
  const status = await getIdentityVerificationStatus(userId);
  if (!isIdentityVerificationApproved(status)) {
    throw new AppError(
      "Approved identity verification is required before continuing.",
      "IDENTITY_VERIFICATION_REQUIRED",
      403,
      { verificationStatus: status, verificationUrl: "/dashboard/verification/identity" },
    );
  }
  return status;
}

/** Customer page guard. Onboarding and verification pages intentionally do not call this. */
export async function requireApprovedIdentityForPage() {
  const session = await getCurrentSession();
  if (!session?.user.emailVerified) redirect("/sign-in");
  const status = await getIdentityVerificationStatus(session.user.id);
  if (!isIdentityVerificationApproved(status)) redirect("/dashboard/verification/identity");
  return session;
}

/** API guard. Admins retain their existing bypass; customer status is read from MongoDB on every request. */
export async function requireApprovedIdentityForApi() {
  const session = await getCurrentSession();
  if (!session) throw new AppError("Sign in required.", "UNAUTHORIZED", 401);
  if (!session.user.emailVerified) throw new AppError("Verify your email before continuing.", "EMAIL_NOT_VERIFIED", 403);
  await assertIdentityVerificationApproved(session.user.id);
  return session;
}
