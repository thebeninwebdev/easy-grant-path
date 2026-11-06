import type { Metadata } from "next";
import Link from "next/link";
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
import { formatDate, formatFunding, humanize } from "@/components/admin/opportunities/opportunity-formatters";
import { getPublicOpportunityBySlug } from "@/lib/public-opportunities";
import { getRegistrationOpportunity, type OpportunityPreview } from "@/lib/registration-opportunity";
import { getExistingApplicationForOpportunity, getPublishedTemplate } from "@/lib/proposals";
import { listSavedOpportunityIds } from '@/lib/saved-opportunities';
import { getDevelopmentProfile, hasActiveAccess, isRegistrationProfileComplete } from "@/lib/user-profile";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const opportunity = await getPublicOpportunityBySlug((await params).slug);
  return { title: opportunity?.title ?? "Opportunity" };
}

function LockedOpportunityDetail({ opportunity }: { opportunity: OpportunityPreview }) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/dashboard/teaser" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back to preview</Link>
      <header className="mt-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-2"><Badge className="gap-1 bg-emerald-100 text-emerald-800"><CheckCircle2 className="size-3" /> Verified by EasyGrantPath</Badge><Badge variant="outline">{humanize(opportunity.type)}</Badge></div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{opportunity.title}</h1>
        <p className="mt-3 flex items-center gap-2 text-muted-foreground"><Landmark className="size-4" />{opportunity.organization || "Organization not provided"}</p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Funding</p><p className="mt-1 font-semibold">{formatFunding(opportunity)}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Deadline</p><p className="mt-1 flex items-center gap-1.5 font-semibold"><CalendarDays className="size-4" />{formatDate(opportunity.deadline)}</p></div></div>
      </header>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card><CardContent className="p-6 sm:p-8"><h2 className="text-xl font-semibold">Summary</h2><p className="mt-3 whitespace-pre-wrap leading-7 text-muted-foreground">{opportunity.summary || "A verified opportunity selected for your profile."}</p><div className="relative mt-8 overflow-hidden rounded-2xl border bg-muted/35 p-6"><div className="space-y-4 blur-[6px] select-none" aria-hidden="true"><div className="h-3 w-full rounded bg-muted-foreground/30" /><div className="h-3 w-11/12 rounded bg-muted-foreground/30" /><div className="h-3 w-full rounded bg-muted-foreground/30" /><div className="h-3 w-4/5 rounded bg-muted-foreground/30" /></div><div className="absolute inset-0 flex items-center justify-center bg-card/70 text-center"><div className="max-w-sm p-4"><LockKeyhole className="mx-auto size-6 text-primary" /><h2 className="mt-3 font-semibold">Full opportunity details are locked</h2><p className="mt-1 text-sm text-muted-foreground">Unlock eligibility, requirements, official links, and application tools.</p></div></div></div></CardContent></Card>
        <aside><Card><CardContent className="p-5"><h2 className="font-semibold">Unlock EasyGrantPath</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">See all verified opportunities and complete application details.</p><Button asChild className="mt-5 w-full"><Link href="/dashboard/activate"><LockKeyhole className="size-4" /> Unlock full access</Link></Button></CardContent></Card></aside>
      </div>
    </main>
  );
}

