'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Check, ChevronRight, KeyRound, LogOut, ShieldCheck, UserRound, WalletCards } from 'lucide-react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { isOrganizationApplicantType } from '@/lib/applicant-types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const countries = [['CI', "Cote d'Ivoire"], ['BJ', 'Benin'], ['BF', 'Burkina Faso'], ['GH', 'Ghana'], ['GN', 'Guinea'], ['ML', 'Mali'], ['NE', 'Niger'], ['NG', 'Nigeria'], ['SN', 'Senegal'], ['TG', 'Togo'], ['CM', 'Cameroon'], ['KE', 'Kenya'], ['ZA', 'South Africa']] as const;
const applicants = [['individual', 'Individual'], ['student', 'Student'], ['startup_sme', 'Startup / SME'], ['ngo_nonprofit', 'NGO / Nonprofit'], ['researcher_academic', 'Researcher / Academic'], ['community_organization', 'Community organization'], ['other', 'Other']] as const;
const interests = [['agriculture', 'Agriculture'], ['climate', 'Climate / Environment'], ['education', 'Education'], ['entrepreneurship', 'Entrepreneurship / SME'], ['health', 'Health'], ['technology', 'Technology / Innovation'], ['women_girls', 'Women and Girls'], ['youth', 'Youth Development'], ['community_development', 'Community Development'], ['research', 'Research'], ['leadership', 'Leadership'], ['scholarships_study', 'Scholarships / Study']] as const;
const opportunityTypes = [['grant', 'Grants'], ['fellowship', 'Fellowships'], ['scholarship', 'Scholarships'], ['accelerator', 'Training / Accelerators'], ['other', 'Other']] as const;
const goals = [['find_opportunities', 'Find opportunities'], ['check_eligibility', 'Check eligibility'], ['prepare_applications', 'Prepare applications'], ['write_proposals', 'Write proposals']] as const;
const organizationTypes = applicants.filter(([value]) => isOrganizationApplicantType(value));
const registrationStatuses = [['registered', 'Registered'], ['in_progress', 'Registration in progress'], ['not_registered', 'Not registered']] as const;

type Account = { fullName: string; email: string; emailVerified: boolean; countryCode: string };
type Funding = { countryCode: string; applicantType: string; interests: string[]; opportunityTypes: string[]; primaryGoal: string };
type Organization = { organizationType: string; name: string; countryCode: string; registrationStatus: string };
type Verification = { status: string; note: string | null; href: string; organization: boolean };
type Section = 'personal' | 'funding' | 'organization' | 'security';

const sectionMeta = {
  personal: { label: 'Personal details', description: 'Name, email and country', icon: UserRound },
  funding: { label: 'Funding preferences', description: 'Interests and opportunity types', icon: WalletCards },
  organization: { label: 'Organization profile', description: 'Registration and verification', icon: Building2 },
  security: { label: 'Security', description: 'Password and session', icon: KeyRound },
} as const;

function same(left: unknown, right: unknown) { return JSON.stringify(left) === JSON.stringify(right); }
function initials(name: string, email: string) { const parts = name.trim().split(/\s+/).filter(Boolean); if (parts.length) return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase(); return email.slice(0, 2).toUpperCase(); }
function applicantLabel(value: string) { return applicants.find(([key]) => key === value)?.[1] || 'Applicant'; }
function statusLabel(status: string) { return status === 'pending' ? 'Under review' : status === 'verified' ? 'Verified' : status === 'action_required' ? 'Action required' : status === 'rejected' ? 'Rejected' : 'Not started'; }

async function responseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return body?.error?.message || fallback;
}

