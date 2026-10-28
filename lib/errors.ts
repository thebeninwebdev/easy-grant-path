export class AppError extends Error {
  constructor(message: string, public readonly code = "INTERNAL_ERROR", public readonly statusCode = 500) {
    super(message);
    this.name = "AppError";
  }
}

export function isAppError(error: unknown): error is AppError { return error instanceof AppError; }
