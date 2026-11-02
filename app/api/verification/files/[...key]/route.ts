import { errorResponse } from "@/lib/api-response";
import { getVerificationFile } from "@/lib/file-storage";
import { requireCurrentUserId } from "@/lib/development-user";
import { IdentityVerification } from "@/models/IdentityVerification";
import { OrganizationVerificationDocument } from "@/models/OrganizationVerificationDocument";
import { AppError } from "@/lib/errors";

export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  try {
    const key = (await context.params).key.join("/");
    const [identity, organization] = await Promise.all([
      IdentityVerification.findOne({ userId: await requireCurrentUserId(), "documentFile.storageKey": key }).select("documentFile").lean(),
      OrganizationVerificationDocument.findOne({ userId: await requireCurrentUserId(), "storage.storageKey": key }).select("storage").lean(),
    ]);
    const file = identity?.documentFile || organization?.storage;
    if (!file?.storageKey) throw new AppError("Verification file not found.", "NOT_FOUND", 404);
    const bytes = await getVerificationFile(file.storageKey);
    return new Response(bytes, { headers: { "Content-Type": file.mimeType || "application/octet-stream", "Content-Disposition": `inline; filename="${(file.filename || "verification-document").replace(/[^a-zA-Z0-9._-]/g, "_")}"`, "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}
