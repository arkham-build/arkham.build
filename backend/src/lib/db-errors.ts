export function isPgErrorCode(
  error: unknown,
  code: string,
): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

export function isUniqueViolation(error: unknown): error is { code: string } {
  return isPgErrorCode(error, "23505");
}

export function isExclusionViolation(
  error: unknown,
): error is { code: string } {
  return isPgErrorCode(error, "23P01");
}
