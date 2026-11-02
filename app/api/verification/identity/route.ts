import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { saveVerificationFile, validateUploadedFile } from "@/lib/file-storage";
import { getIdentityVerification, submitIdentityVerification } from "@/lib/verification";
import { z } from "zod";
const types = z.enum(["national_id", "passport", "drivers_license", "other_government_id"]);
export async function GET() { try { return successResponse(await getIdentityVerification()); } catch (error) { return errorResponse(error); } }
export async function POST(request: Request) { try { const body = await request.formData(); const parsed = types.safeParse(body.get("documentType")); if (!parsed.success) throw new AppError("Choose a document type.", "VALIDATION_ERROR", 400); const file = body.get("file"); const issue = validateUploadedFile(file instanceof File ? file : null); if (issue) throw new AppError(issue, "VALIDATION_ERROR", 400); return successResponse(await submitIdentityVerification(parsed.data, await saveVerificationFile(file as File)), { status: 201 }); } catch (error) { return errorResponse(error); } }
export async function PATCH() { try { return successResponse(await getIdentityVerification()); } catch (error) { return errorResponse(error); } }
