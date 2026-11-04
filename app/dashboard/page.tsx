import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Bookmark, CalendarClock, CheckCircle2, FileText, MapPin, Settings, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { formatDate, humanize } from '@/components/admin/opportunities/opportunity-formatters';
import { MatchedOpportunityCard } from '@/components/opportunities/matched-opportunity-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getDashboardOpportunityData } from '@/lib/dashboard-data';
import { isOrganizationApplicantType } from '@/lib/applicant-types';
import { applicantName, countryName, interestName } from '@/lib/opportunity-matching';
import { listProposalApplications } from '@/lib/proposals';
import { listSavedOpportunityIds } from '@/lib/saved-opportunities';
import { firstName, getDevelopmentProfile, hasActiveAccess, isRegistrationProfileComplete } from '@/lib/user-profile';
import { getIdentityVerification, getOrganizationVerification } from '@/lib/verification';

export const metadata: Metadata = { title: 'Dashboard overview' };
export const instant = false;

function daysRemaining(value: string) {
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
  return days === 0 ? 'Due today' : days === 1 ? '1 day remaining' : `${days} days remaining`;
}

function Metric({ icon: Icon, label, value, note }: { icon: typeof Target; label: string; value: number; note: string }) {
  return <Card><CardContent className='flex items-center gap-4 p-5'><span className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'><Icon className='size-5' /></span><div><p className='text-2xl font-semibold'>{value}</p><p className='text-sm font-medium'>{label}</p><p className='mt-0.5 text-xs text-muted-foreground'>{note}</p></div></CardContent></Card>;
}

function FundingProfile({ profile }: { profile: NonNullable<Awaited<ReturnType<typeof getDevelopmentProfile>>> }) {
  return <Card><CardContent className='p-5'><div className='flex items-center justify-between gap-3'><h2 className='font-semibold'>Your Funding Profile</h2><Button asChild size='sm' variant='ghost'><Link href='/dashboard/settings'>Edit</Link></Button></div>
    <div className='mt-4 space-y-3 text-sm'><p className='flex items-center gap-2'><MapPin className='size-4 text-muted-foreground' /><span className='text-muted-foreground'>Country</span><span className='ml-auto font-medium'>{countryName(profile.countryCode)}</span></p><p className='flex items-center gap-2'><Target className='size-4 text-muted-foreground' /><span className='text-muted-foreground'>Applicant</span><span className='ml-auto font-medium'>{applicantName(profile.applicantType)}</span></p></div>
    <div className='mt-4'><p className='text-xs font-medium text-muted-foreground'>Interests</p><div className='mt-2 flex flex-wrap gap-1.5'>{profile.interests.map((item) => <Badge key={item} variant='secondary'>{interestName(item)}</Badge>)}</div></div>
    <div className='mt-4'><p className='text-xs font-medium text-muted-foreground'>Looking for</p><div className='mt-2 flex flex-wrap gap-1.5'>{profile.opportunityTypes.map((item) => <Badge key={item} variant='outline'>{humanize(item)}</Badge>)}</div></div>
  </CardContent></Card>;
}

function VerificationCard({ status, note, href, organization }: { status: string; note?: string | null; href: string; organization: boolean }) {
  const verified = status === 'verified';
  const pending = status === 'pending';
  const action = status === 'action_required' || status === 'rejected';
  return <Card><CardContent className='p-5'><div className='flex items-start gap-3'><span className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>{verified ? <CheckCircle2 className='size-4' /> : <ShieldCheck className='size-4' />}</span><div><h2 className='font-semibold'>{organization ? 'Organization verification' : 'Identity verification'}</h2><p className='mt-1 text-sm text-muted-foreground'>{verified ? 'Verified' : pending ? 'Under review' : action ? 'Action required' : 'Not started'}</p></div></div>
    {!verified ? <><p className='mt-4 text-sm leading-6 text-muted-foreground'>{action ? note || 'Review the note and resubmit your documents.' : pending ? 'Your documents are being reviewed.' : 'Complete verification before using assisted application services.'}</p><Button asChild className='mt-4 w-full' variant={action ? 'default' : 'outline'}><Link href={href}>{action ? 'Review and resubmit' : pending ? 'View status' : 'Start verification'}</Link></Button></> : null}
  </CardContent></Card>;
}

function EmptyState({ title, description, href, action }: { title: string; description: string; href?: string; action?: string }) {
  return <div className='mt-4 rounded-2xl border border-dashed bg-card px-5 py-10 text-center'><Bookmark className='mx-auto size-7 text-muted-foreground/60' /><h3 className='mt-3 font-semibold'>{title}</h3><p className='mx-auto mt-1 max-w-md text-sm text-muted-foreground'>{description}</p>{href && action ? <Button asChild className='mt-4' variant='outline'><Link href={href}>{action}</Link></Button> : null}</div>;
}

