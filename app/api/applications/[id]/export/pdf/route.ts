import { AppError } from "@/lib/errors";
import { buildProposalDocument, sanitizeProposalFilename } from "@/lib/proposal-document";
import { renderProposalPdf } from "@/lib/proposal-exports";
import { getProposalApplication } from "@/lib/proposals";
import { errorResponse } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const application = await getProposalApplication((await context.params).id);
    if (!application) throw new AppError("Proposal not found.", "NOT_FOUND", 404);
    const document = buildProposalDocument(application, "export");
    const file = await renderProposalPdf(document);
    const filename = `${sanitizeProposalFilename(application.opportunityTitle)}.pdf`;
    return new Response(new Uint8Array(file), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}

