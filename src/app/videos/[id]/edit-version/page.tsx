"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { traceConceptFlow } from "@/lib/concept-flow-trace";
import { FullRerenderEditor } from "@/components/instant/full-rerender-editor";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { fetchAnimationProjectDetail } from "@/lib/instant-premium-polling-api";
import type { AnimationProjectDetailResponse } from "@/types/animation-api";

export default function VideoEditVersionPage() {
  const t = useActiveTranslator();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const session = useAuthSession();
  const [detail, setDetail] = useState<AnimationProjectDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAnimationProjectDetail(id);
      if (result.networkError) {
        setError(result.data.error ?? t("videos.error"));
        setDetail(null);
        return;
      }
      if (!result.ok) {
        const msg =
          typeof result.data.error === "string" ? result.data.error : `HTTP ${result.status}`;
        setError(msg);
        setDetail(null);
        return;
      }
      setDetail(result.data);
    } catch {
      setError(t("videos.error"));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    traceConceptFlow("edit-version.mount", { projectId: id });
  }, [id]);

  useEffect(() => {
    if (!session.resolved) {
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      if (!session.user) {
        setLoading(false);
        return;
      }
      traceConceptFlow("edit-version.fetchProject.start", { projectId: id });
      void load().then(() => {
        traceConceptFlow("edit-version.fetchProject.done", { projectId: id });
      });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [session.resolved, session.user, load, id]);

  const editorImages = useMemo(
    () =>
      (detail?.images ?? []).map((img) => ({
        id: img.id,
        previewUrl: img.previewUrl ?? "",
      })),
    [detail?.images]
  );

  const instantLike =
    detail?.projectType === "instant_premium" ||
    detail?.stylePreset === "food_promo" ||
    detail?.stylePreset === "clean_business" ||
    detail?.stylePreset === "social_boost";

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <Link
        href={`/videos/${encodeURIComponent(id)}`}
        className="text-sm font-medium text-zinc-600 underline"
      >
        {t("videos.backToProject")}
      </Link>

      {!session.resolved ?
        <p className="mt-8 text-sm text-zinc-600">{t("animate.auth.loading")}</p>
      : !session.user ?
        <p className="mt-8 text-sm text-zinc-600">{t("animate.auth.requiredTitle")}</p>
      : loading ?
        <p className="mt-8 text-sm text-zinc-600">{t("projects.concept.loading")}</p>
      : error ?
        <p className="mt-8 text-sm text-red-700">{error}</p>
      : !detail || !instantLike ?
        <p className="mt-8 text-sm text-zinc-600">{t("instant.fullRerender.failed")}</p>
      : (
        <div className="mt-6">
          <FullRerenderEditor
            projectId={id}
            layout="page"
            backHref={`/videos/${encodeURIComponent(id)}`}
            instantSceneTexts={detail.instantSceneTexts}
            instantMode={detail.instantMode}
            instantUserIntent={detail.instantUserIntent}
            instantTransitionSeconds={detail.instantTransitionSeconds ?? 5}
            uploadRole={session.user.role}
            images={editorImages}
          />
        </div>
      )}
    </main>
  );
}
