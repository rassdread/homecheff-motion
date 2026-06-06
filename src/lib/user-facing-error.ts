/**
 * Strip technical API / network errors before showing them to end users.
 * Admins may still see raw details when explicitly opted in.
 */

const TECHNICAL_CODE = /^[A-Z][A-Z0-9_]{2,}$/;
const TECHNICAL_PATTERNS =
  /access control|CORS|failed to fetch|Prisma|webhook|EXPORT_TIMEOUT|OPENAI_|VIDU_|ELEVENLABS_|AUTH_REQUIRED|NOT_FOUND|INVALID_|stack trace|TypeError:/i;

export function isTechnicalUserMessage(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) {
    return false;
  }
  if (TECHNICAL_PATTERNS.test(trimmed)) {
    return true;
  }
  if (TECHNICAL_CODE.test(trimmed)) {
    return true;
  }
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return true;
  }
  return false;
}

export function userFacingApiError(
  raw: string | undefined | null,
  fallback: string,
  options?: { isAdmin?: boolean }
): string {
  const message = raw?.trim() ?? "";
  if (!message) {
    return fallback;
  }
  if (options?.isAdmin) {
    return message;
  }
  return isTechnicalUserMessage(message) ? fallback : message;
}
