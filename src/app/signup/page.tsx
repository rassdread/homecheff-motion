import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { AppCard } from "@/components/ui/app-card";
import { getActiveTranslator } from "@/i18n";

export default function SignupPage() {
  const t = getActiveTranslator();

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-12">
      <AppCard>
        <h1 className="text-2xl font-semibold">{t("auth.signup.title")}</h1>
        <p className="mt-2 text-sm text-zinc-600">{t("auth.signup.subtitle")}</p>
        <div className="mt-6">
          <AuthForm mode="signup" />
        </div>
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

