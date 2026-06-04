"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import {
  StudioWorldProfileForm,
  type StudioWorldProfileFormValues,
} from "@/components/studio/studio-world-profile-form";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import { createStudioWorldApi } from "@/lib/studio-worlds-client";

export default function StudioNewWorldPage() {
  const t = useActiveTranslator();
  const router = useRouter();

  const handleSubmit = async (values: StudioWorldProfileFormValues) => {
    const res = await createStudioWorldApi(values);
    if (!res.ok) {
      throw new Error((res.data as { error?: string }).error ?? t("studio.worlds.error.saveFailed"));
    }
    router.push(`/studio/worlds/${res.data.world.id}`);
  };

  return (
    <StudioAuthGate>
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-2xl px-6 py-12 sm:px-10">
          <Link href="/studio/worlds" className="text-sm text-[#006D52] hover:underline">
            ← {t("studio.worlds.backToLibrary")}
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-zinc-900">{t("studio.worlds.createTitle")}</h1>
          <StudioWorldProfileForm
            submitLabel={t("studio.worlds.save")}
            backHref="/studio/worlds"
            onSubmit={handleSubmit}
          />
        </section>
      </main>
    </StudioAuthGate>
  );
}
