"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { StudioAssetCreationPage } from "@/components/studio/studio-asset-creation-page";
import type { AssetCreationWizardResult } from "@/components/studio/studio-asset-creation-wizard";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import {
  StudioCharacterForm,
  studioCharacterFormToCreatePayload,
  type StudioCharacterFormValues,
} from "@/components/studio/studio-character-form";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import { completeAssetLifecycleAfterCreate } from "@/lib/studio-asset-lifecycle-client";
import { characterFormValuesFromWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { createStudioCharacterApi } from "@/lib/studio-characters-client";
import {
  buildCharacterDetailFromPrefill,
  readIdentityPrefillForKind,
} from "@/lib/studio-identity-builder-prefill-detail";
import { clearIdentityBuilderPrefill } from "@/lib/studio-identity-builder-prefill-storage";
import { studioWorkspaceHref } from "@/lib/studio-workspace-href";
import type { IdentityBuilderPrefill } from "@/types/studio-asset-decision";

function StudioCharacterNewPageContent() {
  const t = useActiveTranslator();
  const router = useRouter();
  const searchParams = useSearchParams();
  const guided = searchParams.get("advanced") !== "1";
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

  const handleWizardSave = async (result: AssetCreationWizardResult) => {
    const values = characterFormValuesFromWizardDraft(result.draft);
    await handleSubmit(values);
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
            <StudioAssetCreationPage
              kind="character"
              guidedQueryParam={guided}
              startInAdvancedMode={searchParams.get("advanced") === "1"}
              hasDecisionPrefill={Boolean(prefill)}
              onWizardSave={handleWizardSave}
            >
              {(ctx) => (
                <StudioCharacterForm
                  key={`${prefillCharacter?.id ?? "new-character"}-${ctx.entryPath ?? "none"}-${ctx.proposalApplied}`}
                  mode="create"
                  submitLabel={t("studio.characters.save")}
                  backHref="/studio/characters"
                  initial={prefillCharacter}
                  identityPrefill={prefill}
                  wizardEntryPath={ctx.entryPath}
                  wizardProposal={ctx.wizardProposal}
                  wizardProposalApplied={ctx.proposalApplied}
                  wizardDraft={ctx.wizardDraft}
                  onSubmit={handleSubmit}
                />
              )}
            </StudioAssetCreationPage>
          </div>
        </section>
      </main>
    </StudioAuthGate>
  );
}

export default function StudioCharacterNewPage() {
  return (
    <Suspense fallback={<main className="flex-1 px-6 py-12 text-sm text-zinc-600">…</main>}>
      <StudioCharacterNewPageContent />
    </Suspense>
  );
}
