import { errorResponse, successResponse } from "@/lib/api-response";
import { readJsonBody } from "@/lib/api-request";
import { AppError } from "@/lib/errors";
import { onboardingProfileSchema } from "@/lib/profile-validation";
import { saveOnboardingProfile } from "@/lib/user-profile";

export async function PATCH(request: Request) {
  try {
    const parsed = onboardingProfileSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Invalid onboarding profile.", "VALIDATION_ERROR", 400);
    return successResponse(await saveOnboardingProfile(parsed.data));
  } catch (error) {
    return errorResponse(error);
  }
}
