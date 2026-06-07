"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import {
  StudioLocationForm,
  type StudioLocationFormValues,
} from "@/components/studio/studio-location-form";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import { completeAssetLifecycleAfterCreate } from "@/lib/studio-asset-lifecycle-client";
import { createStudioLocationApi } from "@/lib/studio-locations-client";
import {
  buildLocationDetailFromPrefill,
  readIdentityPrefillForKind,
} from "@/lib/studio-identity-builder-prefill-detail";
import { clearIdentityBuilderPrefill } from "@/lib/studio-identity-builder-prefill-storage";
import { studioWorkspaceHref } from "@/lib/studio-workspace-href";
import type { IdentityBuilderPrefill } from "@/types/studio-asset-decision";

export default function StudioLocationNewPage() {
  const t = useActiveTranslator();
  const router = useRouter();
  const [prefill] = useState<IdentityBuilderPrefill | null>(() => readIdentityPrefillForKind("location"));
  const prefillLocation = prefill ? buildLocationDetailFromPrefill(prefill) : undefined;

  const handleSubmit = async (values: StudioLocationFormValues) => {
    const res = await createStudioLocationApi({
      name: values.name,
      category: values.category,
      description: values.description,
      referenceImageUrl: values.referenceImageUrl,
      referenceStorageKey: values.referenceStorageKey,
    });
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
            <StudioLocationForm
              key={prefillLocation?.id ?? "new-location"}
              mode="create"
              submitLabel={t("studio.locations.save")}
              backHref="/studio/locations"
              initial={prefillLocation}
              onSubmit={handleSubmit}
            />
          </div>
        </section>
      </main>
    </StudioAuthGate>
  );
}
