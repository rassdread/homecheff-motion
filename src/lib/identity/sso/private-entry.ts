/**
 * SP.2B.5 — shared private-route silent SSO redirect helper (server).
 */

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { isCentralSsoLive } from "@/lib/identity/flags";
import { validateStudioReturnTo } from "@/lib/identity/return-path";
import { canAttemptSilentSso } from "@/lib/identity/sso/silent-guard";

/**
 * When unauthenticated on a private Studio surface:
 * - SSO live + silent allowed → /auth/sso/silent
 * - else → /login
 */
export async function redirectUnauthenticatedPrivate(
  returnToRaw: string,
): Promise<never> {
  const returnTo = validateStudioReturnTo(returnToRaw);
  if (isCentralSsoLive()) {
    const jar = await cookies();
    const header = jar
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    if (canAttemptSilentSso(header)) {
      redirect(`/auth/sso/silent?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }
  redirect(`/login?next=${encodeURIComponent(returnTo)}`);
}
