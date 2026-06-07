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
import { createStudioCharacterApi } from "@/lib/studio-characters-client";
import {
  clearIdentityBuilderPrefill,
  loadIdentityBuilderPrefill,
} from "@/lib/studio-identity-builder-prefill-storage";
import type { IdentityBuilderPrefill } from "@/types/studio-asset-decision";
import type { StudioCharacterDetail } from "@/types/studio-api";

function buildPrefillCharacterDetail(
  prefill: IdentityBuilderPrefill
): StudioCharacterDetail {
  return {
    id: "prefill",
    ownerId: "",
    name: prefill.name,
    slug: prefill.name.toLowerCase().replace(/\s+/g, "-"),
    role: (prefill.role as StudioCharacterFormValues["role"]) ?? "mascot",
    description: prefill.description ?? "",
    personality: prefill.personality ?? "",
    referenceImageUrl: "",
    isMascot: prefill.role === "mascot",
    appearanceMemory: "",
    personalityMemory: "",
    continuityNotes: prefill.usageContext ?? "",
    defaultClothing: "",
    defaultAccessories: "",
    visualKeywords: "",
    primaryReferenceImageId: null,
    referenceNotes: "",
    identityStrength: "strong",
    continuityStrength: "strong",
    worldProfileId: null,
    worldProfile: null,
    voiceEnabled: false,
    voiceProvider: "",
    voiceProfile: "warm_narrator",
    voiceLanguage: "en",
    voiceGender: "",
    voiceDescription: "",
    voiceNotes: "",
    voiceLock: false,
    voiceProfilesByLanguage: {},
    performanceEnabled: false,
    defaultSmileStrength: 50,
    defaultBlinkRate: "normal",
    defaultHeadMovement: "subtle",
    defaultMouthIntensity: "medium",
    idleAnimationStyle: "neutral",
    performanceNotes: "",
    mouthAnimationEnabled: false,
    mouthClosedAssetUrl: "",
    mouthSmallAssetUrl: "",
    mouthMediumAssetUrl: "",
    mouthWideAssetUrl: "",
    referenceStorageKey: "",
    isSystemCharacter: false,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

function readPrefillCharacterDetail(): StudioCharacterDetail | undefined {
  const prefill = loadIdentityBuilderPrefill();
  if (!prefill || prefill.kind !== "character") {
    return undefined;
  }
  clearIdentityBuilderPrefill();
  return buildPrefillCharacterDetail(prefill);
}

export default function StudioCharacterNewPage() {
  const t = useActiveTranslator();
  const router = useRouter();
  const [prefillCharacter] = useState(readPrefillCharacterDetail);

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
