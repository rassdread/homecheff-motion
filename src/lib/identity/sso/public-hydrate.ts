/**
 * SP.2B.7 — one-shot silent SSO from public Studio surfaces (e.g. `/`).
 * Keeps marketing public when HC has no session; hydrates studio_session when it does.
 */

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { isCentralSsoLive } from "@/lib/identity/flags";
import { validateStudioReturnTo } from "@/lib/identity/return-path";
import { canAttemptSilentSso } from "@/lib/identity/sso/silent-guard";
import { logStudioSsoEvent } from "@/lib/identity/sso/observability";
import { getAuthenticatedUser } from "@/server/auth/session";

/**
 * If unauthenticated and silent SSO is allowed, redirect into the silent seam.
 * Otherwise return so the caller can render the public page.
 */
export async function maybeSilentHydratePublicStudio(
  returnToRaw: string = "/",
): Promise<void> {
  const user = await getAuthenticatedUser();
  if (user) return;

  if (!isCentralSsoLive()) return;

  const returnTo = validateStudioReturnTo(returnToRaw);
  const jar = await cookies();
  const header = jar
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  if (!canAttemptSilentSso(header)) return;

  logStudioSsoEvent("silent_sso_attempt", {
    phase: "public_hydrate",
    returnTo,
  });
  redirect(
    `/auth/sso/silent?returnTo=${encodeURIComponent(returnTo)}&mode=public`,
  );
}