export default async function OpportunityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const profile = await getDevelopmentProfile();
  if (!isRegistrationProfileComplete(profile)) redirect("/dashboard/onboarding");
  const slug = (await params).slug;

  if (!hasActiveAccess(profile)) {
    const match = await getRegistrationOpportunity(profile!);
    if (!match.opportunity || match.opportunity.slug !== slug) redirect("/dashboard/teaser");
    return <LockedOpportunityDetail opportunity={match.opportunity} />;
  }

  const opportunity = await getPublicOpportunityBySlug(slug);
  if (!opportunity) notFound();
  const [template, existingApplicationId, savedIds] = await Promise.all([getPublishedTemplate(opportunity.id), getExistingApplicationForOpportunity(opportunity.id), listSavedOpportunityIds()]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-center gap-3"><OpportunityFavicon opportunity={opportunity} organization={opportunity.agency || opportunity.organization || "Funding organization"} className="size-14" /><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Funding organization</p><p className="font-medium">{opportunity.agency || opportunity.organization || "Organization not provided"}</p></div></div>
      <Link href="/dashboard/opportunities" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back to opportunities</Link>
      <header className="mt-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8"><div className="flex flex-wrap items-center gap-2"><Badge className="gap-1 bg-emerald-100 text-emerald-800"><CheckCircle2 className="size-3" /> Verified by EasyGrantPath</Badge><Badge variant="outline">{humanize(opportunity.type)}</Badge></div><h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{opportunity.title}</h1><p className="mt-3 flex items-center gap-2 text-muted-foreground"><Landmark className="size-4" />{opportunity.agency || opportunity.organization || "Organization not provided"}</p><div className="mt-7 grid gap-4 sm:grid-cols-3"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Funding</p><p className="mt-1 font-semibold">{formatFunding(opportunity)}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Deadline</p><p className="mt-1 flex items-center gap-1.5 font-semibold"><CalendarDays className="size-4" />{formatDate(opportunity.deadline)}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Opening date</p><p className="mt-1 font-semibold">{formatDate(opportunity.openingDate)}</p></div></div></header>
      <div className='mt-5 flex justify-end'><SaveOpportunityButton opportunityId={opportunity.id} initiallySaved={savedIds.includes(opportunity.id)} /></div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]"><div className="space-y-6"><Card><CardContent className="p-6 sm:p-8"><section><h2 className="text-xl font-semibold">Summary</h2><p className="mt-3 whitespace-pre-wrap leading-7 text-muted-foreground">{opportunity.summary || "No summary was supplied by the source."}</p></section><section className="mt-8 border-t pt-8"><h2 className="text-xl font-semibold">About this opportunity</h2><OpportunityRichContent content={opportunity.description} className="mt-3" /></section></CardContent></Card></div><aside className="space-y-5">{template || existingApplicationId ? <ProposalStarterCard opportunityId={opportunity.id} existingApplicationId={existingApplicationId} templateId={template?.id} templateTitle={template?.title} generalTemplate={template?.scope === "general"} /> : <Card><CardContent className="p-5"><FilePenLine className="size-5 text-muted-foreground" /><h2 className="mt-3 font-semibold">Proposal starter unavailable</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">No published opportunity-specific or suitable general template is available yet. You can review other templates in the proposal creation guide.</p><Button asChild className="mt-4 w-full" variant="outline"><Link href={"/dashboard/proposals/new?opportunityId=" + opportunity.id}>Open proposal guide</Link></Button></CardContent></Card>}<Card><CardContent className="p-5"><h2 className="font-semibold">Need Help With Your Application?</h2><p className="mt-2 text-sm text-muted-foreground">Get professional writing or review support from our team through WhatsApp.</p><div className="mt-4"><ProfessionalProposalServices /></div></CardContent></Card><Card><CardContent className="p-5"><h2 className="font-semibold">Eligibility</h2><div className="mt-4 space-y-4 text-sm"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Eligible countries</p><p className="mt-1 leading-6">{opportunity.eligibleCountries.join(", ") || "Not specified"}</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Applicant types</p><p className="mt-1 leading-6">{opportunity.applicantTypes.join(", ") || "Not specified"}</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sectors</p><p className="mt-1 leading-6">{opportunity.sectors.join(", ") || "Not specified"}</p></div></div></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Confirm requirements and deadlines with the issuing organization.</p>{opportunity.officialUrl ? <a className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90" href={opportunity.officialUrl} target="_blank" rel="noopener noreferrer">View official opportunity <ExternalLink className="size-4" /></a> : null}{opportunity.opportunityNumber ? <p className="mt-4 text-xs text-muted-foreground">Opportunity number: <span className="font-medium text-foreground">{opportunity.opportunityNumber}</span></p> : null}</CardContent></Card></aside></div>
    </main>
  );
}
