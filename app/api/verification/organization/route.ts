import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { requireCurrentUserId } from "@/lib/development-user";
import { assertUploadRequestSize, readUploadRequestJson, deleteVerificationFiles, finalizeVerificationUpload } from "@/lib/file-storage";
import { assertCanSubmitOrganization, getOrganizationVerificationForUserId, submitOrganizationDocuments } from "@/lib/verification";
import { claimPendingVerificationUpload } from "@/lib/verification-rate-limit";
const upload = z.object({ storageKey: z.string().max(160), filename: z.string().min(1).max(255), mimeType: z.string().max(64), size: z.number().int().positive() });
const schema = z.object({ files: z.array(z.object({ type: z.enum(["registration_certificate", "authorized_representative_id"]), upload })).min(1).max(2) });
export async function GET() { try { const userId = await requireCurrentUserId(); return successResponse(await getOrganizationVerificationForUserId(userId)); } catch (error) { return errorResponse(error); } }
export async function POST(request: Request) {
  const storedKeys: string[] = [];
  try {
    const userId = await requireCurrentUserId();
    assertUploadRequestSize(request); await assertCanSubmitOrganization(userId);
    const parsed = schema.safeParse(await readUploadRequestJson(request));
    if (!parsed.success) throw new AppError("Provide the required organization documents.", "VALIDATION_ERROR", 400);
    for (const item of parsed.data.files) await claimPendingVerificationUpload(userId, "organization", item.upload.storageKey);
    const files = [];
    for (const item of parsed.data.files) {
      const metadata = await finalizeVerificationUpload(item.upload); storedKeys.push(metadata.storageKey);
      files.push({ type: item.type, metadata });
    }
    const result = await submitOrganizationDocuments(userId, files);
    await deleteVerificationFiles(result.replacedStorageKeys).catch(() => undefined);
    return successResponse(result.record, { status: 201 });
  } catch (error) {
    await deleteVerificationFiles(storedKeys).catch(() => undefined);
    return errorResponse(error);
  }
}
