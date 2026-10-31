import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { getDevelopmentProfile } from "@/lib/user-profile";
export const instant = false;
export default async function OnboardingPage() { return <OnboardingFlow profile={await getDevelopmentProfile()} />; }
