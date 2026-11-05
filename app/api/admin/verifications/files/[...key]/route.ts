import { requireAdmin } from "@/lib/admin-auth";
import { recordAdminAudit } from "@/lib/admin-audit";
import { errorResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getVerificationFile } from "@/lib/file-storage";
import { IdentityVerification } from "@/models/IdentityVerification";
import { OrganizationVerificationDocument } from "@/models/OrganizationVerificationDocument";
export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  try {
    const session = await requireAdmin(); const key = (await context.params).key.join("/");
    await connectToDatabase();
    const [identity, organization] = await Promise.all([
      IdentityVerification.findOne({ "documentFile.storageKey": key }).select("documentFile").lean(),
      OrganizationVerificationDocument.findOne({ "storage.storageKey": key }).select("storage").lean(),
    ]);
    const file = identity?.documentFile || organization?.storage;
    if (!file?.storageKey) throw new AppError("Verification file not found.", "NOT_FOUND", 404);
    const bytes = await getVerificationFile(file.storageKey);
    await recordAdminAudit({ actor: session.user, action: "verification.document_viewed", resourceType: "verification_file", resourceId: key, summary: "Administrator viewed a private verification document" });
    const filename = (file.filename || "verification-document").replace(/[^a-zA-Z0-9._-]/g, "_");
    return new Response(bytes, { headers: { "Content-Type": file.mimeType || "application/octet-stream", "Content-Disposition": `inline; filename="${filename}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return errorResponse(error); }
}
