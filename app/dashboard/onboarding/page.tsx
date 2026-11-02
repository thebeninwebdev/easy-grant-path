import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { getDevelopmentProfile, hasActiveAccess, isRegistrationProfileComplete } from "@/lib/user-profile";
export default async function RegistrationPage() {
  const profile = await getDevelopmentProfile();
  if (hasActiveAccess(profile)) redirect("/dashboard");
  if (isRegistrationProfileComplete(profile)) redirect("/dashboard/teaser");
  return <OnboardingFlow profile={profile} />;
}
