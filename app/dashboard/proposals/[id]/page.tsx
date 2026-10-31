import { notFound } from "next/navigation";
import { getProposalApplication } from "@/lib/proposals";
import { ProposalWorkspace } from "@/components/proposals/proposal-workspace";
export const instant = false;
export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) { const proposal = await getProposalApplication((await params).id); if (!proposal) notFound(); return <ProposalWorkspace initial={proposal} />; }
