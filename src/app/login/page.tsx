import { redirect } from "next/navigation";
import { LoginPageContent } from "@/components/auth/login-page-content";
import {
  getCentralIdentityFlags,
  isCentralSsoLive,
  isLegacyStudioLoginEnabled,
} from "@/lib/identity/flags";
import { validateStudioReturnTo } from "@/lib/identity/return-path";

type Search = Promise<{ next?: string | string[]; returnTo?: string | string[] }>;

export default async function LoginPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const rawNext = typeof sp.next === "string" ? sp.next : undefined;
  const rawReturn = typeof sp.returnTo === "string" ? sp.returnTo : undefined;
  const returnTo = validateStudioReturnTo(rawReturn ?? rawNext);

  const flags = getCentralIdentityFlags();
  const ssoEnabled = isCentralSsoLive(flags);
  const legacyEnabled = isLegacyStudioLoginEnabled(flags);

  if (flags.CENTRAL_IDENTITY_REQUIRED && ssoEnabled) {
    redirect(`/auth/sso/start?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return (
    <LoginPageContent
      ssoEnabled={ssoEnabled}
      legacyEnabled={legacyEnabled}
      returnTo={returnTo}
    />
  );
}
