import { notFound, redirect } from "next/navigation";
import { ProposalWorkspace } from "@/components/proposals/proposal-workspace";
import { getProposalApplication } from "@/lib/proposals";
import { getAssistanceServiceConfig, formatServicePrice } from "@/lib/service-request-config";
import { connectToDatabase } from "@/lib/db";
import { UserProfile } from "@/models/UserProfile";
import { requireApprovedIdentityForPage } from "@/lib/dashboard-access";
export const instant = false;
export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) { const session = await requireApprovedIdentityForPage(); const proposal = await getProposalApplication((await params).id); if (!proposal) notFound(); if (!proposal.setupCompleted) redirect(`/dashboard/proposals/${proposal.id}/setup`); await connectToDatabase(); const profile = await UserProfile.findOne({ userId: session.user.id }).lean(); const review = getAssistanceServiceConfig("proposal_review", profile?.applicantType); const writing = getAssistanceServiceConfig("proposal_writing", profile?.applicantType); const workspace = { ...proposal, assistance: { initialWhatsapp: String(profile?.whatsappNumber || ""), services: { proposal_review: { configured: review.enabled, price: review.amount && review.currency ? formatServicePrice(review.amount, review.currency) : null, unavailableReason: review.unavailableReason }, proposal_writing: { configured: writing.enabled, price: writing.amount && writing.currency ? formatServicePrice(writing.amount, writing.currency) : null, unavailableReason: writing.unavailableReason } } } }; return <ProposalWorkspace initial={workspace} />; }
