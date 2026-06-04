"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import {
  StudioStoryboardForm,
  type StudioStoryboardFormValues,
} from "@/components/studio/studio-storyboard-form";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import { createStudioStoryboardApi } from "@/lib/studio-storyboards-client";

export default function StudioStoryboardNewPage() {
  const t = useActiveTranslator();
  const router = useRouter();

  const handleSubmit = async (values: StudioStoryboardFormValues) => {
    const res = await createStudioStoryboardApi({
      title: values.title.trim(),
      description: values.description.trim(),
    });
    if (!res.ok) {
      throw new Error(
        (res.data as { error?: string }).error ?? t("studio.storyboards.error.saveFailed")
      );
    }
    router.push(`/studio/storyboards/${res.data.storyboard.id}`);
  };

  return (
    <StudioAuthGate
      authTitleKey="studio.storyboards.authRequiredTitle"
      authBodyKey="studio.storyboards.authRequiredBody"
    >
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-2xl px-6 py-12 sm:px-10">
          <Link
            href="/studio/storyboards"
            className="text-sm font-medium text-[#006D52] hover:underline"
          >
            ← {t("studio.storyboards.backToLibrary")}
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900">
            {t("studio.storyboards.createTitle")}
          </h1>
          <div className="mt-8">
            <StudioStoryboardForm
              submitLabel={t("studio.storyboards.create")}
              backHref="/studio/storyboards"
              onSubmit={handleSubmit}
            />
          </div>
        </section>
      </main>
    </StudioAuthGate>
  );
}
