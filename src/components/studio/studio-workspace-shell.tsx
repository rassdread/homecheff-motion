"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { StudioDirectorPanelV2 } from "@/components/studio/director-v2/studio-director-panel-v2";
import {
  StudioWorkspaceNavSidebar,
  type StudioWorkspaceNavId,
} from "@/components/studio/studio-workspace-nav-sidebar";
import { StudioWorkspaceSceneSidebar } from "@/components/studio/studio-workspace-scene-sidebar";
import { StudioWorkspaceAssetsDrawer } from "@/components/studio/studio-workspace-assets-drawer";
import { StudioWorkspaceAssetsList } from "@/components/studio/studio-workspace-assets-list";
import { MotionBuildDebugBadge } from "@/components/layout/motion-build-debug-badge";
import { MotionStudioOnboarding } from "@/components/studio/motion-studio-onboarding";
import { StudioWorkspaceInspectorPanel } from "@/components/studio/studio-workspace-inspector-panel";
import { StudioMobileInsightsSheet } from "@/components/studio/studio-mobile-insights-sheet";
import { isStudioAiAssistantEnabled } from "@/lib/studio-ai-assistant-flag";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { WorkspaceLoadingSkeleton } from "@/components/ui/motion-studio-primitives";
import { brand } from "@/lib/brand";
import { StudioAdvancedFeaturesToggle } from "@/components/studio/studio-advanced-features-toggle";
import { useStudioAdvancedFeatures } from "@/lib/studio-advanced-features";
import { studioClassicEditorHref } from "@/lib/studio-workspace-href";
import { fetchStudioCharacters } from "@/lib/studio-characters-client";
import { fetchStudioLocations } from "@/lib/studio-locations-client";
import { fetchStudioProps } from "@/lib/studio-props-client";
import {
  normalizeStudioDirectorProfile,
  type StudioDirectorProfile,
} from "@/lib/studio-director-profiles";
import {
  normalizeStudioPromptStyleProfile,
  type StudioPromptStyleProfile,
} from "@/lib/studio-prompt-style-profiles";
import { storyboardToFlowInput } from "@/lib/studio-movie-director-quality";
import {
  createStudioSceneApi,
  fetchStudioStoryboard,
  updateStudioSceneApi,
} from "@/lib/studio-storyboards-client";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioSceneDetail,
  StudioStoryboardDetail,
} from "@/types/studio-api";
import type { StudioSceneUpdateInput } from "@/lib/studio-scene-validation";

type Props = {
  storyboardId: string;
};

type MobilePane = "list" | "editor";

