import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ProfileSettingsForm } from '@/components/dashboard/profile-settings-form';
import { getDevelopmentProfile, hasActiveAccess, isRegistrationProfileComplete } from '@/lib/user-profile';

export const metadata: Metadata = { title: 'Funding profile' };
export const instant = false;

export default async function SettingsPage() {
  const profile = await getDevelopmentProfile();
  if (!profile || !isRegistrationProfileComplete(profile)) redirect('/dashboard/onboarding');
  if (!hasActiveAccess(profile)) redirect('/dashboard/teaser');
  return <main className='mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8'><header><p className='text-sm font-medium text-primary'>Personalization</p><h1 className='mt-2 text-3xl font-semibold tracking-tight'>My Profile</h1><p className='mt-2 text-muted-foreground'>Update the preferences used to rank opportunities for you.</p></header><div className='mt-7'><ProfileSettingsForm initial={{ countryCode: profile.countryCode, applicantType: profile.applicantType, interests: profile.interests, opportunityTypes: profile.opportunityTypes, primaryGoal: profile.primaryGoal }} /></div></main>;
}
