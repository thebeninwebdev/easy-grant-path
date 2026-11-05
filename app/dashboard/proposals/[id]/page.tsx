import { notFound, redirect } from "next/navigation";
import { ProposalWorkspace } from "@/components/proposals/proposal-workspace";
import { getCurrentSession } from "@/lib/development-user";
import { getProposalApplication } from "@/lib/proposals";
import { getAssistanceServiceConfig, formatServicePrice } from "@/lib/service-request-config";
import { connectToDatabase } from "@/lib/db";
import { UserProfile } from "@/models/UserProfile";
export const instant = false;
export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) { const proposal = await getProposalApplication((await params).id); if (!proposal) notFound(); if (!proposal.setupCompleted) redirect(`/dashboard/proposals/${proposal.id}/setup`); const session = await getCurrentSession(); await connectToDatabase(); const profile = session ? await UserProfile.findOne({ userId: session.user.id }).lean() : null; const review = getAssistanceServiceConfig("proposal_review"); const writing = getAssistanceServiceConfig("proposal_writing"); const workspace = { ...proposal, assistance: { initialWhatsapp: String(profile?.whatsappNumber || ""), services: { proposal_review: { configured: review.enabled, price: review.amount && review.currency ? formatServicePrice(review.amount, review.currency) : null }, proposal_writing: { configured: writing.enabled, price: writing.amount && writing.currency ? formatServicePrice(writing.amount, writing.currency) : null } } } }; return <ProposalWorkspace initial={workspace} />; }
