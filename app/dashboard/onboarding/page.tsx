import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { getDevelopmentProfile, hasActiveAccess, isRegistrationProfileComplete } from "@/lib/user-profile";
import { getCurrentSession } from "@/lib/development-user";

export const instant = false;
export default async function RegistrationPage() {
  const [profile, session] = await Promise.all([getDevelopmentProfile(), getCurrentSession()]);
  if (hasActiveAccess(profile)) redirect("/dashboard");
  if (isRegistrationProfileComplete(profile)) redirect("/dashboard/teaser");
  return <OnboardingFlow profile={profile} accountName={session?.user.name || ""} />;
}
