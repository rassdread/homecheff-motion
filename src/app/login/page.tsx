import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { AppCard } from "@/components/ui/app-card";
import { getActiveTranslator } from "@/i18n";

export default function LoginPage() {
  const t = getActiveTranslator();

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-12">
      <AppCard>
        <h1 className="text-2xl font-semibold">{t("auth.login.title")}</h1>
        <p className="mt-2 text-sm text-zinc-600">{t("auth.login.subtitle")}</p>
        <div className="mt-6">
          <AuthForm mode="login" />
        </div>
        <p className="mt-4 text-sm text-zinc-600">
          {t("auth.login.noAccount")}{" "}
          <Link href="/signup" className="text-emerald-700 underline">
            {t("auth.signup.link")}
          </Link>
        </p>
      </AppCard>
    </main>
  );
}

