import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, FileText, SearchX, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { OpportunityFilters } from "@/components/opportunities/opportunity-filters";
import { getPublicOpportunities, parsePublicOpportunityFilters } from "@/lib/public-opportunities";
import { listProposalApplications } from "@/lib/proposals";

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
  const [data, proposals] = await Promise.all([getPublicOpportunities(filters), listProposalApplications()]);
  const hasFilters = Boolean(filters.search || filters.type || filters.country || filters.sector || filters.deadline);
  return <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
    <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><Link href="/" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> EasyGrantPath</Link><div className="flex items-start gap-3"><div className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="size-5" /></div><div><h1 className="text-3xl font-semibold tracking-tight">Verified opportunities</h1><p className="mt-2 max-w-2xl text-muted-foreground">Discover funding opportunities reviewed by EasyGrantPath before being listed.</p></div></div></div><Badge variant="outline" className="w-fit gap-1.5 py-1.5"><ShieldCheck className="size-3.5 text-primary" /> Reviewed by EasyGrantPath</Badge></header>
    {proposals.length ? <section className="mb-7 rounded-2xl border bg-card p-5 shadow-sm"><div className="flex items-center gap-2"><FileText className="size-5 text-primary" /><h2 className="text-lg font-semibold">My Proposals</h2></div><div className="mt-4 grid gap-3 md:grid-cols-2">{proposals.slice(0, 4).map((proposal) => <div key={proposal.id} className="flex items-center justify-between gap-4 rounded-xl border p-4"><div className="min-w-0"><p className="truncate font-medium">{proposal.opportunityTitle}</p><div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Badge variant={proposal.status === "completed" ? "default" : "secondary"}>{proposal.status}</Badge><span>{proposal.progress}% complete</span><span>Updated {proposal.updatedAt ? new Date(proposal.updatedAt).toLocaleDateString() : "recently"}</span></div></div><Button asChild size="sm" variant="outline"><Link href={`/dashboard/proposals/${proposal.id}`}>{proposal.status === "completed" ? "View" : "Continue"}</Link></Button></div>)}</div></section> : null}
    <OpportunityFilters values={{ q: filters.search, type: filters.type, country: filters.country, sector: filters.sector, deadline: filters.deadline, sort: filters.sort }} />
    <div className="mt-7 flex items-center justify-between"><p className="text-sm text-muted-foreground">{data.total.toLocaleString()} verified {data.total === 1 ? "opportunity" : "opportunities"}{hasFilters ? " matching your filters" : ""}</p>{data.totalPages > 1 ? <p className="text-xs text-muted-foreground">Page {data.page} of {data.totalPages}</p> : null}</div>
    {data.items.length ? <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{data.items.map((item) => <OpportunityCard key={item.id} opportunity={item} />)}</div> : <div className="mt-4 rounded-xl border border-dashed bg-card px-6 py-16 text-center"><SearchX className="mx-auto size-9 text-muted-foreground/60" /><h2 className="mt-4 font-semibold">{hasFilters ? "No opportunities match your search." : "No verified opportunities are available yet."}</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Try changing your search or filters, or check back after more opportunities are reviewed.</p>{hasFilters ? <Button asChild variant="outline" className="mt-5"><Link href="/dashboard">Reset filters</Link></Button> : null}</div>}
    {data.totalPages > 1 ? <nav className="mt-7 flex items-center justify-between rounded-xl border bg-card p-3" aria-label="Opportunity pagination"><Button asChild={data.page > 1} variant="outline" size="sm" disabled={data.page <= 1}>{data.page > 1 ? <Link href={pageHref(filters, data.page - 1)}><ChevronLeft className="size-4" /> Previous</Link> : <span><ChevronLeft className="size-4" /> Previous</span>}</Button><span className="text-sm text-muted-foreground">Page {data.page} of {data.totalPages}</span><Button asChild={data.page < data.totalPages} variant="outline" size="sm" disabled={data.page >= data.totalPages}>{data.page < data.totalPages ? <Link href={pageHref(filters, data.page + 1)}>Next <ChevronRight className="size-4" /></Link> : <span>Next <ChevronRight className="size-4" /></span>}</Button></nav> : null}
  </main>;
}
