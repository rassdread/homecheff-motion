"use client";

import Link from "next/link";
import {
  STUDIO_SSO_ERROR_CODES,
  type StudioSsoErrorCode,
} from "@/lib/identity/sso/errors";
import { ProductPageShell } from "@/components/layout/product-page-shell";
import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";

function isErrorCode(raw: string | undefined): raw is StudioSsoErrorCode {
  return Boolean(raw && (STUDIO_SSO_ERROR_CODES as readonly string[]).includes(raw));
}

function messageKey(code: StudioSsoErrorCode): TranslationKey {
  return `auth.sso.error.${code}` as TranslationKey;
}

function titleKey(code: StudioSsoErrorCode): TranslationKey {
  if (code === "IDENTITY_MAPPING_CONFLICT" || code === "IDENTITY_EMAIL_COLLISION") {
    return "auth.sso.error.title.collision";
  }
  if (code === "IDENTITY_NOT_LINKED") {
    return "auth.sso.error.title.notLinked";
  }
  if (code === "RETRY_LATER") {
    return "auth.sso.error.title.retry";
  }
  return "auth.sso.error.title.generic";
}

export default function StudioSsoErrorClient({
  codeRaw,
  hasLegacySession,
}: {
  codeRaw: string | undefined;
  hasLegacySession: boolean;
}) {
  const t = useActiveTranslator();
  const code = isErrorCode(codeRaw) ? codeRaw : "EXCHANGE_FAILED";
  const isCollision =
    code === "IDENTITY_MAPPING_CONFLICT" || code === "IDENTITY_EMAIL_COLLISION";
  const showClaim = isCollision || (code === "IDENTITY_NOT_LINKED" && hasLegacySession);

  return (
    <ProductPageShell contained className="!min-h-[calc(100dvh-4rem)]">
      <div className="mx-auto w-full max-w-xl py-6">
        <AppCard>
          <p className="text-sm font-semibold text-emerald-800">{t("auth.login.brandStudio")}</p>
          <h1 className="mt-2 text-2xl font-semibold">{t(titleKey(code))}</h1>
          <p className="mt-2 text-sm text-zinc-600">{t(messageKey(code))}</p>
          <p className="mt-1 text-xs text-zinc-400" aria-hidden>
            {code}
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            {showClaim || isCollision ? (
              <>
                {showClaim ? (
                  <Link
                    href="/auth/sso/start?intent=claim&returnTo=%2Faccount%2Fsettings"
                    className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white"
                  >
                    {t("auth.sso.error.cta.linkStudio")}
                  </Link>
                ) : null}
                <Link
                  href="/auth/sso/start?interaction=select_account&returnTo=%2F"
                  className="rounded-md border border-emerald-700 px-4 py-2 font-medium text-emerald-800"
                >
                  {t("auth.sso.error.cta.otherAccount")}
                </Link>
                <Link href="/login" className="rounded-md border px-4 py-2 text-zinc-700">
                  {t("auth.login.backToLogin")}
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth/sso/start?interaction=select_account&returnTo=%2F"
                  className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white"
                >
                  {t("auth.sso.error.cta.otherAccount")}
                </Link>
                <Link
                  href="/auth/sso/start?returnTo=%2F"
                  className="rounded-md border px-4 py-2 text-zinc-700"
                >
                  {t("auth.login.tryAgain")}
                </Link>
                <Link href="/login" className="rounded-md border px-4 py-2 text-zinc-700">
                  {t("auth.login.backToLogin")}
                </Link>
              </>
            )}
          </div>
        </AppCard>
      </div>
    </ProductPageShell>
  );
}
