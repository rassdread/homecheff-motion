"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppCard } from "@/components/ui/app-card";
import type { TranslationKey } from "@/i18n";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { loginHref } from "@/lib/auth-login-href";
import { brand } from "@/lib/brand";

type StudioAuthGateProps = {
  children: ReactNode;
  authTitleKey?: TranslationKey;
  authBodyKey?: TranslationKey;
};

export function StudioAuthGate({
  children,
  authTitleKey = "studio.characters.authRequiredTitle",
  authBodyKey = "studio.characters.authRequiredBody",
}: StudioAuthGateProps) {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const pathname = usePathname();
  const loginLink = loginHref(pathname);

  if (!session.resolved) {
    return (
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto max-w-lg px-6 py-16 text-center text-sm text-zinc-500">
          {t("button.loading")}
        </section>
      </main>
    );
  }

  if (!session.user) {
    return (
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto max-w-lg px-6 py-16">
          <AppCard className="bg-white p-8 text-center">
            <h1 className="text-xl font-semibold text-zinc-900">
              {t(authTitleKey)}
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              {t(authBodyKey)}
            </p>
            <Link
              href={loginLink}
              className="mt-6 inline-flex rounded-full border border-[#006D52]/40 bg-white px-5 py-2.5 text-sm font-semibold text-[#006D52] hover:bg-[#006D52]/5"
            >
              {t("nav.login")}
            </Link>
          </AppCard>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
