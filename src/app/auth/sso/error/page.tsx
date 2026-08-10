import Link from "next/link";
import {
  STUDIO_SSO_ERROR_CODES,
  studioSsoErrorMessage,
  type StudioSsoErrorCode,
} from "@/lib/identity/sso/errors";
import { ProductPageShell } from "@/components/layout/product-page-shell";
import { AppCard } from "@/components/ui/app-card";

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
  const message = studioSsoErrorMessage(code);

  return (
    <ProductPageShell contained className="!min-h-[calc(100dvh-4rem)]">
      <div className="mx-auto w-full max-w-xl py-6">
        <AppCard>
          <p className="text-sm font-semibold text-emerald-800">HomeCheff Studio</p>
          <h1 className="mt-2 text-2xl font-semibold">Sign-in problem</h1>
          <p className="mt-2 text-sm text-zinc-600">{message}</p>
          <p className="mt-1 text-xs text-zinc-400">Code: {code}</p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link
              href="/login"
              className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white"
            >
              Back to login
            </Link>
            <Link
              href="/auth/sso/start"
              className="rounded-md border px-4 py-2 text-zinc-700"
            >
              Try again
            </Link>
          </div>
        </AppCard>
      </div>
    </ProductPageShell>
  );
}
