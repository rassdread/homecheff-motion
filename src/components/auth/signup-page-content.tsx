"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import { loginHref } from "@/lib/auth-login-href";

type SignupPageContentProps = {
  inviteFromQuery: string;
  showBootstrapHint: boolean;
  /** When true, registration is IdP-backed (HomeCheff). */
  ssoEnabled: boolean;
  registerHref: string;
};

export function SignupPageContent({
  inviteFromQuery,
  showBootstrapHint,
  ssoEnabled,
  registerHref,
}: SignupPageContentProps) {
  const t = useActiveTranslator();
  const searchParams = useSearchParams();
  const loginLink = loginHref(searchParams.get("next"));

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-12">
      <AppCard>
        <p className="text-sm font-semibold text-emerald-800">{t("auth.login.brandStudio")}</p>
        <h1 className="mt-2 text-2xl font-semibold">{t("auth.signup.title")}</h1>
        <p className="mt-2 text-sm text-zinc-600">{t("auth.signup.subtitle")}</p>

        {showBootstrapHint && !ssoEnabled ? (
          <p className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 text-xs text-emerald-900">
            {t("auth.signup.bootstrapHint")}
          </p>
        ) : null}

        {ssoEnabled ? (
          <div className="mt-6 space-y-4">
            <a
              href={registerHref}
              className="flex w-full items-center justify-center rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              {t("auth.signup.createAccount")}
            </a>
          </div>
        ) : (
          <div className="mt-6">
            <AuthForm mode="signup" inviteToken={inviteFromQuery} />
          </div>
        )}

        <p className="mt-4 text-sm text-zinc-600">
          {t("auth.signup.hasAccount")}{" "}
          <Link href={loginLink} className="text-emerald-700 underline">
            {t("auth.login.link")}
          </Link>
        </p>
      </AppCard>
    </main>
  );
}
