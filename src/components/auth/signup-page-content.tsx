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
};

export function SignupPageContent({ inviteFromQuery, showBootstrapHint }: SignupPageContentProps) {
  const t = useActiveTranslator();
  const searchParams = useSearchParams();
  const loginLink = loginHref(searchParams.get("next"));

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-12">
      <AppCard>
        <h1 className="text-2xl font-semibold">{t("auth.signup.title")}</h1>
        <p className="mt-2 text-sm text-zinc-600">{t("auth.signup.subtitle")}</p>

        {showBootstrapHint ? (
          <p className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 text-xs text-emerald-900">
            {t("auth.signup.bootstrapHint")}
          </p>
        ) : null}

        <div className="mt-6">
          <AuthForm mode="signup" inviteToken={inviteFromQuery} />
        </div>

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