export function StudioWorkspaceShell({ storyboardId }: Props) {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const [storyboard, setStoryboard] = useState<StudioStoryboardDetail | null>(null);
  const [locations, setLocations] = useState<StudioLocationListItem[]>([]);
  const [characters, setCharacters] = useState<StudioCharacterListItem[]>([]);
  const [props, setProps] = useState<StudioPropListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [savingSceneId, setSavingSceneId] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState<StudioWorkspaceNavId>("scenes");
  const [assetsDrawerOpen, setAssetsDrawerOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<MobilePane>("list");
  const [mobileInsightsOpen, setMobileInsightsOpen] = useState(false);

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
      setActiveSceneId((prev) => {
        if (prev && sbRes.data.storyboard.scenes.some((s) => s.id === prev)) {
          return prev;
        }
        return sbRes.data.storyboard.scenes[0]?.id ?? null;
      });
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

  const scenes = useMemo(
    () => (storyboard ? [...storyboard.scenes].sort((a, b) => a.order - b.order) : []),
    [storyboard]
  );

  const activeScene = useMemo(
    () => scenes.find((s) => s.id === activeSceneId) ?? null,
    [scenes, activeSceneId]
  );

  const activeSceneIndex = useMemo(
    () => (activeScene ? scenes.findIndex((s) => s.id === activeScene.id) : -1),
    [scenes, activeScene]
  );

  const flowScenes = useMemo(
    () => (storyboard ? storyboardToFlowInput(storyboard) : []),
    [storyboard]
  );

  const directorProfile = useMemo(
    () =>
      storyboard
        ? normalizeStudioDirectorProfile(storyboard.directorProfile)
        : ("commercial" as StudioDirectorProfile),
    [storyboard]
  );

  const styleProfile = useMemo(
    () =>
      storyboard
        ? normalizeStudioPromptStyleProfile(storyboard.promptStyleProfile)
        : ("commercial" as StudioPromptStyleProfile),
    [storyboard]
  );

  const canModify = Boolean(
    storyboard && session.user && storyboard.ownerId === session.user.id
  );

  const handleSceneDraftChange = (updated: StudioSceneDetail) => {
    setStoryboard((prev) =>
      prev
        ? { ...prev, scenes: prev.scenes.map((s) => (s.id === updated.id ? updated : s)) }
        : prev
    );
  };

  const handleStoryboardNotesUpdated = (notes: string) => {
    setStoryboard((prev) => (prev ? { ...prev, aiDirectorPrompt: notes } : prev));
  };

  const handleSaveScene = async (patch: StudioSceneUpdateInput) => {
    if (!activeScene) {
      return;
    }
    setSavingSceneId(activeScene.id);
    const res = await updateStudioSceneApi(storyboardId, activeScene.id, patch);
    setSavingSceneId(null);
    if (!res.ok) {
      throw new Error(
        (res.data as { error?: string }).error ?? t("studio.storyboards.error.saveSceneFailed")
      );
    }
    setStoryboard((prev) =>
      prev
        ? { ...prev, scenes: prev.scenes.map((s) => (s.id === activeScene.id ? res.data.scene : s)) }
        : prev
    );
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
    setActiveSceneId(res.data.scene.id);
    setMobilePane("editor");
    await load();
  };

  const handleNavChange = (id: StudioWorkspaceNavId) => {
    setActiveNav(id);
    if (id !== "scenes" && typeof window !== "undefined" && window.innerWidth < 1024) {
      setAssetsDrawerOpen(true);
    } else {
      setAssetsDrawerOpen(false);
    }
  };

  const selectScene = (sceneId: string) => {
    setActiveSceneId(sceneId);
    setActiveNav("scenes");
    setMobilePane("editor");
  };

  const handoffHref = `/animate/instant/import?storyboardId=${encodeURIComponent(storyboardId)}`;
  const [advancedFeatures] = useStudioAdvancedFeatures();

  return (
    <StudioAuthGate>
      <main className={`min-h-screen flex-1 ${brand.softGradientBg}`}>
        <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#006D52]">
                {t("studio.workspace.label")}
              </p>
              <h1 className="truncate text-lg font-bold text-zinc-900">
                {storyboard?.title ?? t("studio.workspace.loadingTitle")}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <MotionBuildDebugBadge className="hidden sm:block" />
              {advancedFeatures ?
                <>
                  <Link
                    href={studioClassicEditorHref(storyboardId)}
                    className="min-h-[44px] rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    {t("studio.workspace.classicEditor")}
                  </Link>
                  <Link
                    href={`/studio/storyboards/${storyboardId}/production`}
                    className="min-h-[44px] rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    {t("studio.workspace.production")}
                  </Link>
                </>
              : null}
              <StudioAdvancedFeaturesToggle />
              <Link
                href={handoffHref}
                className="min-h-[44px] rounded-full bg-[#006D52] px-4 py-2 text-xs font-semibold text-white hover:bg-[#005a44]"
              >
                {t("studio.workspace.openMotion")}
              </Link>
            </div>
          </div>
        </header>

        {error ?
          <p className="mx-auto max-w-[1600px] px-4 py-3 text-sm text-red-700 sm:px-6">{error}</p>
        : null}

        {isStudioAiAssistantEnabled() && !loading && storyboard ?
          <div className="mx-auto max-w-[1600px] px-4 pt-4 sm:px-6">
            <MotionStudioOnboarding />
          </div>
        : null}

        {loading ?
          <WorkspaceLoadingSkeleton />
        : !storyboard ?
          null
        : (
          <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-0 lg:grid-cols-[220px_minmax(0,1fr)_300px] lg:gap-4 lg:px-4 lg:pb-8">
            {/* Left: nav + scene list — hidden on mobile when editing */}
            <aside
              className={`border-b border-zinc-200 bg-white lg:border-b-0 lg:border-r ${
                mobilePane === "editor" ? "hidden lg:block" : "block"
              }`}
            >
              <StudioWorkspaceNavSidebar activeNav={activeNav} onNavChange={handleNavChange} />
              {activeNav === "scenes" ?
                <StudioWorkspaceSceneSidebar
                  scenes={scenes}
                  activeSceneId={activeSceneId}
                  onSelectScene={selectScene}
                  onAddScene={canModify ? () => void handleAddScene() : undefined}
                  canModify={canModify}
                />
              : (
                <StudioWorkspaceAssetsList
                  tab={activeNav}
                  characters={characters}
                  locations={locations}
                  props={props}
                  storyboardId={storyboardId}
                  onNavigate={() => setActiveNav("scenes")}
                />
              )}
            </aside>

            {/* Center: Director workspace */}
            <section
              className={`min-h-[60vh] bg-white px-4 py-4 sm:px-6 ${
                mobilePane === "list" ? "hidden lg:block" : "block pb-28 lg:pb-4"
              }`}
            >
              {mobilePane === "editor" ?
                <button
                  type="button"
                  onClick={() => setMobilePane("list")}
                  className="mb-3 text-xs font-semibold text-[#0067B1] lg:hidden"
                >
                  ← {t("studio.workspace.backToScenes")}
                </button>
              : null}

              {activeScene && activeSceneIndex >= 0 ?
                <StudioDirectorPanelV2
                  storyboardId={storyboardId}
                  storyboard={storyboard}
                  scene={activeScene}
                  sceneIndex={activeSceneIndex}
                  sceneCount={scenes.length}
                  flowScenes={flowScenes}
                  storyboardTitle={storyboard.title}
                  storyboardDescription={storyboard.description}
                  aiDirectorPrompt={storyboard.aiDirectorPrompt}
                  aiDirectorStyleStrength={storyboard.aiDirectorStyleStrength}
                  directorProfile={directorProfile}
                  styleProfile={styleProfile}
                  characters={characters}
                  canModify={canModify}
                  saving={savingSceneId === activeScene.id}
                  onSave={handleSaveScene}
                  onSceneDraftChange={handleSceneDraftChange}
                  onStoryboardNotesUpdated={handleStoryboardNotesUpdated}
                />
              : (
                <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-12 text-center text-sm text-zinc-600">
                  {t("studio.storyboards.noScenes")}
                </p>
              )}
            </section>

            {/* Right: Inspector (desktop only — mobile uses bottom sheet) */}
            <aside className="hidden border-t border-zinc-200 bg-zinc-50/50 p-4 lg:block lg:border-l lg:border-t-0">
              {activeScene && activeSceneIndex >= 0 ?
                <StudioWorkspaceInspectorPanel
                  storyboard={storyboard}
                  scene={activeScene}
                  sceneIndex={activeSceneIndex}
                  sceneCount={scenes.length}
                  styleProfile={styleProfile}
                  directorProfile={directorProfile}
                  saving={savingSceneId === activeScene.id}
                  characters={characters}
                  canModify={canModify}
                  onSceneUpdated={handleSceneDraftChange}
                />
              : null}
            </aside>
          </div>
        )}

        {isStudioAiAssistantEnabled() && storyboard && activeScene && activeSceneIndex >= 0 ?
          <>
            <div
              className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur lg:hidden"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
            >
              <button
                type="button"
                onClick={() => setMobileInsightsOpen(true)}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#006D52] px-4 text-sm font-semibold text-white"
              >
                <span aria-hidden>✦</span>
                {t("studio.mobileInsights.open")}
              </button>
            </div>
            <StudioMobileInsightsSheet
              open={mobileInsightsOpen}
              onClose={() => setMobileInsightsOpen(false)}
              storyboard={storyboard}
              scene={activeScene}
              sceneIndex={activeSceneIndex}
              sceneCount={scenes.length}
              characters={characters}
              canModify={canModify}
              onSceneUpdated={handleSceneDraftChange}
            />
          </>
        : null}

        <StudioWorkspaceAssetsDrawer
          open={assetsDrawerOpen}
          initialTab={activeNav}
          characters={characters}
          locations={locations}
          props={props}
          storyboardId={storyboardId}
          onClose={() => {
            setAssetsDrawerOpen(false);
            setActiveNav("scenes");
          }}
        />
      </main>
    </StudioAuthGate>
  );
}
