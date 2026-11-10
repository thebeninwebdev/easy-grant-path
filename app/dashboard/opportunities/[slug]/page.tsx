import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, ExternalLink, FilePenLine, Landmark, LockKeyhole } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OpportunityRichContent } from "@/components/opportunities/opportunity-rich-content";
import { OpportunityFavicon } from "@/components/opportunities/opportunity-image";
import { ProposalStarterCard } from "@/components/proposals/proposal-starter-card";
import { SaveOpportunityButton } from '@/components/opportunities/save-opportunity-button';
import { ProfessionalProposalServices } from "@/components/services/professional-proposal-services";
import { formatCurrency, formatDate as formatLocalizedDate } from "@/lib/i18n-format";
import type { SupportedLocale } from "@/lib/config";
import { getPublicOpportunityBySlug } from "@/lib/public-opportunities";
import { getRegistrationOpportunity, type OpportunityPreview } from "@/lib/registration-opportunity";
import { getExistingApplicationForOpportunity, getPublishedTemplate } from "@/lib/proposals";
import { listSavedOpportunityIds } from '@/lib/saved-opportunities';
import { getDevelopmentProfile, hasActiveAccess, isRegistrationProfileComplete } from "@/lib/user-profile";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const locale = await getLocale() as SupportedLocale;
  const opportunity = await getPublicOpportunityBySlug((await params).slug, locale);
  const t = await getTranslations("Opportunities.meta");
  return { title: opportunity?.title ?? t("detail") };
}

async function LockedOpportunityDetail({ opportunity }: { opportunity: OpportunityPreview }) {
  const [t, common, locale] = await Promise.all([getTranslations("Opportunities"), getTranslations("Common"), getLocale() as Promise<SupportedLocale>]);
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/dashboard/teaser" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> {t("detail.backToPreview")}</Link>
      <header className="mt-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-2"><Badge className="gap-1 bg-emerald-100 text-emerald-800"><CheckCircle2 className="size-3" /> {t("detail.verifiedBy")}</Badge><Badge variant="outline">{t(("types." + opportunity.type) as never)}</Badge></div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{opportunity.title}</h1>
        <p className="mt-3 flex items-center gap-2 text-muted-foreground"><Landmark className="size-4" />{opportunity.organization || t("detail.orgNotProvided")}</p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">{t("detail.funding")}</p><p className="mt-1 font-semibold">{opportunity.fundingMax !== null || opportunity.fundingMin !== null ? formatCurrency(opportunity.fundingMax ?? opportunity.fundingMin!, opportunity.currency, locale) : common("notProvided")}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">{t("detail.deadline")}</p><p className="mt-1 flex items-center gap-1.5 font-semibold"><CalendarDays className="size-4" />{opportunity.deadline ? formatLocalizedDate(opportunity.deadline, locale) : common("noDeadline")}</p></div></div>
      </header>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card><CardContent className="p-6 sm:p-8"><h2 className="text-xl font-semibold">{t("detail.summary")}</h2><p className="mt-3 whitespace-pre-wrap leading-7 text-muted-foreground">{opportunity.summary || t("card.noSummary")}</p><div className="relative mt-8 overflow-hidden rounded-2xl border bg-muted/35 p-6"><div className="space-y-4 blur-[6px] select-none" aria-hidden="true"><div className="h-3 w-full rounded bg-muted-foreground/30" /><div className="h-3 w-11/12 rounded bg-muted-foreground/30" /><div className="h-3 w-full rounded bg-muted-foreground/30" /><div className="h-3 w-4/5 rounded bg-muted-foreground/30" /></div><div className="absolute inset-0 flex items-center justify-center bg-card/70 text-center"><div className="max-w-sm p-4"><LockKeyhole className="mx-auto size-6 text-primary" /><h2 className="mt-3 font-semibold">{t("detail.locked.title")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("detail.locked.description")}</p></div></div></div></CardContent></Card>
        <aside><Card><CardContent className="p-5"><h2 className="font-semibold">{t("detail.locked.unlockTitle")}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{t("detail.locked.unlockDesc")}</p><Button asChild className="mt-5 w-full"><Link href="/dashboard/activate"><LockKeyhole className="size-4" /> {t("detail.locked.unlockButton")}</Link></Button></CardContent></Card></aside>
      </div>
    </main>
  );
}

