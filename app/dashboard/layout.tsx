import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { authenticatedDestination } from "@/lib/auth-navigation";
import { getCurrentSession } from "@/lib/development-user";
import { getDevelopmentProfile } from "@/lib/user-profile";
export const instant = false;
export default async function DashboardLayout({ children }: { children: ReactNode }) { const session = await getCurrentSession(); const destination = authenticatedDestination(session); if (!destination) redirect("/sign-in?callbackURL=/dashboard"); const profile = await getDevelopmentProfile(); return <DashboardShell name={profile?.fullName || session!.user.name || ""} email={session!.user.email} applicantType={profile?.applicantType}>{children}</DashboardShell>; }
