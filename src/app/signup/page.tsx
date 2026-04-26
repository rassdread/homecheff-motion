import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AuthForm } from "@/components/auth/auth-form";
import { AppCard } from "@/components/ui/app-card";
import { getActiveTranslator } from "@/i18n";

type Search = Promise<{ invite?: string | string[] }>;

export default async function SignupPage({ searchParams }: { searchParams: Search }) {
  const t = getActiveTranslator();
  const sp = await searchParams;
  const raw = sp.invite;
  const inviteFromQuery = typeof raw === "string" ? raw.trim() : "";

  const userCount = await prisma.user.count();
  const inviteRequired = userCount > 0;
  const showBootstrapHint = userCount === 0;
  const showForm = !inviteRequired || inviteFromQuery.length > 0;

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-12">
      <AppCard>
        <h1 className="text-2xl font-semibold">{t("auth.signup.title")}</h1>
        <p className="mt-2 text-sm text-zinc-600">{t("auth.signup.subtitle")}</p>

        {inviteRequired && !inviteFromQuery ? (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
            <h2 className="text-lg font-semibold text-amber-900">
              {t("auth.signup.inviteRequiredTitle")}
            </h2>
            <p className="mt-2 text-sm text-amber-900/90">{t("auth.signup.inviteRequiredBody")}</p>
          </div>
        ) : null}

        {showBootstrapHint ? (
          <p className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 text-xs text-emerald-900">
            {t("auth.signup.bootstrapHint")}
          </p>
        ) : null}

        {showForm ? (
          <div className="mt-6">
            <AuthForm mode="signup" inviteToken={inviteFromQuery} />
          </div>
        ) : null}

        <p className="mt-4 text-sm text-zinc-600">
          {t("auth.signup.hasAccount")}{" "}
          <Link href="/login" className="text-emerald-700 underline">
            {t("auth.login.link")}
          </Link>
        </p>
      </AppCard>
    </main>
  );
}
