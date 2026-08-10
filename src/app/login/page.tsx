import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { LoginPageContent } from "@/components/auth/login-page-content";
import {
  getCentralIdentityFlags,
  isCentralSsoLive,
  isLegacyStudioLoginEnabled,
} from "@/lib/identity/flags";
import { validateStudioReturnTo } from "@/lib/identity/return-path";
import { canAttemptSilentSso } from "@/lib/identity/sso/silent-guard";
import { getAuthenticatedUser } from "@/server/auth/session";

type Search = Promise<{ next?: string | string[]; returnTo?: string | string[] }>;

export default async function LoginPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const rawNext = typeof sp.next === "string" ? sp.next : undefined;
  const rawReturn = typeof sp.returnTo === "string" ? sp.returnTo : undefined;
  const returnTo = validateStudioReturnTo(rawReturn ?? rawNext);

  const flags = getCentralIdentityFlags();
  const ssoEnabled = isCentralSsoLive(flags);
  const legacyEnabled = isLegacyStudioLoginEnabled(flags);
  void flags.CENTRAL_IDENTITY_REQUIRED;

  const user = await getAuthenticatedUser();
  if (user) {
    redirect(returnTo);
  }

  // SP.2B.5 — one silent SSO attempt before rendering login (unless skipped / already tried).
  if (ssoEnabled) {
    const jar = await cookies();
    const header = jar
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    if (canAttemptSilentSso(header)) {
      redirect(`/auth/sso/silent?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }

  return (
    <LoginPageContent
      ssoEnabled={ssoEnabled}
      legacyEnabled={legacyEnabled}
      returnTo={returnTo}
    />
  );
}
