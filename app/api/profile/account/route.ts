import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { readJsonBody } from "@/lib/api-request";
import { AppError } from "@/lib/errors";
import { accountDetailsSchema } from "@/lib/profile-validation";
import { saveAccountDetailsForUser } from "@/lib/user-profile";

export async function PATCH(request: Request) {
  try {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });
    if (!session) throw new AppError("Sign in required.", "UNAUTHORIZED", 401);
    if (!session.user.emailVerified) throw new AppError("Verify your email before continuing.", "EMAIL_NOT_VERIFIED", 403);
    const parsed = accountDetailsSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Invalid account details.", "VALIDATION_ERROR", 400);

    const previousName = session.user.name;
    await auth.api.updateUser({ headers: requestHeaders, body: { name: parsed.data.fullName } });
    try {
      const profile = await saveAccountDetailsForUser(session.user.id, parsed.data);
      return successResponse(profile);
    } catch (error) {
      await auth.api.updateUser({ headers: requestHeaders, body: { name: previousName } }).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    return errorResponse(error);
  }
}
