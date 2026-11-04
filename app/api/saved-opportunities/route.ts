import { errorResponse, successResponse } from '@/lib/api-response';
import { AppError } from '@/lib/errors';
import { removeSavedOpportunity, saveOpportunity } from '@/lib/saved-opportunities';

async function opportunityId(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || !('opportunityId' in body) || typeof body.opportunityId !== 'string') {
    throw new AppError('Opportunity ID is required.', 'VALIDATION_ERROR', 400);
  }
  return body.opportunityId;
}

export async function POST(request: Request) {
  try { await saveOpportunity(await opportunityId(request)); return successResponse({ saved: true }, { status: 201 }); }
  catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request) {
  try { await removeSavedOpportunity(await opportunityId(request)); return successResponse({ saved: false }); }
  catch (error) { return errorResponse(error); }
}
