import { errorResponse, successResponse } from "@/lib/api-response";
import { requireCurrentUserId } from "@/lib/development-user";
import { listUserPayments } from "@/lib/payments";
export async function GET() { try { return successResponse(await listUserPayments(await requireCurrentUserId())); } catch (error) { return errorResponse(error); } }