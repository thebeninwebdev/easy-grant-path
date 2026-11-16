import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { authenticatedDestination } from "@/lib/auth-navigation";
import { getCurrentSession } from "@/lib/development-user";
import { getDevelopmentProfileForUserId } from "@/lib/user-profile";
import { localizedPath } from "@/i18n/paths";
import type { SupportedLocale } from "@/lib/config";
export const instant = false;
export default async function DashboardLayout({ children }: { children: ReactNode }) { const [session, locale] = await Promise.all([getCurrentSession(), getLocale() as Promise<SupportedLocale>]); const destination = authenticatedDestination(session); if (!destination) { const dashboard = localizedPath("/dashboard", locale); redirect(`${localizedPath("/sign-in", locale)}?callbackURL=${encodeURIComponent(dashboard)}`); } const profile = await getDevelopmentProfileForUserId(session!.user.id); return <DashboardShell name={profile?.fullName || session!.user.name || ""} email={session!.user.email} applicantType={profile?.applicantType}>{children}</DashboardShell>; }
