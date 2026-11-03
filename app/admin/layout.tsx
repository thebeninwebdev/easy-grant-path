import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/development-user";
import { hasAdminRole } from "@/lib/admin-auth";

export const instant = false;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in?callbackURL=/admin");
  if (!hasAdminRole(session.user.role)) notFound();
  return children;
}
