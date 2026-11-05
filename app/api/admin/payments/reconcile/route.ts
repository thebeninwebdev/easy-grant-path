import { after } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { reconcilePendingPayments } from "@/lib/payments";
import { dispatchServiceRequestNotification } from "@/lib/service-requests";
export async function POST() { try { await requireAdmin(); const result = await reconcilePendingPayments(); for (const id of result.serviceRequestIds) after(() => dispatchServiceRequestNotification(id)); return successResponse(result); } catch (error) { return errorResponse(error); } }