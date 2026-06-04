"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { StudioSortableSceneCard } from "@/components/studio/studio-sortable-scene-card";
import { StudioStoryboardTimeline } from "@/components/studio/studio-storyboard-timeline";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { brand } from "@/lib/brand";
import { reorderSceneIds } from "@/lib/studio-scene-order";
import { fetchStudioCharacters } from "@/lib/studio-characters-client";
import { fetchStudioLocations } from "@/lib/studio-locations-client";
import { fetchStudioProps } from "@/lib/studio-props-client";
import {
  STUDIO_PROMPT_STYLE_PROFILES,
  normalizeStudioPromptStyleProfile,
  type StudioPromptStyleProfile,
} from "@/lib/studio-prompt-style-profiles";
import { StudioConsistencyTimelinePanel } from "@/components/studio/studio-consistency-timeline-panel";
import { StudioStoryboardCorrectionPanel } from "@/components/studio/studio-storyboard-correction-panel";
import {
  analyzeStudioStoryboardConsistencyApi,
  bulkGenerateStudioSceneImagesApi,
  generateStoryboardCorrectionsApi,
} from "@/lib/studio-scene-images-client";
import type { StoryboardConsistencyReport } from "@/types/studio-consistency";
import type { StoryboardCorrectionSummary } from "@/types/studio-correction";
import {
  createStudioSceneApi,
  deleteStudioSceneApi,
  duplicateStudioSceneApi,
  fetchStudioStoryboard,
  reorderStudioScenesApi,
  updateStudioSceneApi,
  updateStudioStoryboardApi,
} from "@/lib/studio-storyboards-client";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
} from "@/types/studio-api";
import type { StudioSceneUpdateInput } from "@/lib/studio-scene-validation";

type StudioStoryboardEditorProps = {
  storyboardId: string;
};

