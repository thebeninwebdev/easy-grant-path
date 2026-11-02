import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, FileText, SearchX, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { OpportunityFilters } from "@/components/opportunities/opportunity-filters";
import { getPublicOpportunities, parsePublicOpportunityFilters } from "@/lib/public-opportunities";
import { listProposalApplications } from "@/lib/proposals";
import { firstName, getDevelopmentProfile, hasActiveAccess, isRegistrationProfileComplete, scoreOpportunity } from "@/lib/user-profile";
import { redirect } from "next/navigation";
import { getIdentityVerification, getOrganizationVerification } from "@/lib/verification";
import { isOrganizationApplicantType } from "@/lib/applicant-types";

export const metadata: Metadata = { title: "Verified opportunities" };
export const instant = false;

function pageHref(filters: ReturnType<typeof parsePublicOpportunityFilters>, page: number) {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.type) params.set("type", filters.type);
  if (filters.country) params.set("country", filters.country);
  if (filters.sector) params.set("sector", filters.sector);
  if (filters.deadline) params.set("deadline", filters.deadline);
  if (page > 1) params.set("page", String(page));
  return params.size ? `/dashboard?${params}` : "/dashboard";
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parsePublicOpportunityFilters(await searchParams);
  const profile = await getDevelopmentProfile();
  if (!profile) redirect("/dashboard/onboarding");
  if (!isRegistrationProfileComplete(profile)) redirect("/dashboard/onboarding");
  if (!hasActiveAccess(profile)) redirect("/dashboard/teaser");
  const [data, proposals, identity, organizationVerification] = await Promise.all([getPublicOpportunities(filters), listProposalApplications(), getIdentityVerification(), getOrganizationVerification()]);
  const personalizedItems = profile.onboardingCompleted ? data.items.slice().sort((a, b) => scoreOpportunity(b, profile) - scoreOpportunity(a, profile)) : data.items;
  const hasFilters = Boolean(filters.search || filters.type || filters.country || filters.sector || filters.deadline);
  const organizationApplicant = isOrganizationApplicantType(profile.applicantType);
  const verificationStatus = organizationApplicant ? organizationVerification.profile?.verificationStatus : identity?.verificationStatus;
  const verificationHref = organizationApplicant ? "/dashboard/verification/organization" : "/dashboard/verification/identity";
  const verificationTitle = organizationApplicant ? "Organization verification" : "Identity verification";
  const verificationAction = verificationStatus === "pending" ? "View verification" : organizationApplicant ? "Verify organization" : "Verify identity";
  const verificationNote = organizationApplicant ? organizationVerification.profile?.reviewNote : identity?.reviewNote;
  return <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
    <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><Link href="/" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> EasyGrantPath</Link><div className="flex items-start gap-3"><div className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="size-5" /></div><div><h1 className="text-3xl font-semibold tracking-tight">{profile.onboardingCompleted ? `Welcome, ${firstName(profile.fullName)}` : "Verified opportunities"}</h1><p className="mt-2 max-w-2xl text-muted-foreground">{profile.onboardingCompleted ? "Here are opportunities that match your profile." : "Discover funding opportunities reviewed by EasyGrantPath before being listed."}</p>{profile.onboardingCompleted ? <div className="mt-3 flex flex-wrap gap-2">{[profile.countryCode, profile.applicantType?.replaceAll("_", " "), ...profile.interests].filter(Boolean).map((item) => <span key={item} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{item}</span>)}<Link className="px-2.5 py-1 text-xs font-medium text-primary hover:underline" href="/dashboard/onboarding">Edit preferences</Link></div> : null}</div></div></div><Badge variant="outline" className="w-fit gap-1.5 py-1.5"><ShieldCheck className="size-3.5 text-primary" /> Reviewed by EasyGrantPath</Badge></header>
    <section className="mb-7 rounded-2xl border bg-card p-5 shadow-sm"><div className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /><h2 className="text-lg font-semibold">{verificationStatus === "action_required" ? "Action needed" : verificationStatus === "verified" ? (organizationApplicant ? "Organization verified" : "Identity verified") : verificationStatus === "pending" ? "Verification under review" : verificationTitle}</h2></div><p className="mt-2 text-sm text-muted-foreground">{verificationStatus === "action_required" ? verificationNote || "Please review the note and resubmit your documents." : verificationStatus === "verified" ? "Your verification has been reviewed." : verificationStatus === "pending" ? "We’ve received your document and are reviewing it." : "Complete verification to access assisted application services."} You can still browse all opportunities.</p>{verificationStatus !== "verified" ? <Button asChild className="mt-4" variant="outline"><Link href={verificationHref}>{verificationStatus === "action_required" ? "Resubmit documents" : verificationAction}</Link></Button> : null}</section>
    {proposals.length ? <section className="mb-7 rounded-2xl border bg-card p-5 shadow-sm"><div className="flex items-center gap-2"><FileText className="size-5 text-primary" /><h2 className="text-lg font-semibold">My Proposals</h2></div><div className="mt-4 grid gap-3 md:grid-cols-2">{proposals.slice(0, 4).map((proposal) => <div key={proposal.id} className="flex items-center justify-between gap-4 rounded-xl border p-4"><div className="min-w-0"><p className="truncate font-medium">{proposal.proposalMetadata.projectTitle || proposal.opportunityTitle}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{proposal.opportunityTitle}</p><div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Badge variant={proposal.status === "completed" ? "default" : "secondary"}>{proposal.status}</Badge><span>{proposal.progress}% complete</span><span>Updated {proposal.updatedAt ? new Date(proposal.updatedAt).toLocaleDateString() : "recently"}</span></div></div><Button asChild size="sm" variant="outline"><Link href={`/dashboard/proposals/${proposal.id}`}>{proposal.status === "completed" ? "View" : "Continue"}</Link></Button></div>)}</div></section> : null}
    <OpportunityFilters values={{ q: filters.search, type: filters.type, country: filters.country, sector: filters.sector, deadline: filters.deadline, sort: filters.sort }} />
    <div className="mt-7 flex items-center justify-between"><p className="text-sm text-muted-foreground">{data.total.toLocaleString()} verified {data.total === 1 ? "opportunity" : "opportunities"}{hasFilters ? " matching your filters" : ""}</p>{data.totalPages > 1 ? <p className="text-xs text-muted-foreground">Page {data.page} of {data.totalPages}</p> : null}</div>
    {personalizedItems.length ? <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{personalizedItems.map((item) => <OpportunityCard key={item.id} opportunity={item} />)}</div> : <div className="mt-4 rounded-xl border border-dashed bg-card px-6 py-16 text-center"><SearchX className="mx-auto size-9 text-muted-foreground/60" /><h2 className="mt-4 font-semibold">{hasFilters ? "No opportunities match your search." : "No verified opportunities are available yet."}</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Try changing your search or filters, or check back after more opportunities are reviewed.</p>{hasFilters ? <Button asChild variant="outline" className="mt-5"><Link href="/dashboard">Reset filters</Link></Button> : null}</div>}
    {data.totalPages > 1 ? <nav className="mt-7 flex items-center justify-between rounded-xl border bg-card p-3" aria-label="Opportunity pagination"><Button asChild={data.page > 1} variant="outline" size="sm" disabled={data.page <= 1}>{data.page > 1 ? <Link href={pageHref(filters, data.page - 1)}><ChevronLeft className="size-4" /> Previous</Link> : <span><ChevronLeft className="size-4" /> Previous</span>}</Button><span className="text-sm text-muted-foreground">Page {data.page} of {data.totalPages}</span><Button asChild={data.page < data.totalPages} variant="outline" size="sm" disabled={data.page >= data.totalPages}>{data.page < data.totalPages ? <Link href={pageHref(filters, data.page + 1)}>Next <ChevronRight className="size-4" /></Link> : <span>Next <ChevronRight className="size-4" /></span>}</Button></nav> : null}
  </main>;
}
