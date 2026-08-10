import Link from "next/link";
import {
  STUDIO_SSO_ERROR_CODES,
  studioSsoErrorMessage,
  type StudioSsoErrorCode,
} from "@/lib/identity/sso/errors";
import { ProductPageShell } from "@/components/layout/product-page-shell";
import { AppCard } from "@/components/ui/app-card";
import { getAuthenticatedUser } from "@/server/auth/session";

function isErrorCode(raw: string | undefined): raw is StudioSsoErrorCode {
  return Boolean(raw && (STUDIO_SSO_ERROR_CODES as readonly string[]).includes(raw));
}

export default async function StudioSsoErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const code = isErrorCode(params.code) ? params.code : "EXCHANGE_FAILED";
  const message =
    code === "IDENTITY_NOT_LINKED"
      ? "We couldn't find a Studio account linked to this HomeCheff account."
      : studioSsoErrorMessage(code);
  const sessionUser = await getAuthenticatedUser();
  const hasLegacySession = Boolean(sessionUser);

  return (
    <ProductPageShell contained className="!min-h-[calc(100dvh-4rem)]">
      <div className="mx-auto w-full max-w-xl py-6">
        <AppCard>
          <p className="text-sm font-semibold text-emerald-800">HomeCheff Studio</p>
          <h1 className="mt-2 text-2xl font-semibold">Sign-in problem</h1>
          <p className="mt-2 text-sm text-zinc-600">{message}</p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link
              href="/auth/sso/start?interaction=select_account&returnTo=%2F"
              className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white"
            >
              Try another HomeCheff account
            </Link>
            <Link
              href="/login"
              className="rounded-md border px-4 py-2 text-zinc-700"
            >
              Return to login
            </Link>
            {code === "IDENTITY_NOT_LINKED" && hasLegacySession ? (
              <Link
                href="/auth/sso/start?intent=claim&returnTo=%2Faccount%2Fsettings"
                className="rounded-md border border-emerald-700 px-4 py-2 font-medium text-emerald-800"
              >
                Link this Studio account
              </Link>
            ) : null}
          </div>
        </AppCard>
      </div>
    </ProductPageShell>
  );
}
