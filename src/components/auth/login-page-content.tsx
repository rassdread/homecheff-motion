"use client";

import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { ProductPageShell } from "@/components/layout/product-page-shell";
import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";

type Props = {
  ssoEnabled: boolean;
  legacyEnabled: boolean;
  returnTo: string;
};

export function LoginPageContent({ ssoEnabled, legacyEnabled, returnTo }: Props) {
  const t = useActiveTranslator();
  const ssoHref = `/auth/sso/start?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <ProductPageShell contained className="!min-h-[calc(100dvh-4rem)]">
      <div className="mx-auto w-full max-w-xl py-6">
        <AppCard>
          <h1 className="text-2xl font-semibold">{t("auth.login.title")}</h1>
          <p className="mt-2 text-sm text-zinc-600">{t("auth.login.subtitle")}</p>

          {ssoEnabled ? (
            <div className="mt-6">
              <a
                href={ssoHref}
                className="flex w-full items-center justify-center rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                {t("auth.login.continueHomeCheff")}
              </a>
              <p className="mt-2 text-center text-xs text-zinc-500">
                {t("auth.login.continueHomeCheffHint")}
              </p>
            </div>
          ) : null}

          {ssoEnabled && legacyEnabled ? (
            <p className="mt-6 text-center text-xs font-medium uppercase tracking-wide text-zinc-400">
              {t("auth.login.orLegacyPassword")}
            </p>
          ) : null}

          {legacyEnabled ? (
            <div className={ssoEnabled ? "mt-4" : "mt-6"}>
              <AuthForm mode="login" />
            </div>
          ) : null}

          {!legacyEnabled && !ssoEnabled ? (
            <p className="mt-6 text-sm text-zinc-600">{t("auth.login.unavailable")}</p>
          ) : null}

          {legacyEnabled ? (
            <p className="mt-4 text-sm text-zinc-600">
              {t("auth.login.noAccount")}{" "}
              <Link href="/signup" className="text-emerald-700 underline">
                {t("auth.signup.link")}
              </Link>
            </p>
          ) : ssoEnabled ? (
            <p className="mt-4 text-sm text-zinc-600">{t("auth.login.createOnHomeCheff")}</p>
          ) : null}
        </AppCard>
      </div>
    </ProductPageShell>
  );
}
