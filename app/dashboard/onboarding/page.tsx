import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { getDevelopmentProfile } from "@/lib/user-profile";
import { getOrganizationProfile } from "@/lib/organization-profile";
export const instant = false;
export default async function OnboardingPage() { const [profile, organization] = await Promise.all([getDevelopmentProfile(), getOrganizationProfile()]); return <OnboardingFlow profile={profile} organization={organization} />; }
