"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { StudioAssetCreationPage } from "@/components/studio/studio-asset-creation-page";
import type { AssetCreationWizardResult } from "@/components/studio/studio-asset-creation-wizard";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import {
  StudioWorldProfileForm,
  studioWorldFormToCreatePayload,
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
import { worldFormValuesFromWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { createStudioWorldApi } from "@/lib/studio-worlds-client";
import { studioWorkspaceHref } from "@/lib/studio-workspace-href";
import type { IdentityBuilderPrefill } from "@/types/studio-asset-decision";

function StudioNewWorldPageContent() {
  const t = useActiveTranslator();
  const router = useRouter();
  const searchParams = useSearchParams();
  const guided = searchParams.get("guided") === "1";
  const [prefill] = useState<IdentityBuilderPrefill | null>(() => readIdentityPrefillForKind("world"));
  const prefillWorld = prefill ? buildWorldDetailFromPrefill(prefill) : undefined;

  const handleSubmit = async (values: StudioWorldProfileFormValues) => {
    const res = await createStudioWorldApi(studioWorldFormToCreatePayload(values));
    if (!res.ok) {
      throw new Error((res.data as { error?: string }).error ?? t("studio.worlds.error.saveFailed"));
    }

    if (prefill?.storyboardId) {
      completeAssetLifecycleAfterCreate({
        storyboardId: prefill.storyboardId,
        kind: "world",
        createdEntityId: res.data.world.id,
        createdName: values.identity.name,
        decisionId: prefill.decisionId,
      });
      clearIdentityBuilderPrefill();
      router.push(studioWorkspaceHref(prefill.storyboardId));
      return;
    }

    clearIdentityBuilderPrefill();
    router.push(`/studio/worlds/${res.data.world.id}`);
  };

  const handleWizardSave = async (result: AssetCreationWizardResult) => {
    const values = worldFormValuesFromWizardDraft(result.draft);
    await handleSubmit(values);
  };

  return (
    <StudioAuthGate>
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-2xl px-6 py-12 sm:px-10">
          <Link href="/studio/worlds" className="text-sm text-[#006D52] hover:underline">
            ← {t("studio.worlds.backToLibrary")}
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-zinc-900">{t("studio.worlds.createTitle")}</h1>
          <div className="mt-8">
            <StudioAssetCreationPage
              kind="world"
              guidedQueryParam={guided}
              hasDecisionPrefill={Boolean(prefill)}
              onWizardSave={handleWizardSave}
            >
              {(ctx) => (
                <StudioWorldProfileForm
                  key={`${prefillWorld?.id ?? "new-world"}-${ctx.entryPath ?? "none"}-${ctx.proposalApplied}`}
                  mode="create"
                  submitLabel={t("studio.worlds.save")}
                  backHref="/studio/worlds"
                  initial={prefillWorld}
                  createEntryPath={ctx.entryPath}
                  wizardProposal={ctx.wizardProposal}
                  proposalApplied={ctx.proposalApplied}
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

export default function StudioNewWorldPage() {
  return (
    <Suspense fallback={<main className="flex-1 px-6 py-12 text-sm text-zinc-600">…</main>}>
      <StudioNewWorldPageContent />
    </Suspense>
  );
}
