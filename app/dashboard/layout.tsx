import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { getCurrentSession } from '@/lib/development-user';
import { getDevelopmentProfile } from '@/lib/user-profile';

export const instant = false;

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();
  if (!session?.user.emailVerified) redirect('/sign-in');
  const profile = await getDevelopmentProfile();
  return <DashboardShell name={profile?.fullName || session.user.name || ''} email={session.user.email} applicantType={profile?.applicantType}>{children}</DashboardShell>;
}
