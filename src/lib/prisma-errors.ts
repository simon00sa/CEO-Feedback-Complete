// Helper for safely checking Prisma errors without using instanceof
export function isPrismaError(error: unknown): error is { code: string; message?: string } {
  return typeof error === 'object' && error !== null && 'code' in error;
}

// Helper for checking specific Prisma error codes
export function isPrismaErrorWithCode(error: unknown, code: string): boolean {
  return isPrismaError(error) && error.code === code;
}
