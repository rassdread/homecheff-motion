"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import {
  StudioWorldProfileForm,
  type StudioWorldProfileFormValues,
} from "@/components/studio/studio-world-profile-form";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import { completeAssetLifecycleAfterCreate } from "@/lib/studio-asset-lifecycle-client";
import {
  buildWorldDetailFromPrefill,
  readIdentityPrefillForKind,
} from "@/lib/studio-identity-builder-prefill-detail";
import { clearIdentityBuilderPrefill } from "@/lib/studio-identity-builder-prefill-storage";
import { createStudioWorldApi } from "@/lib/studio-worlds-client";
import { studioWorkspaceHref } from "@/lib/studio-workspace-href";
import type { IdentityBuilderPrefill } from "@/types/studio-asset-decision";

export default function StudioNewWorldPage() {
  const t = useActiveTranslator();
  const router = useRouter();
  const [prefill] = useState<IdentityBuilderPrefill | null>(() => readIdentityPrefillForKind("world"));
  const prefillWorld = prefill ? buildWorldDetailFromPrefill(prefill) : undefined;

  const handleSubmit = async (values: StudioWorldProfileFormValues) => {
    const res = await createStudioWorldApi(values);
    if (!res.ok) {
      throw new Error((res.data as { error?: string }).error ?? t("studio.worlds.error.saveFailed"));
    }

    if (prefill?.storyboardId) {
      completeAssetLifecycleAfterCreate({
        storyboardId: prefill.storyboardId,
        kind: "world",
        createdEntityId: res.data.world.id,
        createdName: values.name,
        decisionId: prefill.decisionId,
      });
      clearIdentityBuilderPrefill();
      router.push(studioWorkspaceHref(prefill.storyboardId));
      return;
    }

    clearIdentityBuilderPrefill();
    router.push(`/studio/worlds/${res.data.world.id}`);
  };

  return (
    <StudioAuthGate>
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-2xl px-6 py-12 sm:px-10">
          <Link href="/studio/worlds" className="text-sm text-[#006D52] hover:underline">
            ← {t("studio.worlds.backToLibrary")}
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-zinc-900">{t("studio.worlds.createTitle")}</h1>
          <StudioWorldProfileForm
            key={prefillWorld?.id ?? "new-world"}
            submitLabel={t("studio.worlds.save")}
            backHref="/studio/worlds"
            initial={prefillWorld}
            onSubmit={handleSubmit}
          />
        </section>
      </main>
    </StudioAuthGate>
  );
}
