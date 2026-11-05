import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { requireCurrentUserId } from "@/lib/development-user";
import { assertUploadRequestSize, readUploadRequestJson, deleteVerificationFiles, finalizeVerificationUpload } from "@/lib/file-storage";
import { assertCanSubmitIdentity, getIdentityVerificationForUserId, submitIdentityVerification } from "@/lib/verification";
import { claimPendingVerificationUpload } from "@/lib/verification-rate-limit";
const schema = z.object({
  documentType: z.enum(["national_id", "passport", "drivers_license", "other_government_id"]),
  upload: z.object({ storageKey: z.string().max(160), filename: z.string().min(1).max(255), mimeType: z.string().max(64), size: z.number().int().positive() }),
});
export async function GET() { try { const userId = await requireCurrentUserId(); return successResponse(await getIdentityVerificationForUserId(userId)); } catch (error) { return errorResponse(error); } }
export async function POST(request: Request) {
  let storedKey: string | undefined;
  try {
    const userId = await requireCurrentUserId();
    assertUploadRequestSize(request); await assertCanSubmitIdentity(userId);
    const parsed = schema.safeParse(await readUploadRequestJson(request));
    if (!parsed.success) throw new AppError("Choose a valid document and document type.", "VALIDATION_ERROR", 400);
    await claimPendingVerificationUpload(userId, "identity", parsed.data.upload.storageKey);
    const metadata = await finalizeVerificationUpload(parsed.data.upload); storedKey = metadata.storageKey;
    const result = await submitIdentityVerification(userId, parsed.data.documentType, metadata);
    await deleteVerificationFiles(result.replacedStorageKeys).catch(() => undefined);
    return successResponse(result.record, { status: 201 });
  } catch (error) {
    if (storedKey) await deleteVerificationFiles([storedKey]).catch(() => undefined);
    return errorResponse(error);
  }
}
