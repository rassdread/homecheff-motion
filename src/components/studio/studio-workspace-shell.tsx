"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { StudioWorkspaceAssetEvolutionPanel } from "@/components/studio/studio-workspace-asset-evolution-panel";
import { StudioDirectorProposalFlow } from "@/components/studio/studio-director-proposal-flow";
import { StudioWorkspaceProductionBanner } from "@/components/studio/studio-workspace-production-panels";
import { useStoryboardMotionProjects } from "@/hooks/use-studio-workspace-motion";
import { StudioDirectorPanelV2 } from "@/components/studio/director-v2/studio-director-panel-v2";
import { StudioWorkspaceSceneSidebar } from "@/components/studio/studio-workspace-scene-sidebar";
import { StudioWorkspaceAssetsDrawer } from "@/components/studio/studio-workspace-assets-drawer";
import { StudioWorkspaceSceneAssetsPanel } from "@/components/studio/studio-workspace-scene-assets-panel";
import { StudioShellHeader } from "@/components/studio/studio-shell-header";
import { StudioToolStrip } from "@/components/studio/studio-tool-strip";
import { StudioWorkspaceToolPanel } from "@/components/studio/studio-workspace-tool-panel";
import { MotionBuildDebugBadge } from "@/components/layout/motion-build-debug-badge";
import { StudioWorkspaceInspectorPanel } from "@/components/studio/studio-workspace-inspector-panel";
import { StudioMobileInsightsSheet } from "@/components/studio/studio-mobile-insights-sheet";
import { useActiveTranslator } from "@/i18n/client";
import { fetchAuthSessionJson } from "@/lib/auth-session-client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { WorkspaceLoadingSkeleton } from "@/components/ui/motion-studio-primitives";
import { brand } from "@/lib/brand";
import { useStudioAdvancedFeatures } from "@/lib/studio-advanced-features";
import { rememberRecentStoryboardId } from "@/lib/studio-recent-storyboard";
import { studioClassicEditorHref } from "@/lib/studio-workspace-href";
import {
  studioToolToAssetTab,
  type StudioToolId,
} from "@/lib/studio-tool-id";
import { fetchStudioCharacters } from "@/lib/studio-characters-client";
import { fetchStudioLocations } from "@/lib/studio-locations-client";
import { fetchStudioProps } from "@/lib/studio-props-client";
import { fetchStudioWorlds } from "@/lib/studio-worlds-client";
import { fetchStudioProjectMemory } from "@/lib/studio-project-memory-client";
import { emptyProjectMemorySnapshot } from "@/lib/studio-project-memory-utils";
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
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";
import type { StudioSceneUpdateInput } from "@/lib/studio-scene-validation";
import { resolveStudioWorkspaceLoadFailure } from "@/lib/studio-workspace-load-error";
import type { StudioWorkspaceLoadFailure } from "@/lib/studio-workspace-load-error";
import { StudioWorkspaceLoadError } from "@/components/studio/studio-workspace-load-error";

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
  const [worlds, setWorlds] = useState<StudioWorldProfileListItem[]>([]);
  const [projectMemory, setProjectMemory] = useState<StudioProjectMemorySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailure, setLoadFailure] = useState<StudioWorkspaceLoadFailure | null>(null);
  const [error, setError] = useState("");
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [savingSceneId, setSavingSceneId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<StudioToolId>("story");
  const [assetsDrawerOpen, setAssetsDrawerOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<MobilePane>("list");
  const [mobileInsightsOpen, setMobileInsightsOpen] = useState(false);
  const { projects: motionProjects } = useStoryboardMotionProjects(storyboardId, Boolean(storyboard));

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setLoadFailure(null);

    const sessionPayload = await fetchAuthSessionJson({ force: true });
    if (!sessionPayload.user) {
      setLoadFailure({
        kind: "auth",
        message: t("studio.workspace.error.authBody"),
      });
      setStoryboard(null);
      setLoading(false);
      return;
    }

    const [sbRes, locRes, charRes, propRes, worldRes, memoryRes] = await Promise.all([
      fetchStudioStoryboard(storyboardId),
      fetchStudioLocations(),
      fetchStudioCharacters(),
      fetchStudioProps(),
      fetchStudioWorlds(),
      fetchStudioProjectMemory(),
    ]);

    const failure = resolveStudioWorkspaceLoadFailure(
      sbRes,
      t("studio.storyboards.error.loadFailed")
    );
    if (failure) {
      setLoadFailure(failure);
      setStoryboard(null);
      setLoading(false);
      return;
    }

    setStoryboard(sbRes.data.storyboard);
    rememberRecentStoryboardId(storyboardId);
    setActiveSceneId((prev) => {
      if (prev && sbRes.data.storyboard.scenes.some((s) => s.id === prev)) {
        return prev;
      }
      return sbRes.data.storyboard.scenes[0]?.id ?? null;
    });
    if (locRes.ok) setLocations(locRes.data.locations);
    if (charRes.ok) setCharacters(charRes.data.characters);
    if (propRes.ok) setProps(propRes.data.props);
    if (worldRes.ok) setWorlds(worldRes.data.worlds);
    setProjectMemory(memoryRes.ok ? memoryRes.data.memory : emptyProjectMemorySnapshot());
    setLoading(false);
  }, [storyboardId, t]);

  const refreshAssetLibraries = useCallback(async () => {
    const [locRes, charRes, propRes, worldRes, memoryRes] = await Promise.all([
      fetchStudioLocations(),
      fetchStudioCharacters(),
      fetchStudioProps(),
      fetchStudioWorlds(),
      fetchStudioProjectMemory(),
    ]);
    if (locRes.ok) setLocations(locRes.data.locations);
    if (charRes.ok) setCharacters(charRes.data.characters);
    if (propRes.ok) setProps(propRes.data.props);
    if (worldRes.ok) setWorlds(worldRes.data.worlds);
    if (memoryRes.ok) setProjectMemory(memoryRes.data.memory);
  }, []);

  const handleCharacterUpdated = useCallback((updated: StudioCharacterListItem) => {
    setCharacters((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setStoryboard((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        scenes: prev.scenes.map((scene) => ({
          ...scene,
          characters: scene.characters.map((c) => (c.id === updated.id ? updated : c)),
        })),
      };
    });
  }, []);

  const handleSceneAssetUpdated = (updated: StudioSceneDetail) => {
    setStoryboard((prev) =>
      prev
        ? { ...prev, scenes: prev.scenes.map((s) => (s.id === updated.id ? updated : s)) }
        : prev
    );
  };

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

  const handleToolChange = (tool: StudioToolId) => {
    setActiveTool(tool);
    if (tool !== "story" && typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobilePane("editor");
      setAssetsDrawerOpen(false);
    }
  };

  const selectScene = (sceneId: string) => {
    setActiveSceneId(sceneId);
    setActiveTool("story");
    setMobilePane("editor");
  };

  const assetTab = studioToolToAssetTab(activeTool);
  const drawerTab =
    assetTab ??
    (activeTool === "story" ? "scenes" : "characters");

  const [advancedFeatures] = useStudioAdvancedFeatures();

  return (
    <StudioAuthGate>
      <main className={`flex min-h-screen flex-1 flex-col ${brand.softGradientBg}`}>
        <StudioShellHeader
          projectTitle={storyboard?.title}
          storyboardId={storyboardId}
          showMakeVideo={Boolean(storyboard && !loadFailure)}
        />

        {advancedFeatures ?
          <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-2 px-4 pt-2 sm:px-6">
            <Link
              href={studioClassicEditorHref(storyboardId)}
              className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              {t("studio.workspace.classicEditor")}
            </Link>
            <Link
              href={`/studio/storyboards/${storyboardId}/production`}
              className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              {t("studio.workspace.production")}
            </Link>
            <Link href="/studio/advanced" className="text-xs font-semibold text-zinc-500 hover:text-zinc-700">
              {t("studio.shell.advancedLink")}
            </Link>
            <MotionBuildDebugBadge />
          </div>
        : null}

        {error ?
          <p className="mx-auto max-w-[1600px] px-4 py-3 text-sm text-red-700 sm:px-6">{error}</p>
        : null}

        {loadFailure ?
          <StudioWorkspaceLoadError
            failure={loadFailure}
            onRetry={() => void load()}
            retrying={loading}
          />
        : null}

        {loading && !loadFailure ?
          <WorkspaceLoadingSkeleton />
        : !storyboard || loadFailure ?
          null
        : (
          <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col lg:grid lg:grid-cols-[220px_minmax(0,1fr)_300px] lg:gap-4 lg:px-4">
            <aside
              className={`border-b border-zinc-200 bg-white lg:border-b-0 lg:border-r ${
                mobilePane === "editor" && activeTool === "story" ? "hidden lg:block" : "block"
              }`}
            >
              <div className="border-b border-zinc-200 px-3 py-2 lg:border-b-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  {t("studio.workspace.scenes")}
                </p>
              </div>
              <StudioWorkspaceSceneSidebar
                scenes={scenes}
                activeSceneId={activeSceneId}
                onSelectScene={selectScene}
                onAddScene={canModify ? () => void handleAddScene() : undefined}
                canModify={canModify}
              />
            </aside>

            <section
              className={`min-h-[50vh] flex-1 bg-white px-4 py-4 sm:px-6 ${
                mobilePane === "list" ? "hidden lg:block" : "block pb-36 lg:pb-4"
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

              {motionProjects.length > 0 ?
                <StudioWorkspaceProductionBanner
                  projects={motionProjects}
                  onOpenRender={() => {
                    setActiveTool("render");
                    setMobilePane("editor");
                  }}
                />
              : null}

              {activeTool === "story" ?
                <>
                  <StudioWorkspaceAssetEvolutionPanel
                    storyboard={storyboard}
                    characters={characters}
                    locations={locations}
                    props={props}
                    worlds={worlds}
                    memory={projectMemory}
                    canModify={canModify}
                    onApplied={() => void load()}
                    onSwitchTool={handleToolChange}
                  />
                  <StudioDirectorProposalFlow
                    storyboard={storyboard}
                    characters={characters}
                    locations={locations}
                    props={props}
                    worlds={worlds}
                    projectMemory={projectMemory}
                    canModify={canModify}
                    onApplied={() => void load()}
                  />
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
                </>
              : assetTab ?
                <StudioWorkspaceSceneAssetsPanel
                  tab={assetTab}
                  storyboardId={storyboardId}
                  scene={activeScene}
                  sceneIndex={activeSceneIndex}
                  characters={characters}
                  locations={locations}
                  props={props}
                  worlds={worlds}
                  canModify={canModify}
                  storyLanguage={storyboard.voiceLanguage ?? "en"}
                  storyVoiceProfile={storyboard.voiceProfile}
                  storyboard={storyboard}
                  memory={projectMemory}
                  isAdmin={session.user?.role === "admin"}
                  onSceneUpdated={handleSceneAssetUpdated}
                  onAssetsChanged={() => void refreshAssetLibraries()}
                  onCharacterUpdated={handleCharacterUpdated}
                />
              : (
                <StudioWorkspaceToolPanel
                  tool={activeTool}
                  storyboardId={storyboardId}
                  storyboard={storyboard}
                  activeScene={activeScene}
                  activeSceneIndex={activeSceneIndex}
                  sceneCount={scenes.length}
                  characters={characters}
                  locations={locations}
                  props={props}
                  worlds={worlds}
                  projectMemory={projectMemory}
                  styleProfile={styleProfile}
                  directorProfile={directorProfile}
                  canModify={canModify}
                  onStoryboardUpdated={setStoryboard}
                  onSceneUpdated={handleSceneDraftChange}
                  onRefreshStoryboard={() => void load()}
                  onCharacterUpdated={handleCharacterUpdated}
                  onSwitchTool={handleToolChange}
                />
              )}
            </section>

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
              : (
                <p className="text-sm text-zinc-600">{t("studio.shell.emptyDirectorHint")}</p>
              )}
            </aside>
          </div>
        )}

        {storyboard && !loadFailure ?
          <StudioToolStrip activeTool={activeTool} onToolChange={handleToolChange} />
        : null}

        {storyboard && activeScene && activeSceneIndex >= 0 ?
          <>
            <div
              className="fixed inset-x-0 bottom-[52px] z-30 px-4 py-2 lg:hidden"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
            >
              <button
                type="button"
                onClick={() => setMobileInsightsOpen(true)}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#006D52] px-4 text-sm font-semibold text-white shadow-lg"
              >
                <span aria-hidden>✦</span>
                {t("studio.shell.aiDirector")}
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
              onSwitchTool={(tool) => {
                handleToolChange(tool);
                setMobileInsightsOpen(false);
              }}
              projectMemory={projectMemory}
            />
          </>
        : null}

        <StudioWorkspaceAssetsDrawer
          open={assetsDrawerOpen}
          initialTab={drawerTab === "scenes" ? "characters" : drawerTab}
          characters={characters}
          locations={locations}
          props={props}
          storyboardId={storyboardId}
          onClose={() => {
            setAssetsDrawerOpen(false);
            setActiveTool("story");
          }}
        />
      </main>
    </StudioAuthGate>
  );
}
