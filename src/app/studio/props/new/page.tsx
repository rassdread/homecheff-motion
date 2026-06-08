"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { StudioAssetCreationPage } from "@/components/studio/studio-asset-creation-page";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import {
  StudioPropForm,
  studioPropFormToCreatePayload,
  type StudioPropFormValues,
} from "@/components/studio/studio-prop-form";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import { completeAssetLifecycleAfterCreate } from "@/lib/studio-asset-lifecycle-client";
import {
  buildPropDetailFromPrefill,
  readIdentityPrefillForKind,
} from "@/lib/studio-identity-builder-prefill-detail";
import { clearIdentityBuilderPrefill } from "@/lib/studio-identity-builder-prefill-storage";
import { createStudioPropApi } from "@/lib/studio-props-client";
import { studioWorkspaceHref } from "@/lib/studio-workspace-href";
import type { IdentityBuilderPrefill } from "@/types/studio-asset-decision";

function StudioPropNewPageContent() {
  const t = useActiveTranslator();
  const router = useRouter();
  const searchParams = useSearchParams();
  const guided = searchParams.get("guided") === "1";
  const [prefill] = useState<IdentityBuilderPrefill | null>(() => readIdentityPrefillForKind("prop"));
  const prefillProp = prefill ? buildPropDetailFromPrefill(prefill) : undefined;

  const handleSubmit = async (values: StudioPropFormValues) => {
    const res = await createStudioPropApi(studioPropFormToCreatePayload(values));
    if (!res.ok) {
      throw new Error((res.data as { error?: string }).error ?? t("studio.props.error.saveFailed"));
    }

    if (prefill?.storyboardId) {
      completeAssetLifecycleAfterCreate({
        storyboardId: prefill.storyboardId,
        kind: "prop",
        createdEntityId: res.data.prop.id,
        createdName: values.name,
        decisionId: prefill.decisionId,
      });
      clearIdentityBuilderPrefill();
      router.push(studioWorkspaceHref(prefill.storyboardId));
      return;
    }

    clearIdentityBuilderPrefill();
    router.push(`/studio/props/${res.data.prop.id}`);
  };

  return (
    <StudioAuthGate
      authTitleKey="studio.props.authRequiredTitle"
      authBodyKey="studio.props.authRequiredBody"
    >
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-2xl px-6 py-12 sm:px-10">
          <Link href="/studio/props" className="text-sm font-medium text-[#006D52] hover:underline">
            ← {t("studio.props.backToLibrary")}
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900">{t("studio.props.createTitle")}</h1>
          <div className="mt-8">
            <StudioAssetCreationPage
              kind="prop"
              guidedQueryParam={guided}
              hasDecisionPrefill={Boolean(prefill)}
            >
              {(ctx) => (
                <StudioPropForm
                  key={`${prefillProp?.id ?? "new-prop"}-${ctx.entryPath ?? "none"}-${ctx.proposalApplied}`}
                  mode="create"
                  submitLabel={t("studio.props.save")}
                  backHref="/studio/props"
                  initial={prefillProp}
                  createEntryPath={ctx.entryPath}
                  wizardProposal={ctx.wizardProposal}
                  proposalApplied={ctx.proposalApplied}
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

export default function StudioPropNewPage() {
  return (
    <Suspense fallback={<main className="flex-1 px-6 py-12 text-sm text-zinc-600">…</main>}>
      <StudioPropNewPageContent />
    </Suspense>
  );
}
