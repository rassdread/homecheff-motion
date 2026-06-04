"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { StudioPropForm, type StudioPropFormValues } from "@/components/studio/studio-prop-form";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import { createStudioPropApi } from "@/lib/studio-props-client";

export default function StudioPropNewPage() {
  const t = useActiveTranslator();
  const router = useRouter();

  const handleSubmit = async (values: StudioPropFormValues) => {
    const res = await createStudioPropApi({
      name: values.name,
      category: values.category,
      description: values.description,
      referenceImageUrl: values.referenceImageUrl,
      referenceStorageKey: values.referenceStorageKey,
    });
    if (!res.ok) {
      throw new Error((res.data as { error?: string }).error ?? t("studio.props.error.saveFailed"));
    }
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
            <StudioPropForm
              mode="create"
              submitLabel={t("studio.props.save")}
              backHref="/studio/props"
              onSubmit={handleSubmit}
            />
          </div>
        </section>
      </main>
    </StudioAuthGate>
  );
}
