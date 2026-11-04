import { errorResponse, successResponse } from "@/lib/api-response";
import { readJsonBody } from "@/lib/api-request";
import { AppError } from "@/lib/errors";
import { saveOrganizationProfile, getOrganizationProfile } from "@/lib/organization-profile";
import { organizationDetailsSchema } from "@/lib/profile-validation";
export async function GET() { try { return successResponse(await getOrganizationProfile()); } catch (error) { return errorResponse(error); } }
export async function POST(request: Request) { try { const parsed = organizationDetailsSchema.safeParse(await readJsonBody(request)); if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Invalid organization profile.", "VALIDATION_ERROR", 400); return successResponse(await saveOrganizationProfile(parsed.data)); } catch (error) { return errorResponse(error); } }
