import { isAllowedPostAuthPath } from "@/lib/auth-post-auth-redirect";

/** Build a login URL that returns to `next` after successful auth (allowlist enforced). */
export function loginHref(next?: string | null): string {
  const trimmed = next?.trim();
  if (!trimmed) {
    return "/login";
  }
  const safe = isAllowedPostAuthPath(trimmed) ? trimmed : "/maak";
  return `/login?next=${encodeURIComponent(safe)}`;
}
