import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentSession } from "@/lib/development-user";
import { hasAdminRole } from "@/lib/admin-auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminAttentionCount } from "@/lib/admin-dashboard";

export const instant = false;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await connection();
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in?callbackURL=/admin");
  if (!hasAdminRole(session.user.role)) notFound();
  return <AdminShell name={session.user.name || "Administrator"} email={session.user.email} attentionCount={await getAdminAttentionCount()}>{children}</AdminShell>;
}
