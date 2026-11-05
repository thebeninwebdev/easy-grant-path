import Link from "next/link";
import { ProposalReviewCheckout } from "@/components/services/proposal-review-checkout";
import { getCurrentSession } from "@/lib/development-user";
import { connectToDatabase } from "@/lib/db";
import { getProposalReviewConfig, formatServicePrice } from "@/lib/service-request-config";
import { UserProfile } from "@/models/UserProfile";
export const instant = false;
export default async function ProposalReviewPage() { const session = await getCurrentSession(); await connectToDatabase(); const profile = session ? await UserProfile.findOne({ userId: session.user.id }).lean() : null; const config = getProposalReviewConfig(); return <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6"><Link href="/dashboard/proposals" className="text-sm text-muted-foreground hover:text-foreground hover:underline">Back to proposals</Link><div className="mt-6"><ProposalReviewCheckout configured={config.enabled} environment={config.environment} price={config.amount && config.currency ? formatServicePrice(config.amount, config.currency) : null} initialWhatsapp={String(profile?.whatsappNumber || "")} /></div></main>; }