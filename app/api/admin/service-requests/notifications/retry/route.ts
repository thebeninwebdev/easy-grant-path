import { requireAdmin } from "@/lib/admin-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { retryDueServiceRequestNotifications } from "@/lib/service-requests";
export async function POST() { try { await requireAdmin(); return successResponse({ attempted: await retryDueServiceRequestNotifications() }); } catch (error) { return errorResponse(error); } }
