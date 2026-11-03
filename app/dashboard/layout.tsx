import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/development-user";

export const instant = false;

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();
  if (!session?.user.emailVerified) redirect("/sign-in");
  return children;
}
