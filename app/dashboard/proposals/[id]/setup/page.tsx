import { notFound } from "next/navigation";
import { ProposalSetupForm } from "@/components/proposals/proposal-setup-form";
import { getProposalApplication } from "@/lib/proposals";
export const instant = false;
export default async function ProposalSetupPage({ params }: { params: Promise<{ id: string }> }) { const proposal = await getProposalApplication((await params).id); if (!proposal) notFound(); return <ProposalSetupForm proposal={proposal} />; }
