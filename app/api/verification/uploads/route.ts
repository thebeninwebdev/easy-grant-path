import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { z } from "zod";
import { errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { requireCurrentUserId } from "@/lib/development-user";
import { ACCEPTED_DOCUMENT_TYPES, MAX_DOCUMENT_SIZE, assertIncomingStorageKey, assertPrivateStorageConfigured, assertUploadRequestSize, readUploadRequestJson } from "@/lib/file-storage";
import { assertCanSubmitIdentity, assertCanSubmitOrganization } from "@/lib/verification";
import { enforceVerificationUploadRateLimit, registerPendingVerificationUpload } from "@/lib/verification-rate-limit";
const payloadSchema = z.object({ kind: z.enum(["identity", "organization"]) });
export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    assertPrivateStorageConfigured(); assertUploadRequestSize(request);
    const body = await readUploadRequestJson(request) as HandleUploadBody;
    const response = await handleUpload({
      request, body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        assertIncomingStorageKey(pathname);
        const payload = payloadSchema.safeParse(clientPayload ? JSON.parse(clientPayload) : null);
        if (!payload.success) throw new AppError("Invalid upload request.", "VALIDATION_ERROR", 400);
        await enforceVerificationUploadRateLimit(userId);
        if (payload.data.kind === "identity") await assertCanSubmitIdentity(userId);
        else await assertCanSubmitOrganization(userId);
        await registerPendingVerificationUpload(userId, payload.data.kind, pathname);
        return { allowedContentTypes: [...ACCEPTED_DOCUMENT_TYPES], maximumSizeInBytes: MAX_DOCUMENT_SIZE, validUntil: Date.now() + 10 * 60 * 1000, addRandomSuffix: false, allowOverwrite: false, cacheControlMaxAge: 60 };
      },
    });
    return Response.json(response);
  } catch (error) { return errorResponse(error); }
}
