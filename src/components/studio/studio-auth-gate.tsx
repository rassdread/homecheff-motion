"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { brand } from "@/lib/brand";

type StudioAuthGateProps = {
  children: ReactNode;
};

export function StudioAuthGate({ children }: StudioAuthGateProps) {
  const t = useActiveTranslator();
  const session = useAuthSession();

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
              {t("studio.characters.authRequiredTitle")}
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              {t("studio.characters.authRequiredBody")}
            </p>
            <Link
              href="/login"
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
