import { errorResponse, successResponse } from "@/lib/api-response";
import { listAdminServiceRequests } from "@/lib/service-requests";
export async function GET() { try { return successResponse(await listAdminServiceRequests()); } catch (error) { return errorResponse(error); } }
