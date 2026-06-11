"use client";

import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { ProductPageShell } from "@/components/layout/product-page-shell";
import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";

export default function LoginPage() {
  const t = useActiveTranslator();

  return (
    <ProductPageShell contained className="!min-h-[calc(100dvh-4rem)]">
      <div className="mx-auto w-full max-w-xl py-6">
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
      </div>
    </ProductPageShell>
  );
}

