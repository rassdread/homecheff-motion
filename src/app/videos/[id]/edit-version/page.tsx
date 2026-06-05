"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConceptEditVersionDebugPanel } from "@/components/instant/concept-edit-version-debug-panel";
import { FullRerenderEditor } from "@/components/instant/full-rerender-editor";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  patchConceptFlowDebug,
  resetConceptFlowDebug,
} from "@/lib/concept-flow-debug-state";
import { traceConceptFlow } from "@/lib/concept-flow-trace";
import { invalidateAuthSessionCache, fetchAuthSessionJson } from "@/lib/auth-session-client";
import { fetchAnimationProjectDetail } from "@/lib/instant-premium-polling-api";
import type { AnimationProjectDetailResponse } from "@/types/animation-api";

const PROJECT_FETCH_TIMEOUT_MS = 25_000;

export default function VideoEditVersionPage() {
  const t = useActiveTranslator();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const session = useAuthSession();
  const [detail, setDetail] = useState<AnimationProjectDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projectFetchPending, setProjectFetchPending] = useState(false);
  const projectFetchStartedRef = useRef(false);

  const isAdmin = session.user?.role === "admin";

  useEffect(() => {
    resetConceptFlowDebug(id);
    traceConceptFlow("edit-version page mounted", { projectId: id });
    invalidateAuthSessionCache();
    void fetchAuthSessionJson({ force: true }).catch(() => undefined);
  }, [id]);

  useEffect(() => {
    patchConceptFlowDebug({
      projectId: id,
      sessionResolved: session.resolved,
      sessionUser: Boolean(session.user),
    });
  }, [id, session.resolved, session.user]);

  const loadProject = useCallback(async () => {
    if (!id) {
      return;
    }
    setProjectFetchPending(true);
    patchConceptFlowDebug({ projectFetchPending: true });
    setError(null);
    traceConceptFlow("project fetch start", { projectId: id });

    const timeout = window.setTimeout(() => {
      const msg = "Project fetch timed out.";
      traceConceptFlow("project fetch fail", { projectId: id, error: msg });
      setError(msg);
      setProjectFetchPending(false);
      patchConceptFlowDebug({ projectFetchPending: false, lastError: msg });
    }, PROJECT_FETCH_TIMEOUT_MS);

    try {
      const result = await fetchAnimationProjectDetail(id);
      window.clearTimeout(timeout);
      if (result.networkError) {
        const msg = result.data.error ?? "Network error.";
        traceConceptFlow("project fetch fail", { projectId: id, error: msg });
        setError(msg);
        setDetail(null);
        return;
      }
      if (!result.ok) {
        const msg =
          typeof result.data.error === "string" ? result.data.error : `HTTP ${result.status}`;
        traceConceptFlow("project fetch fail", { projectId: id, error: msg });
        setError(msg);
        setDetail(null);
        return;
      }
      traceConceptFlow("project fetch success", {
        projectId: id,
        imagesCount: result.data.images?.length ?? 0,
      });
      setDetail(result.data);
      patchConceptFlowDebug({
        projectLoaded: true,
        imagesCount: result.data.images?.length ?? 0,
      });
    } catch (e) {
      window.clearTimeout(timeout);
      const msg = e instanceof Error ? e.message : "Project fetch failed.";
      traceConceptFlow("project fetch fail", { projectId: id, error: msg });
      setError(msg);
      setDetail(null);
    } finally {
      setProjectFetchPending(false);
      patchConceptFlowDebug({ projectFetchPending: false });
    }
  }, [id]);

  useEffect(() => {
    if (!session.resolved || !session.user || !id) {
      return;
    }
    if (projectFetchStartedRef.current) {
      return;
    }
    projectFetchStartedRef.current = true;
    void loadProject();
  }, [session.resolved, session.user, id, loadProject]);

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

  const showProjectSpinner = session.resolved && Boolean(session.user) && projectFetchPending;

  const handleEditorFlowPatch = useCallback(
    (patch: {
      bootstrapStarted?: boolean;
      bootstrapFinished?: boolean;
      draftFetchPending?: boolean;
      loadState?: string;
      slotsCount?: number;
      lastError?: string | null;
    }) => {
      patchConceptFlowDebug(patch);
    },
    []
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <Link
        href={
          detail?.sourceProjectId
            ? `/videos/${encodeURIComponent(detail.sourceProjectId)}`
            : `/videos?section=concepts`
        }
        className="text-sm font-medium text-zinc-600 underline"
      >
        {detail?.sourceProjectId
          ? t("projects.concept.backToSource")
          : t("projects.concept.backToConcepts")}
      </Link>

      <ConceptEditVersionDebugPanel isAdmin={isAdmin} />

      {!session.resolved ?
        <p className="mt-8 text-sm text-zinc-600">{t("animate.auth.loading")}</p>
      : !session.user ?
        <p className="mt-8 text-sm text-zinc-600">{t("animate.auth.requiredTitle")}</p>
      : showProjectSpinner ?
        <p className="mt-8 text-sm text-zinc-600">{t("projects.concept.projectLoading")}</p>
      : error ?
        <div className="mt-8 space-y-3">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => {
              projectFetchStartedRef.current = false;
              void loadProject();
            }}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium"
          >
            {t("projects.concept.retryLoad")}
          </button>
          <Link
            href={`/videos/${encodeURIComponent(id)}`}
            className="ml-2 inline-block text-sm font-medium text-zinc-700 underline"
          >
            {t("projects.concept.backToProject")}
          </Link>
        </div>
      : !detail || !instantLike ?
        <p className="mt-8 text-sm text-zinc-600">{t("instant.fullRerender.failed")}</p>
      : (
        <div className="mt-6 space-y-4">
          <FullRerenderEditor
            draftLineage={detail.draftLineage ?? null}
            bundleCatalog={detail.bundleCatalog ?? null}
            defaultLanguageCode={detail.sourceLanguage ?? detail.draftLineage?.sourceLanguage ?? "nl"}
            projectId={id}
            layout="page"
            backHref={
              detail.sourceProjectId
                ? `/videos/${encodeURIComponent(detail.sourceProjectId)}`
                : `/videos?section=concepts`
            }
            instantSceneTexts={detail.instantSceneTexts}
            instantMode={detail.instantMode}
            instantUserIntent={detail.instantUserIntent}
            instantTransitionSeconds={detail.instantTransitionSeconds ?? 5}
            uploadRole={session.user.role}
            images={editorImages}
            onMounted={() => {
              patchConceptFlowDebug({ editorMounted: true });
              traceConceptFlow("editor mounted", { projectId: id });
            }}
            onFlowDebug={handleEditorFlowPatch}
          />
        </div>
      )}
    </main>
  );
}
