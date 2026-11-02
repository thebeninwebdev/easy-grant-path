import { notFound } from "next/navigation";
import { ProposalSetupForm } from "@/components/proposals/proposal-setup-form";
import { getProposalApplication } from "@/lib/proposals";
import { getDevelopmentProfile } from "@/lib/user-profile";
import { getOrganizationProfile } from "@/lib/organization-profile";
export const instant = false;
export default async function ProposalSetupPage({ params }: { params: Promise<{ id: string }> }) { const proposal = await getProposalApplication((await params).id); if (!proposal) notFound(); const [profile, organization] = await Promise.all([getDevelopmentProfile(), getOrganizationProfile()]); const metadata = proposal.proposalMetadata; return <ProposalSetupForm proposal={{ ...proposal, proposalMetadata: { ...metadata, applicantType: metadata.applicantType || profile?.applicantType || "individual", applicantName: metadata.applicantName || profile?.fullName || "", applicantOrganization: metadata.applicantOrganization || organization?.name || "", contactPerson: metadata.contactPerson || profile?.fullName || "" } }} />; }
