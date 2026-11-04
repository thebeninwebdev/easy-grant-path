import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, SearchX, Sparkles } from 'lucide-react';
import { redirect } from 'next/navigation';
import { DirectoryFilters } from '@/components/opportunities/directory-filters';
import { MatchedOpportunityCard } from '@/components/opportunities/matched-opportunity-card';
import { Button } from '@/components/ui/button';
import { getMatchedOpportunityCandidates, type MatchedOpportunity } from '@/lib/dashboard-data';
import { getPublicOpportunities, parsePublicOpportunityFilters, PUBLIC_OPPORTUNITIES_PAGE_SIZE, type PublicOpportunity } from '@/lib/public-opportunities';
import { listSavedOpportunityIds } from '@/lib/saved-opportunities';
import { getDevelopmentProfile, hasActiveAccess, isRegistrationProfileComplete } from '@/lib/user-profile';

export const metadata: Metadata = { title: 'Discover opportunities' };
export const instant = false;

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function includes(value: string, query: string) { return value.toLowerCase().includes(query.toLowerCase()); }
function deadlineTime(item: PublicOpportunity) { return item.deadline ? new Date(item.deadline).getTime() : Number.MAX_SAFE_INTEGER; }

function filterMatches(items: MatchedOpportunity[], filters: ReturnType<typeof parsePublicOpportunityFilters>) {
  const now = Date.now();
  const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999).getTime();
  return items.filter(({ opportunity }) => {
    if (filters.search && !includes([opportunity.title, opportunity.agency, opportunity.organization, opportunity.summary].filter(Boolean).join(' '), filters.search)) return false;
    if (filters.type && opportunity.type !== filters.type) return false;
    if (filters.country && !includes([...opportunity.countries, ...opportunity.eligibleCountries].join(' '), filters.country)) return false;
    if (filters.sector && !includes(opportunity.sectors.join(' '), filters.sector)) return false;
    const deadline = opportunity.deadline ? new Date(opportunity.deadline).getTime() : null;
    if (filters.deadline === 'none' && deadline !== null) return false;
    if (filters.deadline === 'closing-soon' && (!deadline || deadline < now || deadline > now + 14 * 86_400_000)) return false;
    if (filters.deadline === 'next-30-days' && (!deadline || deadline < now || deadline > now + 30 * 86_400_000)) return false;
    if (filters.deadline === 'this-month' && (!deadline || deadline < now || deadline > monthEnd)) return false;
    return true;
  });
}

function pageHref(params: Record<string, string | string[] | undefined>, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) { const item = first(value); if (item && key !== 'page') query.set(key, item); }
  if (page > 1) query.set('page', String(page));
  return `/dashboard/opportunities?${query}`;
}

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const filters = parsePublicOpportunityFilters(params);
  const matches = first(params.view) === 'matches';
  const profile = await getDevelopmentProfile();
  if (!profile || !isRegistrationProfileComplete(profile)) redirect('/dashboard/onboarding');
  if (!hasActiveAccess(profile)) redirect('/dashboard/teaser');
  const savedPromise = listSavedOpportunityIds();
  let items: Array<{ opportunity: PublicOpportunity; match?: MatchedOpportunity['match'] }>;
  let total: number;
  if (matches) {
    let ranked = filterMatches(await getMatchedOpportunityCandidates(profile), filters);
    const requestedSort = first(params.sort);
    if (requestedSort === 'deadline') ranked = ranked.sort((a, b) => deadlineTime(a.opportunity) - deadlineTime(b.opportunity));
    if (requestedSort === 'newest') ranked = ranked.slice().reverse();
    if (requestedSort === 'funding-high') ranked = ranked.sort((a, b) => (b.opportunity.fundingMax || 0) - (a.opportunity.fundingMax || 0));
    total = ranked.length;
    items = ranked.slice((filters.page - 1) * PUBLIC_OPPORTUNITIES_PAGE_SIZE, filters.page * PUBLIC_OPPORTUNITIES_PAGE_SIZE);
  } else {
    const data = await getPublicOpportunities(filters);
    total = data.total;
    items = data.items.map((opportunity) => ({ opportunity }));
  }
  const saved = new Set(await savedPromise);
  const totalPages = Math.max(1, Math.ceil(total / PUBLIC_OPPORTUNITIES_PAGE_SIZE));
  return <main className='mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8'>
    <header><div className='flex items-center gap-2 text-sm font-medium text-primary'>{matches ? <Sparkles className='size-4' /> : null}{matches ? 'Personalized discovery' : 'Opportunity directory'}</div><h1 className='mt-2 text-3xl font-semibold tracking-tight'>{matches ? 'My Matches' : 'Discover Opportunities'}</h1><p className='mt-2 max-w-2xl text-muted-foreground'>{matches ? 'Opportunities ranked against your country, applicant type, interests, and funding preferences.' : 'Browse verified funding opportunities from trusted sources.'}</p>
      <div className='mt-4 flex gap-2'><Button asChild size='sm' variant={matches ? 'outline' : 'default'}><Link href='/dashboard/opportunities'>Browse all</Link></Button><Button asChild size='sm' variant={matches ? 'default' : 'outline'}><Link href='/dashboard/opportunities?view=matches'>My matches</Link></Button></div>
    </header>
    <div className='mt-7'><DirectoryFilters filters={filters} matches={matches} /></div>
    <div className='mt-6 flex items-center justify-between'><p className='text-sm text-muted-foreground'>{total.toLocaleString()} {matches ? 'potential matches' : 'verified opportunities'}</p>{totalPages > 1 ? <p className='text-xs text-muted-foreground'>Page {filters.page} of {totalPages}</p> : null}</div>
    {items.length ? <div className='mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3'>{items.map(({ opportunity, match }) => <MatchedOpportunityCard key={opportunity.id} opportunity={opportunity} match={match} saved={saved.has(opportunity.id)} />)}</div> : <div className='mt-4 rounded-2xl border border-dashed bg-card px-6 py-16 text-center'><SearchX className='mx-auto size-9 text-muted-foreground/60' /><h2 className='mt-4 font-semibold'>{matches ? `We haven't found a strong match for your profile yet.` : 'No opportunities match your search.'}</h2><p className='mx-auto mt-2 max-w-md text-sm text-muted-foreground'>Try updating your preferences or explore all available opportunities.</p><div className='mt-5 flex justify-center gap-2'><Button asChild variant='outline'><Link href='/dashboard/settings'>Edit preferences</Link></Button>{matches ? <Button asChild><Link href='/dashboard/opportunities'>Browse all</Link></Button> : null}</div></div>}
    {totalPages > 1 ? <nav className='mt-7 flex items-center justify-between rounded-xl border bg-card p-3' aria-label='Opportunity pagination'><Button asChild={filters.page > 1} variant='outline' size='sm' disabled={filters.page <= 1}>{filters.page > 1 ? <Link href={pageHref(params, filters.page - 1)}><ChevronLeft className='size-4' /> Previous</Link> : <span>Previous</span>}</Button><span className='text-sm text-muted-foreground'>Page {filters.page} of {totalPages}</span><Button asChild={filters.page < totalPages} variant='outline' size='sm' disabled={filters.page >= totalPages}>{filters.page < totalPages ? <Link href={pageHref(params, filters.page + 1)}>Next <ChevronRight className='size-4' /></Link> : <span>Next</span>}</Button></nav> : null}
  </main>;
}
