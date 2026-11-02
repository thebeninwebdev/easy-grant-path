import { errorResponse, successResponse } from "@/lib/api-response"; import { listAdminVerifications } from "@/lib/admin-verifications";
export async function GET() { try { return successResponse(await listAdminVerifications()); } catch (error) { return errorResponse(error); } }
