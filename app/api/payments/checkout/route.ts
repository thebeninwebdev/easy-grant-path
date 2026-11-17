import { randomUUID } from "node:crypto";
import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api-response";
import { readJsonBody } from "@/lib/api-request";
import { getCurrentSession } from "@/lib/development-user";
import { AppError, isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { initializePaymentCheckout } from "@/lib/payments";

const schema = z.object({
  productId: z.enum(["proposal_writing", "proposal_review", "platform_access"]),
  whatsappNumber: z.string().trim().max(40).optional(),
  saveWhatsapp: z.boolean().optional(),
  locale: z.enum(["fr", "en"]).optional(),
});

/**
 * Log a useful error category without logging payment secrets, customer details,
 * raw request bodies, database connection strings, or authorization headers.
 */
function checkoutErrorDiagnostic(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
  const safeCode = typeof code === "string" || typeof code === "number" ? String(code) : undefined;
  const safeMessage = isAppError(error)
    ? error.message
    : error instanceof Error
      ? error.message
          .replace(/mongodb(?:\\+srv)?:\\/\\/[^\\s]+/gi, "[redacted database URI]")
          .replace(/sk_(?:live|test)_[a-z0-9]+/gi, "[redacted payment key]")
          .replace(/Bearer\\s+[^\\s]+/gi, "Bearer [redacted]")
          .slice(0, 300)
      : undefined;

  return {
    errorName: error instanceof Error ? error.name : typeof error,
    errorCode: safeCode,
    errorMessage: safeMessage,
  };
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  let productId: string | undefined;
  try {
    const session = await getCurrentSession();
    if (!session) throw new AppError("Sign in required.", "UNAUTHORIZED", 401);
    if (!session.user.emailVerified) throw new AppError("Verify your email before continuing.", "EMAIL_NOT_VERIFIED", 403);

    const parsed = schema.safeParse(await readJsonBody(request));
    if (!parsed.success) throw new AppError("Invalid payment request.", "VALIDATION_ERROR", 400);
    productId = parsed.data.productId;

    const result = await initializePaymentCheckout(session.user, parsed.data);
    const response = successResponse(result, { status: 201 });
    response.headers.set("X-Checkout-Request-Id", requestId);
    return response;
  } catch (error) {
    const diagnostic = checkoutErrorDiagnostic(error);
    const status = isAppError(error) ? error.statusCode : 500;
    // Expected user input errors do not need stack traces or alerting.
    if (status >= 500) {
      logger.error("Payment checkout initialization failed", { requestId, productId, ...diagnostic });
    } else {
      logger.warn("Payment checkout rejected", { requestId, productId, status, errorCode: diagnostic.errorCode });
    }

    const response = errorResponse(error);
    response.headers.set("X-Checkout-Request-Id", requestId);
    return response;
  }
}
