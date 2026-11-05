import { after } from "next/server";
import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api-response";
import { readJsonBody } from "@/lib/api-request";
import { requireCurrentUserId } from "@/lib/development-user";
import { AppError } from "@/lib/errors";
import { verifyAndFulfillPayment } from "@/lib/payments";
import { dispatchServiceRequestNotification } from "@/lib/service-requests";
const schema = z.object({ reference: z.string().regex(/^[A-Za-z0-9_-]{12,150}$/), transactionId: z.string().regex(/^\d{1,30}$/).optional() });
export async function POST(request: Request) { try { const userId = await requireCurrentUserId(); const parsed = schema.safeParse(await readJsonBody(request)); if (!parsed.success) throw new AppError("Invalid payment callback.", "VALIDATION_ERROR", 400); const result = await verifyAndFulfillPayment({ ...parsed.data, userId }); if (result.serviceRequestId) after(() => dispatchServiceRequestNotification(result.serviceRequestId!)); return successResponse(result.payment); } catch (error) { return errorResponse(error); } }