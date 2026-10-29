import { NextResponse } from "next/server";
import { AppError, isAppError } from "@/lib/errors";

export function successResponse<T>(data: T, init?: ResponseInit) { return NextResponse.json({ data }, init); }
export function errorResponse(error: unknown) {
  const appError = isAppError(error) ? error : new AppError("An unexpected error occurred.");
  const message = process.env.NODE_ENV === "production" && !isAppError(error) ? "An unexpected error occurred." : appError.message;
  return NextResponse.json({ error: { code: appError.code, message, ...(appError.details ? { details: appError.details } : {}) } }, { status: appError.statusCode });
}
