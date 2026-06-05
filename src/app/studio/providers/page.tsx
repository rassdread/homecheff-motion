"use client";

import Link from "next/link";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { StudioProviderManagerPanel } from "@/components/studio/studio-provider-manager-panel";
import { useActiveTranslator } from "@/i18n/client";

export default function StudioProvidersPage() {
  const t = useActiveTranslator();

  return (
    <StudioAuthGate>
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <Link href="/studio" className="text-sm font-medium text-zinc-600 underline">
          {t("studio.providers.back")}
        </Link>
        <h1 className="mt-4 text-xl font-semibold text-zinc-900">{t("studio.providers.pageTitle")}</h1>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.providers.pageHint")}</p>
        <StudioProviderManagerPanel className="mt-6" />
      </main>
    </StudioAuthGate>
  );
}