export function StudioStoryboardEditor({ storyboardId }: StudioStoryboardEditorProps) {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const [storyboard, setStoryboard] = useState<StudioStoryboardDetail | null>(null);
  const [locations, setLocations] = useState<StudioLocationListItem[]>([]);
  const [characters, setCharacters] = useState<StudioCharacterListItem[]>([]);
  const [props, setProps] = useState<StudioPropListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingSceneId, setSavingSceneId] = useState<string | null>(null);
  const [busySceneId, setBusySceneId] = useState<string | null>(null);
  const [savingStyleProfile, setSavingStyleProfile] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState("");
  const [analyzingConsistency, setAnalyzingConsistency] = useState(false);
  const [consistencyReport, setConsistencyReport] = useState<StoryboardConsistencyReport | null>(
    null
  );
  const [correctionSummary, setCorrectionSummary] = useState<StoryboardCorrectionSummary | null>(
    null
  );
  const [generatingCorrections, setGeneratingCorrections] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [sbRes, locRes, charRes, propRes] = await Promise.all([
      fetchStudioStoryboard(storyboardId),
      fetchStudioLocations(),
      fetchStudioCharacters(),
      fetchStudioProps(),
    ]);
    if (!sbRes.ok) {
      setError((sbRes.data as { error?: string }).error ?? t("studio.storyboards.error.loadFailed"));
      setStoryboard(null);
    } else {
      setStoryboard(sbRes.data.storyboard);
      if (!expandedId && sbRes.data.storyboard.scenes[0]) {
        setExpandedId(sbRes.data.storyboard.scenes[0].id);
      }
    }
    if (locRes.ok) setLocations(locRes.data.locations);
    if (charRes.ok) setCharacters(charRes.data.characters);
    if (propRes.ok) setProps(propRes.data.props);
    setLoading(false);
  }, [storyboardId, t]);

  useEffect(() => {
    if (!session.resolved || !session.user) {
      return;
    }
    queueMicrotask(() => {
      void load();
    });
  }, [session.resolved, session.user, load]);

  const styleProfile = useMemo(
    () =>
      storyboard
        ? normalizeStudioPromptStyleProfile(storyboard.promptStyleProfile)
        : ("commercial" as StudioPromptStyleProfile),
    [storyboard]
  );

  const handleStyleProfileChange = async (next: StudioPromptStyleProfile) => {
    if (!storyboard || next === styleProfile) {
      return;
    }
    setSavingStyleProfile(true);
    setError("");
    const res = await updateStudioStoryboardApi(storyboardId, { promptStyleProfile: next });
    setSavingStyleProfile(false);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.storyboards.error.saveFailed"));
      return;
    }
    setStoryboard(res.data.storyboard);
  };

  const scenes = useMemo(
    () => (storyboard ? [...storyboard.scenes].sort((a, b) => a.order - b.order) : []),
    [storyboard]
  );

  const canModify = Boolean(
    storyboard && session.user && storyboard.ownerId === session.user.id
  );

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !storyboard) {
      return;
    }
    const ids = scenes.map((s) => s.id);
    const next = reorderSceneIds(ids, String(active.id), String(over.id));
    if (!next) {
      return;
    }
    const res = await reorderStudioScenesApi(storyboardId, next);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.storyboards.error.reorderFailed"));
      return;
    }
    await load();
  };

  const handleAddScene = async () => {
    const n = scenes.length + 1;
    const res = await createStudioSceneApi(storyboardId, {
      title: t("studio.storyboards.defaultSceneTitle", { number: String(n) }),
    });
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.storyboards.error.addSceneFailed"));
      return;
    }
    setExpandedId(res.data.scene.id);
    await load();
  };

  const handleSceneUpdated = (updated: StudioStoryboardDetail["scenes"][number]) => {
    setStoryboard((prev) =>
      prev
        ? {
            ...prev,
            scenes: prev.scenes.map((s) => (s.id === updated.id ? updated : s)),
          }
        : prev
    );
  };

  const handleBulkGenerateImages = async () => {
    if (!storyboard || scenes.length === 0) {
      return;
    }
    setBulkGenerating(true);
    setBulkProgress(t("studio.sceneImage.bulkStarting"));
    setError("");
    const res = await bulkGenerateStudioSceneImagesApi(storyboardId);
    setBulkGenerating(false);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.sceneImage.error.bulkFailed"));
      setBulkProgress("");
      return;
    }
    const okCount = res.data.results.filter((r) => r.ok).length;
    setBulkProgress(
      t("studio.sceneImage.bulkDone", {
        ok: String(okCount),
        total: String(res.data.results.length),
      })
    );
    await load();
  };

  const handleAnalyzeConsistency = async () => {
    setAnalyzingConsistency(true);
    setError("");
    const res = await analyzeStudioStoryboardConsistencyApi(storyboardId);
    setAnalyzingConsistency(false);
    if (!res.ok) {
      setError(
        (res.data as { error?: string }).error ?? t("studio.consistency.error.storyboardFailed")
      );
      return;
    }
    setConsistencyReport(res.data.report);
    await load();
  };

  const handleGenerateCorrections = async () => {
    setGeneratingCorrections(true);
    setError("");
    const res = await generateStoryboardCorrectionsApi(storyboardId);
    setGeneratingCorrections(false);
    if (!res.ok) {
      setError(
        (res.data as { error?: string }).error ?? t("studio.correction.error.storyboardFailed")
      );
      return;
    }
    setCorrectionSummary(res.data.summary);
    setConsistencyReport(res.data.summary.consistencyReport);
    await load();
  };

  const handleSaveScene = async (sceneId: string, patch: StudioSceneUpdateInput) => {
    setSavingSceneId(sceneId);
    const res = await updateStudioSceneApi(storyboardId, sceneId, patch);
    setSavingSceneId(null);
    if (!res.ok) {
      throw new Error((res.data as { error?: string }).error ?? t("studio.storyboards.error.saveSceneFailed"));
    }
    setStoryboard((prev) =>
      prev
        ? {
            ...prev,
            scenes: prev.scenes.map((s) => (s.id === sceneId ? res.data.scene : s)),
          }
        : prev
    );
  };

  const handleDeleteScene = async (sceneId: string) => {
    if (!window.confirm(t("studio.storyboards.deleteSceneConfirm"))) {
      return;
    }
    setBusySceneId(sceneId);
    const res = await deleteStudioSceneApi(storyboardId, sceneId);
    setBusySceneId(null);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.storyboards.error.deleteSceneFailed"));
      return;
    }
    if (expandedId === sceneId) {
      setExpandedId(null);
    }
    await load();
  };

  const handleDuplicateScene = async (sceneId: string) => {
    setBusySceneId(sceneId);
    const res = await duplicateStudioSceneApi(storyboardId, sceneId);
    setBusySceneId(null);
    if (!res.ok) {
      setError(
        (res.data as { error?: string }).error ?? t("studio.storyboards.error.duplicateSceneFailed")
      );
      return;
    }
    setExpandedId(res.data.scene.id);
    await load();
  };

  return (
    <StudioAuthGate
      authTitleKey="studio.storyboards.authRequiredTitle"
      authBodyKey="studio.storyboards.authRequiredBody"
    >
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12 sm:px-10 sm:py-14">
          <div>
            <Link
              href="/studio/storyboards"
              className="text-sm font-medium text-[#006D52] hover:underline"
            >
              ← {t("studio.storyboards.backToLibrary")}
            </Link>
            {loading ? (
              <p className="mt-6 text-sm text-zinc-500">{t("button.loading")}</p>
            ) : storyboard ? (
              <>
                <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-zinc-900">{storyboard.title}</h1>
                    {storyboard.description ? (
                      <p className="mt-2 max-w-2xl text-sm text-zinc-600">{storyboard.description}</p>
                    ) : null}
                    <div className="mt-4 max-w-md">
                      <label className="text-sm font-medium text-zinc-700">
                        {t("studio.prompt.styleProfileLabel")}
                      </label>
                      <select
                        value={styleProfile}
                        disabled={!canModify || savingStyleProfile}
                        onChange={(e) =>
                          void handleStyleProfileChange(
                            normalizeStudioPromptStyleProfile(e.target.value)
                          )
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
                      >
                        {STUDIO_PROMPT_STYLE_PROFILES.map((profile) => (
                          <option key={profile} value={profile}>
                            {t(`studio.prompt.styleProfile.${profile}`)}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-zinc-500">
                        {t("studio.prompt.styleProfileHint")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {scenes.length > 0 ? (
                      <Link
                        href={`/animate/instant/import?storyboardId=${encodeURIComponent(storyboardId)}`}
                        className="rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                      >
                        {t("studio.storyboards.openInMotion")}
                      </Link>
                    ) : (
                      <span
                        title={t("studio.storyboards.openInMotionDisabledHint")}
                        className="cursor-not-allowed rounded-full bg-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-600"
                      >
                        {t("studio.storyboards.openInMotion")}
                      </span>
                    )}
                    {canModify ? (
                      <>
                        <Link
                          href={`/studio/storyboards/${storyboardId}/edit`}
                          className="rounded-full border border-[#0067B1]/40 px-4 py-2 text-sm font-semibold text-[#0067B1]"
                        >
                          {t("studio.storyboards.editStoryboard")}
                        </Link>
                        <button
                          type="button"
                          disabled={bulkGenerating}
                          onClick={() => void handleBulkGenerateImages()}
                          className="rounded-full border border-[#006D52]/40 px-4 py-2 text-sm font-semibold text-[#006D52] disabled:opacity-50"
                        >
                          {bulkGenerating
                            ? t("studio.sceneImage.bulkGenerating")
                            : t("studio.sceneImage.bulkGenerateAll")}
                        </button>
                        <button
                          type="button"
                          disabled={analyzingConsistency || scenes.length === 0}
                          onClick={() => void handleAnalyzeConsistency()}
                          className="rounded-full border border-amber-500/50 px-4 py-2 text-sm font-semibold text-amber-900 disabled:opacity-50"
                        >
                          {analyzingConsistency
                            ? t("studio.consistency.analyzing")
                            : t("studio.consistency.analyzeStoryboard")}
                        </button>
                        <button
                          type="button"
                          disabled={generatingCorrections || scenes.length === 0}
                          onClick={() => void handleGenerateCorrections()}
                          className="rounded-full border border-[#006D52]/40 px-4 py-2 text-sm font-semibold text-[#006D52] disabled:opacity-50"
                        >
                          {generatingCorrections
                            ? t("studio.correction.generatingStoryboard")
                            : t("studio.correction.generateStoryboard")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleAddScene()}
                          className="rounded-full bg-[#006D52] px-4 py-2 text-sm font-semibold text-white"
                        >
                          {t("studio.storyboards.addScene")}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {bulkProgress ? (
            <p className="rounded-xl border border-[#006D52]/20 bg-[#006D52]/5 px-4 py-2 text-sm text-[#006D52]">
              {bulkProgress}
            </p>
          ) : null}

          {storyboard && !loading ? (
            <div className="grid gap-10 lg:grid-cols-[1fr_280px]">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  {t("studio.storyboards.scenesTitle")}
                </h2>
                {scenes.length === 0 ? (
                  <p className="mt-4 text-sm text-zinc-600">{t("studio.storyboards.noScenes")}</p>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void onDragEnd(e)}>
                    <SortableContext items={scenes.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                      <div className="mt-4 space-y-4">
                        {scenes.map((scene, index) => (
                          <StudioSortableSceneCard
                            key={scene.id}
                            storyboardId={storyboardId}
                            scene={scene}
                            sceneIndex={index}
                            expanded={expandedId === scene.id}
                            onToggle={() =>
                              setExpandedId((id) => (id === scene.id ? null : scene.id))
                            }
                            locations={locations}
                            characters={characters}
                            props={props}
                            styleProfile={styleProfile}
                            saving={savingSceneId === scene.id}
                            busy={busySceneId === scene.id}
                            canModify={canModify}
                            onSave={handleSaveScene}
                            onSceneUpdated={handleSceneUpdated}
                            onDuplicate={handleDuplicateScene}
                            onDelete={handleDeleteScene}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
              <aside className="space-y-8">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">
                    {t("studio.correction.summaryTitle")}
                  </h2>
                  <div className="mt-4">
                    <StudioStoryboardCorrectionPanel
                      summary={correctionSummary}
                      loading={generatingCorrections}
                    />
                  </div>
                </div>
                <StudioConsistencyTimelinePanel report={consistencyReport} />
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">
                    {t("studio.storyboards.timelineTitle")}
                  </h2>
                  <div className="mt-4">
                    <StudioStoryboardTimeline scenes={scenes} />
                  </div>
                </div>
              </aside>
            </div>
          ) : null}
        </section>
      </main>
    </StudioAuthGate>
  );
}