export default async function OpportunityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const [locale, t, common, profile] = await Promise.all([getLocale() as Promise<SupportedLocale>, getTranslations("Opportunities"), getTranslations("Common"), getDevelopmentProfile()]);
  if (!isRegistrationProfileComplete(profile)) redirect("/dashboard/onboarding");
  const slug = (await params).slug;

  if (!hasActiveAccess(profile)) {
    const match = await getRegistrationOpportunity(profile!);
    if (!match.opportunity || match.opportunity.slug !== slug) redirect("/dashboard/teaser");
    return <LockedOpportunityDetail opportunity={match.opportunity} />;
  }

  const opportunity = await getPublicOpportunityBySlug(slug, locale);
  if (!opportunity) notFound();
  const [template, existingApplicationId, savedIds] = await Promise.all([getPublishedTemplate(opportunity.id), getExistingApplicationForOpportunity(opportunity.id), listSavedOpportunityIds()]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-center gap-3"><OpportunityFavicon opportunity={opportunity} organization={opportunity.agency || opportunity.organization || t("detail.fundingOrganization")} className="size-14" /><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("detail.fundingOrganization")}</p><p className="font-medium">{opportunity.agency || opportunity.organization || t("detail.orgNotProvided")}</p></div></div>
      <Link href="/dashboard/opportunities" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> {t("detail.backToOpportunities")}</Link>
      <header className="mt-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8"><div className="flex flex-wrap items-center gap-2"><Badge className="gap-1 bg-emerald-100 text-emerald-800"><CheckCircle2 className="size-3" /> {t("detail.verifiedBy")}</Badge><Badge variant="outline">{t(("types." + opportunity.type) as never)}</Badge></div><h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{opportunity.title}</h1><p className="mt-3 flex items-center gap-2 text-muted-foreground"><Landmark className="size-4" />{opportunity.agency || opportunity.organization || t("detail.orgNotProvided")}</p><div className="mt-7 grid gap-4 sm:grid-cols-3"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">{t("detail.funding")}</p><p className="mt-1 font-semibold">{opportunity.fundingMax !== null || opportunity.fundingMin !== null ? formatCurrency(opportunity.fundingMax ?? opportunity.fundingMin!, opportunity.currency, locale) : common("notProvided")}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">{t("detail.deadline")}</p><p className="mt-1 flex items-center gap-1.5 font-semibold"><CalendarDays className="size-4" />{opportunity.deadline ? formatLocalizedDate(opportunity.deadline, locale) : common("noDeadline")}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">{t("detail.openingDate")}</p><p className="mt-1 font-semibold">{opportunity.openingDate ? formatLocalizedDate(opportunity.openingDate, locale) : common("notProvided")}</p></div></div></header>
      <div className='mt-5 flex justify-end'><SaveOpportunityButton opportunityId={opportunity.id} initiallySaved={savedIds.includes(opportunity.id)} /></div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]"><div className="space-y-6"><Card><CardContent className="p-6 sm:p-8">{opportunity.translationMissing ? <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{t(opportunity.sourceLanguage === "en" ? "detail.contentEnglishOnly" : "detail.contentOriginalOnly")}</p> : null}<section><h2 className="text-xl font-semibold">{t("detail.summary")}</h2><p className="mt-3 whitespace-pre-wrap leading-7 text-muted-foreground">{opportunity.summary || t("detail.noSummary")}</p></section><section className="mt-8 border-t pt-8"><h2 className="text-xl font-semibold">{t("detail.about")}</h2><OpportunityRichContent content={opportunity.description} className="mt-3" /></section></CardContent></Card></div><aside className="space-y-5">{template || existingApplicationId ? <ProposalStarterCard opportunityId={opportunity.id} existingApplicationId={existingApplicationId} templateId={template?.id} templateTitle={template?.title} generalTemplate={template?.scope === "general"} /> : <Card><CardContent className="p-5"><FilePenLine className="size-5 text-muted-foreground" /><h2 className="mt-3 font-semibold">{t("detail.proposalStarter.unavailable")}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{t("detail.proposalStarter.unavailableDesc")}</p><Button asChild className="mt-4 w-full" variant="outline"><Link href={"/dashboard/proposals/new?opportunityId=" + opportunity.id}>{t("detail.proposalStarter.openGuide")}</Link></Button></CardContent></Card>}<Card><CardContent className="p-5"><h2 className="font-semibold">{t("detail.needHelp")}</h2><p className="mt-2 text-sm text-muted-foreground">{t("detail.needHelpDesc")}</p><div className="mt-4"><ProfessionalProposalServices /></div></CardContent></Card><Card><CardContent className="p-5"><h2 className="font-semibold">{t("detail.eligibility")}</h2><div className="mt-4 space-y-4 text-sm"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("detail.eligibleCountries")}</p><p className="mt-1 leading-6">{opportunity.eligibleCountries.join(", ") || common("notSpecified")}</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("detail.applicantTypes")}</p><p className="mt-1 leading-6">{opportunity.applicantTypes.join(", ") || common("notSpecified")}</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("detail.sectors")}</p><p className="mt-1 leading-6">{opportunity.sectors.join(", ") || common("notSpecified")}</p></div></div></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t("detail.confirmRequirements")}</p>{opportunity.officialUrl ? <a className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90" href={opportunity.officialUrl} target="_blank" rel="noopener noreferrer">{t("detail.viewOfficial")} <ExternalLink className="size-4" /></a> : null}{opportunity.opportunityNumber ? <p className="mt-4 text-xs text-muted-foreground">{t("detail.opportunityNumber")}: <span className="font-medium text-foreground">{opportunity.opportunityNumber}</span></p> : null}</CardContent></Card></aside></div>
    </main>
  );
}
