import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, FilePenLine } from 'lucide-react';
import { redirect } from 'next/navigation';
import { formatDate } from '@/components/admin/opportunities/opportunity-formatters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { listProposalApplications } from '@/lib/proposals';
import { getDevelopmentProfile, hasActiveAccess, isRegistrationProfileComplete } from '@/lib/user-profile';

export const metadata: Metadata = { title: 'My proposals' };
export const instant = false;

export default async function ProposalsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const profile = await getDevelopmentProfile();
  if (!profile || !isRegistrationProfileComplete(profile)) redirect('/dashboard/onboarding');
  if (!hasActiveAccess(profile)) redirect('/dashboard/teaser');
  const selected = (await searchParams).status;
  const filter = selected === 'completed' ? 'completed' : selected === 'in-progress' ? 'in-progress' : 'all';
  const all = await listProposalApplications();
  const items = all.filter((item) => filter === 'all' || (filter === 'completed' ? item.status === 'completed' : item.status !== 'completed'));
  return (
    <main className='mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8'>
      <header>
        <p className='text-sm font-medium text-primary'>Application preparation</p>
        <h1 className='mt-2 text-3xl font-semibold tracking-tight'>My Proposals</h1>
        <p className='mt-2 text-muted-foreground'>Continue writing, review completed work, and keep deadlines in view.</p>
        <div className='mt-5 flex flex-wrap gap-2'>
          {[['all', 'All'], ['in-progress', 'In progress'], ['completed', 'Completed']].map(([value, label]) => (
            <Button key={value} asChild size='sm' variant={filter === value ? 'default' : 'outline'}>
              <Link href={value === 'all' ? '/dashboard/proposals' : `/dashboard/proposals?status=${value}`}>{label}</Link>
            </Button>
          ))}
        </div>
      </header>
      {items.length ? (
        <div className='mt-7 grid gap-4'>
          {items.map((proposal) => (
            <Card key={proposal.id}>
              <CardContent className='flex flex-col gap-5 p-5 md:flex-row md:items-center'>
                <span className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                  {proposal.status === 'completed' ? <CheckCircle2 className='size-5' /> : <FilePenLine className='size-5' />}
                </span>
                <div className='min-w-0 flex-1'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Badge variant={proposal.status === 'completed' ? 'default' : 'secondary'}>{proposal.status === 'completed' ? 'Completed' : 'In progress'}</Badge>
                    <span className='text-xs text-muted-foreground'>Updated {proposal.updatedAt ? formatDate(proposal.updatedAt) : 'recently'}</span>
                  </div>
                  <h2 className='mt-2 truncate text-lg font-semibold'>{proposal.proposalMetadata.projectTitle || proposal.opportunityTitle}</h2>
                  <p className='mt-1 truncate text-sm text-muted-foreground'>{proposal.opportunityTitle} &middot; {proposal.fundingOrganization || 'Organization not provided'}</p>
                  <div className='mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground'>
                    <span>{proposal.progress}% complete</span>
                    {proposal.deadline ? <span>Deadline {formatDate(proposal.deadline)}</span> : <span>Deadline not provided</span>}
                  </div>
                  <div className='mt-2 h-1.5 max-w-lg overflow-hidden rounded-full bg-muted'><div className='h-full rounded-full bg-primary' style={{ width: `${proposal.progress}%` }} /></div>
                </div>
                <Button asChild><Link href={`/dashboard/proposals/${proposal.id}`}>{proposal.status === 'completed' ? 'View completed proposal' : 'Continue writing'}</Link></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className='mt-7 rounded-2xl border border-dashed bg-card px-6 py-16 text-center'>
          <FilePenLine className='mx-auto size-9 text-muted-foreground/60' />
          <h2 className='mt-4 font-semibold'>{all.length ? 'No proposals match this filter.' : `You haven't started a proposal yet.`}</h2>
          <p className='mt-2 text-sm text-muted-foreground'>Find an opportunity and use a proposal starter to begin.</p>
          <Button asChild className='mt-5'><Link href='/dashboard/opportunities'>Discover opportunities</Link></Button>
        </div>
      )}
    </main>
  );
}
