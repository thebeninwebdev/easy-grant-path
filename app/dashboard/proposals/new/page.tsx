import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProposalCreationForm } from "@/components/proposals/proposal-creation-form";
import { getProposalCreationOptions } from "@/lib/proposals";
import { getDevelopmentProfile, hasActiveAccess, isRegistrationProfileComplete } from "@/lib/user-profile";

export const metadata: Metadata = { title: "Create proposal" };
export const instant = false;

export default async function NewProposalPage({ searchParams }: { searchParams: Promise<{ opportunityId?: string }> }) {
  const profile = await getDevelopmentProfile();
  if (!profile || !isRegistrationProfileComplete(profile)) redirect("/dashboard/onboarding");
  if (!hasActiveAccess(profile)) redirect("/dashboard/teaser");
  const options = await getProposalCreationOptions();
  const requestedOpportunityId = (await searchParams).opportunityId;
  return <ProposalCreationForm options={options} initialOpportunityId={options.opportunities.some((item) => item.id === requestedOpportunityId) ? requestedOpportunityId : undefined} />;
}
