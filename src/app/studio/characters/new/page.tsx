"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import {
  StudioCharacterForm,
  studioCharacterFormToCreatePayload,
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
    const res = await createStudioCharacterApi(studioCharacterFormToCreatePayload(values));
    if (!res.ok) {
      throw new Error((res.data as { error?: string }).error ?? t("studio.characters.error.saveFailed"));
    }

    if (prefill?.storyboardId) {
      completeAssetLifecycleAfterCreate({
        storyboardId: prefill.storyboardId,
        kind: "character",
        createdEntityId: res.data.character.id,
        createdName: values.identity.name,
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
        <section className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-10">
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
              identityPrefill={prefill}
              onSubmit={handleSubmit}
            />
          </div>
        </section>
      </main>
    </StudioAuthGate>
  );
}
