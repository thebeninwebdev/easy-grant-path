import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api-response";
import { readJsonBody } from "@/lib/api-request";
import { getCurrentSession } from "@/lib/development-user";
import { AppError } from "@/lib/errors";
import { initializePaymentCheckout } from "@/lib/payments";
const schema = z.object({ productId: z.enum(["proposal_review", "platform_access", "full_application_assistance"]), whatsappNumber: z.string().trim().max(40).optional(), saveWhatsapp: z.boolean().optional() });
export async function POST(request: Request) { try { const session = await getCurrentSession(); if (!session) throw new AppError("Sign in required.", "UNAUTHORIZED", 401); if (!session.user.emailVerified) throw new AppError("Verify your email before continuing.", "EMAIL_NOT_VERIFIED", 403); const parsed = schema.safeParse(await readJsonBody(request)); if (!parsed.success) throw new AppError("Invalid payment request.", "VALIDATION_ERROR", 400); return successResponse(await initializePaymentCheckout(session.user, parsed.data), { status: 201 }); } catch (error) { return errorResponse(error); } }