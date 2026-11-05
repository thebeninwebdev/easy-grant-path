import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getProposalPreset, PROPOSAL_STARTER_IDS } from "@/lib/proposal-presets";
import { ProposalTemplate } from "@/models/ProposalTemplate";

const schema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2_000).optional(),
  templateType: z.enum(PROPOSAL_STARTER_IDS),
  status: z.enum(["draft", "published"]),
}).strict();

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Invalid general template.", "VALIDATION_ERROR", 400);
    await connectToDatabase();
    const template = await ProposalTemplate.create({
      scope: "general",
      title: parsed.data.title,
      description: parsed.data.description,
      templateType: parsed.data.templateType,
      sections: getProposalPreset(parsed.data.templateType),
      status: parsed.data.status,
      recommendation: { source: "manual", reasons: ["Reusable template published from the admin template library."] },
      createdBy: session.user.id,
      updatedBy: session.user.id,
    });
    return successResponse(template.toObject(), { status: 201 });
  } catch (error) { return errorResponse(error); }
}
