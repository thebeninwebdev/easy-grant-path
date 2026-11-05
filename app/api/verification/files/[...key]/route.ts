import { requireCurrentUserId } from "@/lib/development-user";
import { errorResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getVerificationFile, assertStoredStorageKey } from "@/lib/file-storage";
import { IdentityVerification } from "@/models/IdentityVerification";
import { OrganizationVerificationDocument } from "@/models/OrganizationVerificationDocument";
export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  try {
    const userId = await requireCurrentUserId();
    const key = (await context.params).key.join("/"); assertStoredStorageKey(key); await connectToDatabase();
    const [identity, organization] = await Promise.all([
      IdentityVerification.findOne({ userId, "documentFile.storageKey": key }).select("documentFile").lean(),
      OrganizationVerificationDocument.findOne({ userId, "storage.storageKey": key }).select("storage").lean(),
    ]);
    const file = identity?.documentFile || organization?.storage;
    if (!file?.storageKey) throw new AppError("Verification file not found.", "NOT_FOUND", 404);

    const stored = await getVerificationFile(file.storageKey);
    const filename = encodeURIComponent(file.filename || "verification-document");
    return new Response(stored.stream, { headers: { "Content-Type": file.mimeType || "application/octet-stream", "Content-Disposition": `attachment; filename*=UTF-8''${filename}`, "Cache-Control": "private, no-store, max-age=0", "Pragma": "no-cache", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Content-Security-Policy": "default-src 'none'; sandbox" } });
  } catch (error) { return errorResponse(error); }
}
