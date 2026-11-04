import { errorResponse, successResponse } from "@/lib/api-response";
import { readJsonBody } from "@/lib/api-request";
import { AppError } from "@/lib/errors";
import { fundingPreferencesSchema } from "@/lib/profile-validation";
import { saveFundingPreferences } from "@/lib/user-profile";
export async function PATCH(request: Request) { try { const parsed = fundingPreferencesSchema.safeParse(await readJsonBody(request)); if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Invalid funding preferences.", "VALIDATION_ERROR", 400); return successResponse(await saveFundingPreferences(parsed.data)); } catch (error) { return errorResponse(error); } }
