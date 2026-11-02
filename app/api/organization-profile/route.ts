import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { saveOrganizationProfile, getOrganizationProfile } from "@/lib/organization-profile";
import { z } from "zod";
const schema = z.object({ organizationType: z.enum(["startup_sme", "ngo_nonprofit", "community_organization"]), name: z.string().trim().min(2).max(200), countryCode: z.string().length(2), registrationStatus: z.enum(["registered", "in_progress", "not_registered"]) });
export async function GET() { try { return successResponse(await getOrganizationProfile()); } catch (error) { return errorResponse(error); } }
export async function POST(request: Request) { try { const parsed = schema.safeParse(await request.json()); if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Invalid organization profile.", "VALIDATION_ERROR", 400); return successResponse(await saveOrganizationProfile(parsed.data)); } catch (error) { return errorResponse(error); } }
