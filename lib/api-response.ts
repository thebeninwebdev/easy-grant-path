import { NextResponse } from "next/server";
import { AppError, isAppError } from "@/lib/errors";

export function successResponse<T>(data: T, init?: ResponseInit) { return NextResponse.json({ data }, init); }
export function errorResponse(error: unknown) {
  const appError = isAppError(error) ? error : new AppError("An unexpected error occurred.");
  const message = isAppError(error) ? appError.message : process.env.NODE_ENV === "production" ? "An unexpected error occurred." : error instanceof Error ? error.message : appError.message;
  return NextResponse.json({ error: { code: appError.code, message, ...(appError.details ? { details: appError.details } : {}) } }, { status: appError.statusCode });
}
