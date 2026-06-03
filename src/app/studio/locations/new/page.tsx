"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import {
  StudioLocationForm,
  type StudioLocationFormValues,
} from "@/components/studio/studio-location-form";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import { createStudioLocationApi } from "@/lib/studio-locations-client";

export default function StudioLocationNewPage() {
  const t = useActiveTranslator();
  const router = useRouter();

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
              mode="create"
              submitLabel={t("studio.locations.save")}
              backHref="/studio/locations"
              onSubmit={handleSubmit}
            />
          </div>
        </section>
      </main>
    </StudioAuthGate>
  );
}
