"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { WorkspaceLoadingSkeleton } from "@/components/ui/motion-studio-primitives";
import { AppCard } from "@/components/ui/app-card";
import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import { createDefaultStudioStoryboard } from "@/lib/studio-create-story-client";

function StudioStoryboardAutoCreate() {
  const t = useActiveTranslator();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await createDefaultStudioStoryboard(t("studio.storyboards.defaultTitle"));
      if (cancelled) {
        return;
      }
      if (result.ok) {
        router.replace(result.href);
        return;
      }
      setError(result.error || t("studio.storyboards.error.saveFailed"));
    })();

    return () => {
      cancelled = true;
    };
  }, [router, t]);

  if (error) {
    return (
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto max-w-lg px-6 py-16">
          <AppCard className="bg-white p-8 text-center">
            <h1 className="text-xl font-semibold text-zinc-900">
              {t("studio.storyboards.error.saveFailed")}
            </h1>
            <p className="mt-2 text-sm text-zinc-600">{error}</p>
            <Link
              href="/studio"
              className="mt-6 inline-flex rounded-full bg-[#006D52] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#005a44]"
            >
              {t("studio.placeholder.back")}
            </Link>
          </AppCard>
        </section>
      </main>
    );
  }

  return (
    <main className="flex-1">
      <WorkspaceLoadingSkeleton />
    </main>
  );
}

export default function StudioStoryboardNewPage() {
  return (
    <StudioAuthGate
      authTitleKey="studio.storyboards.authRequiredTitle"
      authBodyKey="studio.storyboards.authRequiredBody"
    >
      <StudioStoryboardAutoCreate />
    </StudioAuthGate>
  );
}
