import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AccountSettingsWorkspace } from '@/components/dashboard/profile-settings-form';
import { getCurrentSession } from '@/lib/development-user';
import { getOrganizationProfileForUserId } from '@/lib/organization-profile';
import { isOrganizationApplicantType } from '@/lib/applicant-types';
import { getDevelopmentProfileForUserId, hasActiveAccess, isRegistrationProfileComplete } from '@/lib/user-profile';
import { getIdentityVerificationForUserId, getOrganizationVerificationForUserId } from '@/lib/verification';

export const metadata: Metadata = { title: 'Account & Profile' };
export const instant = false;

export default async function SettingsPage() {
  const session = await getCurrentSession();
  if (!session?.user.emailVerified) redirect('/sign-in');
  const profile = await getDevelopmentProfileForUserId(session.user.id);
  if (!profile || !isRegistrationProfileComplete(profile)) redirect('/dashboard/onboarding');
  if (!hasActiveAccess(profile)) redirect('/dashboard/teaser');
  const organizationApplicant = isOrganizationApplicantType(profile.applicantType);
  const [organization, verification] = await Promise.all([
    organizationApplicant ? getOrganizationProfileForUserId(session.user.id) : Promise.resolve(null),
    organizationApplicant ? getOrganizationVerificationForUserId(session.user.id) : getIdentityVerificationForUserId(session.user.id),
  ]);
  const verificationRecord = organizationApplicant ? verification && 'profile' in verification ? verification.profile : null : verification && !('profile' in verification) ? verification : null;

  return <main className='mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8'>
    <AccountSettingsWorkspace
      account={{ fullName: profile.fullName || session.user.name || '', email: session.user.email, emailVerified: session.user.emailVerified, countryCode: profile.countryCode }}
      funding={{ countryCode: profile.countryCode, applicantType: profile.applicantType, interests: profile.interests, opportunityTypes: profile.opportunityTypes, primaryGoal: profile.primaryGoal }}
      organization={organization ? { organizationType: String(organization.organizationType), name: String(organization.name), countryCode: String(organization.countryCode), registrationStatus: String(organization.registrationStatus) } : null}
      verification={{ status: String(verificationRecord?.verificationStatus || 'unverified'), note: verificationRecord?.reviewNote || verificationRecord?.rejectionReason || null, href: organizationApplicant ? '/dashboard/verification/organization' : '/dashboard/verification/identity', organization: organizationApplicant }}
    />
  </main>;
}
