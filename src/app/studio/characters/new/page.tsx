"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import {
  StudioCharacterForm,
  type StudioCharacterFormValues,
} from "@/components/studio/studio-character-form";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import { completeAssetLifecycleAfterCreate } from "@/lib/studio-asset-lifecycle-client";
import { createStudioCharacterApi } from "@/lib/studio-characters-client";
import {
  buildCharacterDetailFromPrefill,
  readIdentityPrefillForKind,
} from "@/lib/studio-identity-builder-prefill-detail";
import { clearIdentityBuilderPrefill } from "@/lib/studio-identity-builder-prefill-storage";
import { studioWorkspaceHref } from "@/lib/studio-workspace-href";
import type { IdentityBuilderPrefill } from "@/types/studio-asset-decision";

export default function StudioCharacterNewPage() {
  const t = useActiveTranslator();
  const router = useRouter();
  const [prefill] = useState<IdentityBuilderPrefill | null>(() => readIdentityPrefillForKind("character"));
  const prefillCharacter = prefill ? buildCharacterDetailFromPrefill(prefill) : undefined;

  const handleSubmit = async (values: StudioCharacterFormValues) => {
    const res = await createStudioCharacterApi({
      name: values.name,
      role: values.role,
      description: values.description,
      personality: values.personality,
      referenceImageUrl: values.referenceImageUrl,
      referenceStorageKey: values.referenceStorageKey,
      voiceEnabled: values.voice.voiceEnabled,
      voiceProvider: values.voice.voiceProvider,
      voiceProfile: values.voice.voiceProfile,
      voiceLanguage: values.voice.voiceLanguage,
      voiceGender: values.voice.voiceGender,
      voiceDescription: values.voice.voiceDescription,
      voiceNotes: values.voice.voiceNotes,
      voiceLock: values.voice.voiceLock,
      voiceProfilesByLanguage: values.voice.voiceProfilesByLanguage,
      performanceEnabled: values.performance.performanceEnabled,
      defaultSmileStrength: values.performance.defaultSmileStrength,
      defaultBlinkRate: values.performance.defaultBlinkRate,
      defaultHeadMovement: values.performance.defaultHeadMovement,
      defaultMouthIntensity: values.performance.defaultMouthIntensity,
      idleAnimationStyle: values.performance.idleAnimationStyle,
      performanceNotes: values.performance.performanceNotes,
      mouthAnimationEnabled: values.performance.mouthAnimationEnabled,
      mouthClosedAssetUrl: values.performance.mouthClosedAssetUrl,
      mouthSmallAssetUrl: values.performance.mouthSmallAssetUrl,
      mouthMediumAssetUrl: values.performance.mouthMediumAssetUrl,
      mouthWideAssetUrl: values.performance.mouthWideAssetUrl,
    });
    if (!res.ok) {
      throw new Error((res.data as { error?: string }).error ?? t("studio.characters.error.saveFailed"));
    }

    if (prefill?.storyboardId) {
      completeAssetLifecycleAfterCreate({
        storyboardId: prefill.storyboardId,
        kind: "character",
        createdEntityId: res.data.character.id,
        createdName: values.name,
        decisionId: prefill.decisionId,
      });
      clearIdentityBuilderPrefill();
      router.push(studioWorkspaceHref(prefill.storyboardId));
      return;
    }

    clearIdentityBuilderPrefill();
    router.push(`/studio/characters/${res.data.character.id}`);
  };

  return (
    <StudioAuthGate>
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-2xl px-6 py-12 sm:px-10">
          <Link href="/studio/characters" className="text-sm font-medium text-[#006D52] hover:underline">
            ← {t("studio.characters.backToLibrary")}
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900">{t("studio.characters.createTitle")}</h1>
          <div className="mt-8">
            <StudioCharacterForm
              key={prefillCharacter?.id ?? "new-character"}
              mode="create"
              submitLabel={t("studio.characters.save")}
              backHref="/studio/characters"
              initial={prefillCharacter}
              onSubmit={handleSubmit}
            />
          </div>
        </section>
      </main>
    </StudioAuthGate>
  );
}
