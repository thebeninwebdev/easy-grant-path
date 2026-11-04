import type { Metadata } from 'next';
import Link from 'next/link';
import { Bookmark, CalendarDays, Landmark } from 'lucide-react';
import { redirect } from 'next/navigation';
import { formatDate, formatFunding, humanize } from '@/components/admin/opportunities/opportunity-formatters';
import { SaveOpportunityButton } from '@/components/opportunities/save-opportunity-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { listSavedOpportunities } from '@/lib/saved-opportunities';
import { getDevelopmentProfile, hasActiveAccess, isRegistrationProfileComplete } from '@/lib/user-profile';

export const metadata: Metadata = { title: 'Saved opportunities' };
export const instant = false;

export default async function SavedOpportunitiesPage() {
  const profile = await getDevelopmentProfile();
  if (!profile || !isRegistrationProfileComplete(profile)) redirect('/dashboard/onboarding');
  if (!hasActiveAccess(profile)) redirect('/dashboard/teaser');
  const items = await listSavedOpportunities();
  return <main className='mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8'><header><p className='text-sm font-medium text-primary'>Your shortlist</p><h1 className='mt-2 text-3xl font-semibold tracking-tight'>Saved Opportunities</h1><p className='mt-2 text-muted-foreground'>Keep promising opportunities close while you compare and prepare.</p></header>
    {items.length ? <div className='mt-7 grid gap-4'>{items.map((item) => { const closed = item.closed; return <Card key={item.bookmarkId}><CardContent className='flex flex-col gap-5 p-5 md:flex-row md:items-center'><div className='min-w-0 flex-1'><div className='flex flex-wrap gap-2'><Badge variant={closed ? 'secondary' : 'outline'}>{closed ? 'Closed' : humanize(item.status)}</Badge><Badge variant='outline'>{humanize(item.type)}</Badge></div><h2 className='mt-3 text-lg font-semibold'><Link href={`/dashboard/opportunities/${item.slug}`} className='hover:text-primary'>{item.title}</Link></h2><p className='mt-2 flex items-center gap-1.5 text-sm text-muted-foreground'><Landmark className='size-4' />{item.organization || 'Organization not provided'}</p><div className='mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground'><span>{formatFunding(item)}</span><span className='flex items-center gap-1'><CalendarDays className='size-4' />{formatDate(item.deadline)}</span></div></div><div className='flex shrink-0 gap-2'><SaveOpportunityButton opportunityId={item.id} initiallySaved /><Button asChild><Link href={`/dashboard/opportunities/${item.slug}`}>View details</Link></Button></div></CardContent></Card>; })}</div> : <div className='mt-7 rounded-2xl border border-dashed bg-card px-6 py-16 text-center'><Bookmark className='mx-auto size-9 text-muted-foreground/60' /><h2 className='mt-4 font-semibold'>Save interesting opportunities to find them here later.</h2><p className='mt-2 text-sm text-muted-foreground'>Use the bookmark action while browsing opportunities.</p><Button asChild className='mt-5'><Link href='/dashboard/opportunities'>Explore opportunities</Link></Button></div>}
  </main>;
}
