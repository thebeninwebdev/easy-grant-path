import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { getDevelopmentProfile, hasActiveAccess, isRegistrationProfileComplete } from "@/lib/user-profile";
import { getCurrentSession } from "@/lib/development-user";
import { hasAdminRole } from "@/lib/admin-auth";
import { getIdentityVerificationStatus, isIdentityVerificationApproved } from "@/lib/dashboard-access";

export const instant = false;
export default async function RegistrationPage() {
  const [profile, session] = await Promise.all([getDevelopmentProfile(), getCurrentSession()]);
  if (isRegistrationProfileComplete(profile) && session) {
    const approved = hasAdminRole(session.user.role) || isIdentityVerificationApproved(await getIdentityVerificationStatus(session.user.id));
    if (!approved) redirect("/dashboard/verification/identity");
    redirect(hasActiveAccess(profile) ? "/dashboard" : "/dashboard/teaser");
  }
  return <OnboardingFlow profile={profile} accountName={session?.user.name || ""} />;
}