export function AccountSettingsWorkspace({ account, funding, organization, verification }: { account: Account; funding: Funding; organization: Organization | null; verification: Verification }) {
  const router = useRouter();
  const [active, setActive] = useState<Section>('personal');
  const [accountInitial, setAccountInitial] = useState(account);
  const [accountForm, setAccountForm] = useState(account);
  const [fundingInitial, setFundingInitial] = useState(funding);
  const [fundingForm, setFundingForm] = useState(funding);
  const emptyOrganization = useMemo<Organization>(() => ({ organizationType: isOrganizationApplicantType(fundingForm.applicantType) ? fundingForm.applicantType : 'startup_sme', name: '', countryCode: fundingForm.countryCode, registrationStatus: 'not_registered' }), [fundingForm.applicantType, fundingForm.countryCode]);
  const [organizationInitial, setOrganizationInitial] = useState<Organization>(organization || emptyOrganization);
  const [organizationForm, setOrganizationForm] = useState<Organization>(organization || emptyOrganization);
  const [saving, setSaving] = useState<Section | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Section, string>>>({});
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const organizationApplicant = isOrganizationApplicantType(fundingForm.applicantType);
  const accountDirty = !same(accountForm, accountInitial);
  const fundingDirty = !same(fundingForm, fundingInitial);
  const organizationDirty = organizationApplicant && !same(organizationForm, organizationInitial);
  const passwordDirty = Boolean(currentPassword || newPassword || confirmPassword);
  const hasUnsavedChanges = accountDirty || fundingDirty || organizationDirty || passwordDirty;
  const sections: Section[] = organizationApplicant ? ['personal', 'funding', 'organization', 'security'] : ['personal', 'funding', 'security'];

  useEffect(() => {
    function warn(event: BeforeUnloadEvent) { if (hasUnsavedChanges) event.preventDefault(); }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!organizationApplicant && active === 'organization') setActive('funding');
  }, [active, organizationApplicant]);

  function setError(section: Section, message = '') { setErrors((current) => ({ ...current, [section]: message })); }
  function toggle(key: 'interests' | 'opportunityTypes', value: string, max: number) {
    setFundingForm((current) => {
      const selected = current[key].includes(value);
      if (!selected && current[key].length >= max) return current;
      return { ...current, [key]: selected ? current[key].filter((item) => item !== value) : [...current[key], value] };
    });
  }

  async function saveAccount(event: React.FormEvent) {
    event.preventDefault(); setError('personal'); setSaving('personal');
    try {
      const response = await fetch('/api/profile/account', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: accountForm.fullName, countryCode: accountForm.countryCode }) });
      if (!response.ok) throw new Error(await responseError(response, 'Could not update your personal details.'));
      setAccountInitial(accountForm);
      if (!fundingDirty) {
        setFundingForm((current) => ({ ...current, countryCode: accountForm.countryCode }));
        setFundingInitial((current) => ({ ...current, countryCode: accountForm.countryCode }));
      }
      toast.success('Personal details updated.'); router.refresh();
    } catch (error) { setError('personal', error instanceof Error ? error.message : 'Could not update your personal details.'); }
    finally { setSaving(null); }
  }

  async function saveFunding(event: React.FormEvent) {
    event.preventDefault(); setError('funding'); setSaving('funding');
    try {
      const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fundingForm) });
      if (!response.ok) throw new Error(await responseError(response, 'Could not update your funding preferences.'));
      setFundingInitial(fundingForm);
      if (!accountDirty) {
        setAccountForm((current) => ({ ...current, countryCode: fundingForm.countryCode }));
        setAccountInitial((current) => ({ ...current, countryCode: fundingForm.countryCode }));
      }
      if (isOrganizationApplicantType(fundingForm.applicantType) && !organization) {
        const next = { ...organizationForm, organizationType: fundingForm.applicantType, countryCode: fundingForm.countryCode };
        setOrganizationForm(next); setOrganizationInitial(next);
      }
      toast.success('Funding preferences updated.'); router.refresh();
    } catch (error) { setError('funding', error instanceof Error ? error.message : 'Could not update your funding preferences.'); }
    finally { setSaving(null); }
  }

  async function saveOrganization(event: React.FormEvent) {
    event.preventDefault(); setError('organization'); setSaving('organization');
    try {
      const response = await fetch('/api/organization-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(organizationForm) });
      if (!response.ok) throw new Error(await responseError(response, 'Could not update your organization profile.'));
      setOrganizationInitial(organizationForm); toast.success('Organization profile updated.'); router.refresh();
    } catch (error) { setError('organization', error instanceof Error ? error.message : 'Could not update your organization profile.'); }
    finally { setSaving(null); }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault(); setError('security');
    if (newPassword.length < 8) return setError('security', 'Your new password must be at least 8 characters.');
    if (newPassword !== confirmPassword) return setError('security', 'The new passwords do not match.');
    setSaving('security');
    try {
      const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
      if (result.error) throw new Error(result.error.message || 'Could not change your password.');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); toast.success('Password updated. Other sessions were signed out.');
    } catch (error) { setError('security', error instanceof Error ? error.message : 'Could not change your password.'); }
    finally { setSaving(null); }
  }

  async function signOut() { await authClient.signOut(); router.push('/sign-in'); router.refresh(); }

  return <>
    <header>
      <p className='text-sm font-medium text-primary'>Account settings</p>
      <h1 className='mt-2 text-3xl font-semibold tracking-tight'>My Profile</h1>
      <p className='mt-2 text-muted-foreground'>Manage your personal information, funding preferences, and account settings.</p>
      <div className='mt-6 flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center'>
        <span aria-hidden='true' className='flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary'>{initials(accountForm.fullName, account.email)}</span>
        <div className='min-w-0 flex-1'><p className='truncate text-lg font-semibold'>{accountForm.fullName}</p><p className='truncate text-sm text-muted-foreground'>{account.email}</p></div>
        <div className='flex flex-wrap gap-2 text-xs font-medium'><span className='rounded-full border bg-muted/40 px-3 py-1.5'>{account.emailVerified ? 'Email verified' : 'Email not verified'}</span><span className='rounded-full border bg-muted/40 px-3 py-1.5'>{applicantLabel(fundingForm.applicantType)}</span></div>
      </div>
    </header>

    <div className='mt-8 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8'>
      <nav aria-label='Profile settings sections' className='grid grid-cols-2 gap-2 lg:sticky lg:top-8 lg:block lg:self-start lg:space-y-1'>
        {sections.map((section) => { const meta = sectionMeta[section]; const Icon = meta.icon; const selected = active === section; return <button key={section} type='button' onClick={() => setActive(section)} aria-current={selected ? 'page' : undefined} className={cn('flex min-h-14 items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-full', selected ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}><Icon className='size-4 shrink-0' /><span className='min-w-0'><span className='block text-sm font-medium text-current'>{meta.label}</span><span className='hidden truncate text-xs text-muted-foreground lg:block'>{meta.description}</span></span></button>; })}
      </nav>

      <div className='mt-6 min-w-0 lg:mt-0'>
        {active === 'personal' ? <SettingsCard title='Personal details' description='Your name appears throughout EasyGrantPath. Your account email is managed securely by the authentication service.'>
          <form onSubmit={saveAccount} className='space-y-5'>
            <FormField id='full-name' label='Full name' description='Use the name you want shown in your dashboard.' required><Input id='full-name' autoComplete='name' className='mt-2 h-11' required minLength={2} maxLength={160} value={accountForm.fullName} onChange={(event) => setAccountForm({ ...accountForm, fullName: event.target.value })} /></FormField>
            <FormField id='email' label='Email address' description='Email changes require a separate verified change flow.'><Input id='email' type='email' className='mt-2 h-11 bg-muted/40' value={account.email} readOnly aria-readonly='true' /></FormField>
            <FormField id='personal-country' label='Country' description='Used for eligibility and regional recommendations.' required><CountrySelect id='personal-country' value={accountForm.countryCode} onChange={(countryCode) => setAccountForm({ ...accountForm, countryCode })} /></FormField>
            <FormActions dirty={accountDirty} saving={saving === 'personal'} onDiscard={() => { setAccountForm(accountInitial); setError('personal'); }} />
            <FormError message={errors.personal} />
          </form>
        </SettingsCard> : null}

        {active === 'funding' ? <SettingsCard title='Funding preferences' description='These choices directly shape your opportunity matches and dashboard recommendations.'>
          <form onSubmit={saveFunding} className='space-y-6'>
            <div className='grid gap-5 sm:grid-cols-2'><FormField id='applicant-type' label='Applicant type' required><select id='applicant-type' required className='mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring' value={fundingForm.applicantType} onChange={(event) => setFundingForm({ ...fundingForm, applicantType: event.target.value })}>{applicants.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FormField><FormField id='funding-country' label='Country of application' required><CountrySelect id='funding-country' value={fundingForm.countryCode} onChange={(countryCode) => setFundingForm({ ...fundingForm, countryCode })} /></FormField></div>
            <ChoiceGroup id='interests' title='Areas of interest' hint='Choose up to 3 areas.' items={interests} selected={fundingForm.interests} max={3} onToggle={(value) => toggle('interests', value, 3)} />
            <ChoiceGroup id='opportunity-types' title='Preferred opportunity types' hint='Choose up to 3 types.' items={opportunityTypes} selected={fundingForm.opportunityTypes} max={3} onToggle={(value) => toggle('opportunityTypes', value, 3)} />
            <FormField id='primary-goal' label='Primary funding goal' required><select id='primary-goal' required className='mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring' value={fundingForm.primaryGoal} onChange={(event) => setFundingForm({ ...fundingForm, primaryGoal: event.target.value })}><option value=''>Choose your main goal</option>{goals.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FormField>
            <FormActions dirty={fundingDirty} saving={saving === 'funding'} onDiscard={() => { setFundingForm(fundingInitial); setError('funding'); }} />
            <FormError message={errors.funding} />
          </form>
        </SettingsCard> : null}

        {active === 'organization' && organizationApplicant ? <SettingsCard title='Organization profile' description='Keep your organization details accurate. Verified or pending records are protected from silent changes.'>
          <VerificationPanel verification={verification} />
          <form onSubmit={saveOrganization} className='mt-6 space-y-5'>
            <FormField id='organization-name' label='Organization name' required><Input id='organization-name' className='mt-2 h-11' required minLength={2} maxLength={200} value={organizationForm.name} onChange={(event) => setOrganizationForm({ ...organizationForm, name: event.target.value })} /></FormField>
            <div className='grid gap-5 sm:grid-cols-2'><FormField id='organization-type' label='Organization type' required><select id='organization-type' className='mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring' value={organizationForm.organizationType} onChange={(event) => setOrganizationForm({ ...organizationForm, organizationType: event.target.value })}>{organizationTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FormField><FormField id='organization-country' label='Country' required><CountrySelect id='organization-country' value={organizationForm.countryCode} onChange={(countryCode) => setOrganizationForm({ ...organizationForm, countryCode })} /></FormField></div>
            <FormField id='registration-status' label='Registration status' required><select id='registration-status' className='mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring' value={organizationForm.registrationStatus} onChange={(event) => setOrganizationForm({ ...organizationForm, registrationStatus: event.target.value })}>{registrationStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FormField>
            <FormActions dirty={organizationDirty} saving={saving === 'organization'} onDiscard={() => { setOrganizationForm(organizationInitial); setError('organization'); }} />
            <FormError message={errors.organization} />
          </form>
        </SettingsCard> : null}

        {active === 'security' ? <div className='space-y-5'>
          <SettingsCard title='Account security' description='Your credentials are handled by Better Auth and are never stored in your profile.'>
            <div className='flex items-start gap-3 rounded-lg border bg-muted/25 p-4'><ShieldCheck className='mt-0.5 size-5 text-primary' /><div><p className='text-sm font-medium'>Email verification</p><p className='mt-1 text-sm text-muted-foreground'>{account.emailVerified ? `${account.email} is verified.` : 'Your email address still needs verification.'}</p></div></div>
            <form onSubmit={changePassword} className='mt-6 space-y-5'>
              <FormField id='current-password' label='Current password' required><Input id='current-password' type='password' autoComplete='current-password' className='mt-2 h-11' required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></FormField>
              <div className='grid gap-5 sm:grid-cols-2'><FormField id='new-password' label='New password' description='Use at least 8 characters.' required><Input id='new-password' type='password' autoComplete='new-password' className='mt-2 h-11' required minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></FormField><FormField id='confirm-password' label='Confirm new password' required><Input id='confirm-password' type='password' autoComplete='new-password' className='mt-2 h-11' required minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></FormField></div>
              <FormActions dirty={passwordDirty} saving={saving === 'security'} saveLabel='Change password' onDiscard={() => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setError('security'); }} />
              <FormError message={errors.security} />
            </form>
          </SettingsCard>
          <SettingsCard title='Current session' description='Sign out of EasyGrantPath on this device.'><Button type='button' variant='outline' onClick={() => void signOut()}><LogOut className='size-4' /> Sign out</Button></SettingsCard>
        </div> : null}
      </div>
    </div>
  </>;
}

function SettingsCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <section className='rounded-xl border bg-card'><header className='border-b px-5 py-5 sm:px-6'><h2 className='text-lg font-semibold'>{title}</h2><p className='mt-1 text-sm leading-6 text-muted-foreground'>{description}</p></header><div className='p-5 sm:p-6'>{children}</div></section>; }
function FormField({ id, label, description, required, children }: { id: string; label: string; description?: string; required?: boolean; children: React.ReactNode }) { return <div><label htmlFor={id} className='text-sm font-medium'>{label}{required ? <span className='text-destructive' aria-hidden='true'> *</span> : null}</label>{description ? <p id={`${id}-description`} className='mt-1 text-xs leading-5 text-muted-foreground'>{description}</p> : null}{children}</div>; }
function CountrySelect({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) { return <select id={id} required className='mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring' value={value} onChange={(event) => onChange(event.target.value)}><option value=''>Select a country</option>{countries.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select>; }
function ChoiceGroup({ id, title, hint, items, selected, max, onToggle }: { id: string; title: string; hint: string; items: readonly (readonly [string, string])[]; selected: string[]; max: number; onToggle: (value: string) => void }) { return <fieldset aria-describedby={`${id}-hint`}><legend className='text-sm font-medium'>{title}</legend><p id={`${id}-hint`} className='mt-1 text-xs text-muted-foreground'>{hint} {selected.length} of {max} selected.</p><div className='mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3'>{items.map(([value, label]) => { const active = selected.includes(value); const disabled = !active && selected.length >= max; return <button key={value} type='button' aria-pressed={active} disabled={disabled} onClick={() => onToggle(value)} className={cn('flex min-h-11 items-center justify-between gap-2 rounded-lg border px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45', active ? 'border-primary bg-primary/10 font-medium text-primary' : 'hover:bg-muted')}><span>{label}</span>{active ? <Check className='size-4 shrink-0' aria-hidden='true' /> : null}</button>; })}</div></fieldset>; }
function FormActions({ dirty, saving, onDiscard, saveLabel = 'Save changes' }: { dirty: boolean; saving: boolean; onDiscard: () => void; saveLabel?: string }) { return <div className='flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end'><Button type='button' variant='ghost' disabled={!dirty || saving} onClick={onDiscard}>Discard changes</Button><Button type='submit' disabled={!dirty || saving}>{saving ? 'Saving...' : saveLabel}</Button></div>; }
function FormError({ message }: { message?: string }) { return message ? <p role='alert' aria-live='polite' className='rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive'>{message}</p> : null; }
function VerificationPanel({ verification }: { verification: Verification }) { const action = ['action_required', 'rejected'].includes(verification.status); return <div className='rounded-lg border bg-muted/25 p-4'><div className='flex items-start gap-3'><ShieldCheck className='mt-0.5 size-5 text-primary' /><div className='min-w-0 flex-1'><div className='flex flex-wrap items-center justify-between gap-2'><p className='text-sm font-medium'>{verification.organization ? 'Organization verification' : 'Identity verification'}</p><span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', verification.status === 'verified' ? 'bg-emerald-100 text-emerald-800' : action ? 'bg-amber-100 text-amber-900' : 'bg-muted text-muted-foreground')}>{statusLabel(verification.status)}</span></div>{verification.note && action ? <p className='mt-2 text-sm text-muted-foreground'>{verification.note}</p> : null}<Link href={verification.href} className='mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline'>View verification <ChevronRight className='size-4' /></Link></div></div></div>; }