function relativeDate(value: string | null) {
  if (!value) return 'Recently';
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  return days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days} days ago`;
}

export default async function DashboardPage() {
  const profile = await getDevelopmentProfile();
  if (!profile || !isRegistrationProfileComplete(profile)) redirect('/dashboard/onboarding');
  if (!hasActiveAccess(profile)) redirect('/dashboard/teaser');
  const organizationApplicant = isOrganizationApplicantType(profile.applicantType);
  const [opportunityData, proposals, savedIds, verification] = await Promise.all([
    getDashboardOpportunityData(profile),
    listProposalApplications(),
    listSavedOpportunityIds(),
    organizationApplicant ? getOrganizationVerification() : getIdentityVerification(),
  ]);
  const saved = new Set(savedIds);
  const activeProposal = proposals.filter((proposal) => proposal.status !== 'completed').sort((a, b) => {
    const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
    const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
    return aDeadline - bDeadline || new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
  })[0];
  const verificationRecord = organizationApplicant
    ? verification && 'profile' in verification ? verification.profile : null
    : verification && !('profile' in verification) ? verification : null;
  const verificationStatus = verificationRecord?.verificationStatus || 'unverified';
  const verificationHref = organizationApplicant ? '/dashboard/verification/organization' : '/dashboard/verification/identity';
  const verificationNote = verificationRecord?.reviewNote || verificationRecord?.rejectionReason;

  return <main className='mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8'>
    <header className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
      <div><p className='text-sm font-medium text-primary'>Your funding workspace</p><h1 className='mt-1 text-3xl font-semibold tracking-tight'>Welcome, {firstName(profile.fullName)}</h1><p className='mt-2 text-muted-foreground'>Discover funding opportunities that match your goals.</p></div>
      <Button asChild variant='outline'><Link href='/dashboard/settings'><Settings className='size-4' /> Edit profile</Link></Button>
    </header>

    {activeProposal ? <section className='mt-7 rounded-2xl border border-primary/20 bg-primary/[0.04] p-5 sm:p-6'>
      <div className='flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between'><div className='min-w-0'><div className='flex items-center gap-2 text-sm font-semibold text-primary'><FileText className='size-4' /> Continue your proposal</div><h2 className='mt-2 truncate text-xl font-semibold'>{activeProposal.proposalMetadata.projectTitle || activeProposal.opportunityTitle}</h2><p className='mt-1 truncate text-sm text-muted-foreground'>{activeProposal.opportunityTitle}</p><div className='mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground'><span>{activeProposal.progress}% complete</span><span>Updated {relativeDate(activeProposal.updatedAt)}</span>{activeProposal.deadline ? <span>Deadline {formatDate(activeProposal.deadline)}</span> : null}</div><div className='mt-2 h-2 max-w-xl overflow-hidden rounded-full bg-primary/10'><div className='h-full rounded-full bg-primary' style={{ width: `${activeProposal.progress}%` }} /></div></div><Button asChild><Link href={`/dashboard/proposals/${activeProposal.id}`}>Continue writing <ArrowRight className='size-4' /></Link></Button></div>
    </section> : <section className='mt-7 flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6'><div><h2 className='font-semibold'>Ready to start a proposal?</h2><p className='mt-1 text-sm text-muted-foreground'>Find a suitable opportunity and use its Proposal Starter.</p></div><Button asChild><Link href='/dashboard/opportunities'>Explore opportunities</Link></Button></section>}

    <section className='mt-7 grid gap-4 sm:grid-cols-3' aria-label='Overview metrics'>
      <Metric icon={Target} label='Potential Matches' value={opportunityData.potentialMatchCount} note='Based on your funding profile' />
      <Metric icon={CalendarClock} label='Closing Soon' value={opportunityData.closingSoonCount} note='Relevant deadlines within 14 days' />
      <Metric icon={FileText} label='My Proposals' value={proposals.length} note={proposals.length ? 'Started proposal workspaces' : 'No proposals started yet'} />
    </section>

    <section className='mt-9'><div className='flex items-end justify-between gap-4'><div><div className='flex items-center gap-2'><Sparkles className='size-5 text-primary' /><h2 className='text-xl font-semibold'>Recommended for you</h2></div><p className='mt-1 text-sm text-muted-foreground'>Funding opportunities selected based on your profile.</p></div><Link href='/dashboard/opportunities?view=matches' className='hidden text-sm font-medium text-primary hover:underline sm:block'>View all matches</Link></div>
      {opportunityData.recommendations.length ? <div className='mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3'>{opportunityData.recommendations.map(({ opportunity, match }) => <MatchedOpportunityCard key={opportunity.id} opportunity={opportunity} match={match} saved={saved.has(opportunity.id)} />)}</div> : <EmptyState title='No matching opportunities yet.' description='Try updating your interests or explore all available opportunities.' href='/dashboard/settings' action='Edit preferences' />}
      <Link href='/dashboard/opportunities?view=matches' className='mt-4 inline-flex text-sm font-medium text-primary hover:underline sm:hidden'>View all matches</Link>
    </section>

    <div className='mt-9 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]'>
      <section><h2 className='text-xl font-semibold'>Closing soon</h2><p className='mt-1 text-sm text-muted-foreground'>Relevant opportunities that need your attention.</p>
        {opportunityData.closingSoon.length ? <div className='mt-4 divide-y rounded-2xl border bg-card'>{opportunityData.closingSoon.map(({ opportunity }) => <div key={opportunity.id} className='flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between'><div className='min-w-0'><p className='truncate font-medium'>{opportunity.title}</p><p className='mt-1 text-sm text-muted-foreground'>{formatDate(opportunity.deadline)} · {opportunity.deadline ? daysRemaining(opportunity.deadline) : ''}</p></div><Button asChild size='sm' variant='outline'><Link href={`/dashboard/opportunities/${opportunity.slug}`}>View details</Link></Button></div>)}</div> : <EmptyState title='No upcoming deadlines need your attention.' description='Your matched opportunities do not close within the next 14 days.' />}
      </section>
      <div className='space-y-6'>
        <FundingProfile profile={profile} />
        <VerificationCard status={verificationStatus} note={verificationNote} href={verificationHref} organization={organizationApplicant} />
      </div>
    </div>
  </main>;
}
