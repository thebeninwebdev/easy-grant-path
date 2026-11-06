import "server-only";
import { hasAdminRole } from "@/lib/admin-auth";
import { getCurrentSession } from "@/lib/development-user";
/** Admins preview the dashboard as themselves; this never grants ownership of another user's records. */
export async function getDashboardAccess() { const session = await getCurrentSession(); return { session, isAdmin: hasAdminRole(session?.user.role) }; }
export function canBypassCustomerDashboardGuards(isAdmin: boolean) { return isAdmin; }
