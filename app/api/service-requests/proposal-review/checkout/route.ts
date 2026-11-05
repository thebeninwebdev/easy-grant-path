import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api-response";
import { readJsonBody } from "@/lib/api-request";
import { getCurrentSession } from "@/lib/development-user";
import { AppError } from "@/lib/errors";
import { initializePaymentCheckout } from "@/lib/payments";
const schema = z.object({ whatsappNumber: z.string().trim().min(8).max(40), saveWhatsapp: z.boolean() });
export async function POST(request: Request) { try { const session = await getCurrentSession(); if (!session) throw new AppError("Sign in required.", "UNAUTHORIZED", 401); if (!session.user.emailVerified) throw new AppError("Verify your email before continuing.", "EMAIL_NOT_VERIFIED", 403); const parsed = schema.safeParse(await readJsonBody(request)); if (!parsed.success) throw new AppError("Enter a valid WhatsApp number.", "VALIDATION_ERROR", 400); const result = await initializePaymentCheckout(session.user, { productId: "proposal_review", ...parsed.data }); return successResponse({ authorizationUrl: result.checkoutUrl, ...result }, { status: 201 }); } catch (error) { return errorResponse(error); } }