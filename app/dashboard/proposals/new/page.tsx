import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { ProposalCreationForm } from "@/components/proposals/proposal-creation-form";
import { getProposalCreationOptions } from "@/lib/proposals";
import { getDevelopmentProfile, hasActiveAccess, isRegistrationProfileComplete } from "@/lib/user-profile";
import type { SupportedLocale } from "@/lib/config";
export const instant = false;
export async function generateMetadata(): Promise<Metadata> { const t = await getTranslations("Proposals.meta"); return { title: t("new") }; }
export default async function NewProposalPage({ searchParams }: { searchParams: Promise<{ opportunityId?: string }> }) {
  const [profile, locale, params] = await Promise.all([getDevelopmentProfile(), getLocale() as Promise<SupportedLocale>, searchParams]);
  if (!profile || !isRegistrationProfileComplete(profile)) redirect("/dashboard/onboarding");
  if (!hasActiveAccess(profile)) redirect("/dashboard/teaser");
  const options = await getProposalCreationOptions(locale);
  return <ProposalCreationForm options={options} initialOpportunityId={options.opportunities.some((item) => item.id === params.opportunityId) ? params.opportunityId : undefined} />;
}
