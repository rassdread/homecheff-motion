"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import {
  StudioWorldProfileForm,
  studioWorldFormToCreatePayload,
  type StudioWorldProfileFormValues,
} from "@/components/studio/studio-world-profile-form";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import { fetchStudioWorld, updateStudioWorldApi } from "@/lib/studio-worlds-client";
import type { StudioWorldProfileDetail } from "@/types/studio-api";

export default function StudioEditWorldPage() {
  const t = useActiveTranslator();
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [world, setWorld] = useState<StudioWorldProfileDetail | null>(null);

  const load = useCallback(async () => {
    const res = await fetchStudioWorld(id);
    if (res.ok) setWorld(res.data.world);
  }, [id]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const handleSubmit = async (values: StudioWorldProfileFormValues) => {
    const res = await updateStudioWorldApi(id, studioWorldFormToCreatePayload(values));
    if (!res.ok) {
      throw new Error((res.data as { error?: string }).error ?? t("studio.worlds.error.saveFailed"));
    }
    router.push(`/studio/worlds/${id}`);
  };

  return (
    <StudioAuthGate>
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-2xl px-6 py-12 sm:px-10">
          <Link href={`/studio/worlds/${id}`} className="text-sm text-[#006D52] hover:underline">
            ← {t("studio.worlds.backToWorld")}
          </Link>
          <h1 className="mt-4 text-3xl font-bold">{t("studio.worlds.editTitle")}</h1>
          {world ? (
            <StudioWorldProfileForm
              mode="edit"
              initial={world}
              submitLabel={t("studio.worlds.saveChanges")}
              backHref={`/studio/worlds/${id}`}
              onSubmit={handleSubmit}
            />
          ) : (
            <p className="mt-8 text-sm text-zinc-500">{t("button.loading")}</p>
          )}
        </section>
      </main>
    </StudioAuthGate>
  );
}
