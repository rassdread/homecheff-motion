/**
 * True one-identity auto-entry — Studio silent hydrate when hc_eco_epoch
 * indicates a likely HomeCheff IdP session (SEO-safe for anonymous crawlers).
 */

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { isCentralSsoLive } from "@/lib/identity/flags";
import { validateStudioReturnTo } from "@/lib/identity/return-path";
import { canAttemptSilentSso } from "@/lib/identity/sso/silent-guard";
import { logStudioSsoEvent } from "@/lib/identity/sso/observability";
import { getAuthenticatedUser } from "@/server/auth/session";
import {
  HC_ECO_EPOCH_COOKIE,
  HC_ECO_EPOCH_LOGGED_OUT,
} from "@/lib/ecosystem-session/epoch";

export async function maybeSilentHydrateWhenEcosystemSessionLikely(
  returnToRaw: string = "/",
): Promise<void> {
  const user = await getAuthenticatedUser();
  if (user) return;

  if (!isCentralSsoLive()) return;

  const jar = await cookies();
  const epoch = jar.get(HC_ECO_EPOCH_COOKIE)?.value?.trim() ?? "";
  if (!epoch || epoch === HC_ECO_EPOCH_LOGGED_OUT) return;

  const header = jar
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  if (!canAttemptSilentSso(header)) return;

  const returnTo = validateStudioReturnTo(returnToRaw);
  logStudioSsoEvent("silent_sso_attempt", {
    phase: "ecosystem_epoch_hydrate",
    returnTo,
  });
  redirect(
    `/auth/sso/silent?returnTo=${encodeURIComponent(returnTo)}&mode=public`,
  );
}
