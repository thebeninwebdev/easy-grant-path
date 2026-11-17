import { requireAdmin } from "@/lib/admin-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getPaystackDiagnostics } from "@/lib/paystack-config";

export async function GET() {
  try {
    await requireAdmin();
    return successResponse(getPaystackDiagnostics());
  } catch (error) {
    return errorResponse(error);
  }
}
