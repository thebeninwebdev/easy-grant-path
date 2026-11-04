import { AppError } from "@/lib/errors";

export async function readJsonBody(request: Request) {
  try {
    return await request.json() as unknown;
  } catch {
    throw new AppError("Request body must be valid JSON.", "VALIDATION_ERROR", 400);
  }
}
