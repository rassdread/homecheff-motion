"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import {
  StudioStoryboardForm,
  type StudioStoryboardFormValues,
} from "@/components/studio/studio-storyboard-form";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { brand } from "@/lib/brand";
import {
  fetchStudioStoryboard,
  updateStudioStoryboardApi,
} from "@/lib/studio-storyboards-client";
import type { StudioStoryboardDetail } from "@/types/studio-api";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function StudioStoryboardEditPage({ params }: PageProps) {
  const { id } = use(params);
  const t = useActiveTranslator();
  const router = useRouter();
  const session = useAuthSession();
  const [storyboard, setStoryboard] = useState<StudioStoryboardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchStudioStoryboard(id);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.storyboards.error.loadFailed"));
      setStoryboard(null);
    } else {
      setStoryboard(res.data.storyboard);
    }
    setLoading(false);
  }, [id, t]);

  useEffect(() => {
    if (!session.resolved || !session.user) {
      return;
    }
    queueMicrotask(() => {
      void load();
    });
  }, [session.resolved, session.user, load]);

  const canModify = Boolean(
    storyboard && session.user && storyboard.ownerId === session.user.id
  );

  const handleSubmit = async (values: StudioStoryboardFormValues) => {
    const res = await updateStudioStoryboardApi(id, {
      title: values.title.trim(),
      description: values.description.trim(),
    });
    if (!res.ok) {
      throw new Error(
        (res.data as { error?: string }).error ?? t("studio.storyboards.error.saveFailed")
      );
    }
    router.push(`/studio/storyboards/${id}`);
  };

  return (
    <StudioAuthGate
      authTitleKey="studio.storyboards.authRequiredTitle"
      authBodyKey="studio.storyboards.authRequiredBody"
    >
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-2xl px-6 py-12 sm:px-10">
          <Link
            href={`/studio/storyboards/${id}`}
            className="text-sm font-medium text-[#006D52] hover:underline"
          >
            ← {t("studio.storyboards.backToStoryboard")}
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900">
            {t("studio.storyboards.editTitle")}
          </h1>
          {loading ? (
            <p className="mt-8 text-sm text-zinc-500">{t("button.loading")}</p>
          ) : storyboard && canModify ? (
            <div className="mt-8">
              <StudioStoryboardForm
                initial={storyboard}
                submitLabel={t("studio.storyboards.saveChanges")}
                backHref={`/studio/storyboards/${id}`}
                onSubmit={handleSubmit}
              />
            </div>
          ) : (
            <p className="mt-8 text-sm text-red-700">
              {error || t("studio.storyboards.error.forbidden")}
            </p>
          )}
        </section>
      </main>
    </StudioAuthGate>
  );
}
