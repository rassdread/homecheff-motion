"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { StudioAssetCreationPage } from "@/components/studio/studio-asset-creation-page";
import type { AssetCreationWizardResult } from "@/components/studio/studio-asset-creation-wizard";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import {
  StudioLocationForm,
  studioLocationFormToCreatePayload,
  type StudioLocationFormValues,
} from "@/components/studio/studio-location-form";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import { completeAssetLifecycleAfterCreate } from "@/lib/studio-asset-lifecycle-client";
import {
  buildLocationDetailFromPrefill,
  readIdentityPrefillForKind,
} from "@/lib/studio-identity-builder-prefill-detail";
import { clearIdentityBuilderPrefill } from "@/lib/studio-identity-builder-prefill-storage";
import { locationFormValuesFromWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { createStudioLocationApi } from "@/lib/studio-locations-client";
import { studioWorkspaceHref } from "@/lib/studio-workspace-href";
import type { IdentityBuilderPrefill } from "@/types/studio-asset-decision";

function StudioLocationNewPageContent() {
  const t = useActiveTranslator();
  const router = useRouter();
  const searchParams = useSearchParams();
  const guided = searchParams.get("guided") === "1";
  const [prefill] = useState<IdentityBuilderPrefill | null>(() => readIdentityPrefillForKind("location"));
  const prefillLocation = prefill ? buildLocationDetailFromPrefill(prefill) : undefined;

  const handleSubmit = async (values: StudioLocationFormValues) => {
    const res = await createStudioLocationApi(studioLocationFormToCreatePayload(values));
    if (!res.ok) {
      throw new Error((res.data as { error?: string }).error ?? t("studio.locations.error.saveFailed"));
    }

    if (prefill?.storyboardId) {
      completeAssetLifecycleAfterCreate({
        storyboardId: prefill.storyboardId,
        kind: "location",
        createdEntityId: res.data.location.id,
        createdName: values.name,
        decisionId: prefill.decisionId,
      });
      clearIdentityBuilderPrefill();
      router.push(studioWorkspaceHref(prefill.storyboardId));
      return;
    }

    clearIdentityBuilderPrefill();
    router.push(`/studio/locations/${res.data.location.id}`);
  };

  const handleWizardSave = async (result: AssetCreationWizardResult) => {
    const values = locationFormValuesFromWizardDraft(result.draft);
    await handleSubmit(values);
  };

  return (
    <StudioAuthGate
      authTitleKey="studio.locations.authRequiredTitle"
      authBodyKey="studio.locations.authRequiredBody"
    >
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-2xl px-6 py-12 sm:px-10">
          <Link href="/studio/locations" className="text-sm font-medium text-[#006D52] hover:underline">
            ← {t("studio.locations.backToLibrary")}
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900">{t("studio.locations.createTitle")}</h1>
          <div className="mt-8">
            <StudioAssetCreationPage
              kind="location"
              guidedQueryParam={guided}
              hasDecisionPrefill={Boolean(prefill)}
              onWizardSave={handleWizardSave}
            >
              {(ctx) => (
                <StudioLocationForm
                  key={`${prefillLocation?.id ?? "new-location"}-${ctx.entryPath ?? "none"}-${ctx.proposalApplied}`}
                  mode="create"
                  submitLabel={t("studio.locations.save")}
                  backHref="/studio/locations"
                  initial={prefillLocation}
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

export default function StudioLocationNewPage() {
  return (
    <Suspense fallback={<main className="flex-1 px-6 py-12 text-sm text-zinc-600">…</main>}>
      <StudioLocationNewPageContent />
    </Suspense>
  );
}
