"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LanguageExportPanel } from "@/components/instant/language-export-panel";
import { StudioDirectorSectionText } from "@/components/studio/director-v2/sections/text-section";
import { StudioMusicDirectorPanel } from "@/components/studio/studio-music-director-panel";
import { StudioSoundDirectorPanel } from "@/components/studio/studio-sound-director-panel";
import { StudioStoryboardVoiceIdentityPanel } from "@/components/studio/studio-storyboard-voice-identity-panel";
import { StudioSubtitlePreviewPanel } from "@/components/studio/studio-subtitle-preview-panel";
import { StudioTextBeatsPreviewPanel } from "@/components/studio/studio-text-beats-preview-panel";
import { StudioVoiceDirectorPanel } from "@/components/studio/studio-voice-director-panel";
import { useActiveTranslator } from "@/i18n/client";
import { getProjectLanguageExports } from "@/lib/instant-export-client";
import { fetchStoryboardMotionProjects } from "@/lib/studio-storyboards-client";
import type { StudioToolId } from "@/lib/studio-tool-id";
import type {
  StudioCharacterListItem,
  StudioMotionProjectSummary,
  StudioSceneDetail,
  StudioStoryboardDetail,
} from "@/types/studio-api";
import type { VideoLanguageExportSummary } from "@/types/animation-api";

type Props = {
  tool: StudioToolId;
  storyboardId: string;
  storyboard: StudioStoryboardDetail;
  activeScene: StudioSceneDetail | null;
  activeSceneIndex: number;
  sceneCount: number;
  characters: StudioCharacterListItem[];
  canModify: boolean;
  onStoryboardUpdated: (storyboard: StudioStoryboardDetail) => void;
  onSwitchTool?: (tool: StudioToolId) => void;
};

function MotionProjectsEmpty({ storyboardId }: { storyboardId: string }) {
  const t = useActiveTranslator();
  const importHref = `/animate/instant/import?storyboardId=${encodeURIComponent(storyboardId)}`;

  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-10 text-center">
      <p className="text-base font-semibold text-zinc-900">{t("studio.workspace.motion.emptyTitle")}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">{t("studio.workspace.motion.emptyHint")}</p>
      <Link
        href={importHref}
        prefetch={false}
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#006D52] px-5 py-2 text-sm font-semibold text-white hover:bg-[#005a44]"
      >
        {t("studio.workspace.openMotion")}
      </Link>
    </div>
  );
}

function useStoryboardMotionProjects(storyboardId: string, enabled: boolean) {
  const [projects, setProjects] = useState<StudioMotionProjectSummary[]>([]);
  const [loading, setLoading] = useState(enabled);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetchStoryboardMotionProjects(storyboardId);
    if (res.ok) {
      setProjects(res.data.projects);
    } else {
      setProjects([]);
    }
    setLoading(false);
  }, [storyboardId]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetchStoryboardMotionProjects(storyboardId);
      if (cancelled) {
        return;
      }
      if (res.ok) {
        setProjects(res.data.projects);
      } else {
        setProjects([]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, storyboardId]);

  return { projects, loading, refresh };
}

function MotionProjectList({
  projects,
  loading,
}: {
  projects: StudioMotionProjectSummary[];
  loading: boolean;
}) {
  const t = useActiveTranslator();

  if (loading) {
    return <p className="text-sm text-zinc-500">{t("common.loading")}</p>;
  }

  if (projects.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-2">
      {projects.map((project) => (
        <li key={project.id}>
          <Link
            href={`/videos/${encodeURIComponent(project.id)}`}
            prefetch={false}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 hover:border-[#006D52]/30 hover:bg-[#006D52]/5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900">
                {project.title?.trim() || t("studio.workspace.motion.untitledVideo")}
              </p>
              <p className="text-xs text-zinc-500">
                {t("studio.workspace.motion.updated", {
                  date: new Date(project.updatedAt).toLocaleDateString(),
                })}
              </p>
            </div>
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              {project.hasCompletedFinal
                ? t("studio.workspace.motion.statusReady")
                : t("studio.workspace.motion.statusInProgress")}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function StudioWorkspaceTranslatePanel({
  storyboardId,
  projects,
  loading,
}: {
  storyboardId: string;
  projects: StudioMotionProjectSummary[];
  loading: boolean;
}) {
  const t = useActiveTranslator();
  const primary = useMemo(
    () => projects.find((p) => p.hasCompletedFinal) ?? projects[0] ?? null,
    [projects]
  );
  const [languageExports, setLanguageExports] = useState<VideoLanguageExportSummary[]>([]);
  const [exportsLoading, setExportsLoading] = useState(true);

  useEffect(() => {
    if (!primary?.hasCompletedFinal) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await getProjectLanguageExports(primary.id);
      if (!cancelled) {
        setLanguageExports(result.exports);
        setExportsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [primary?.id, primary?.hasCompletedFinal]);

  if (loading) {
    return <p className="text-sm text-zinc-500">{t("common.loading")}</p>;
  }

  if (!primary) {
    return <MotionProjectsEmpty storyboardId={storyboardId} />;
  }

  if (!primary.hasCompletedFinal) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-600">{t("studio.workspace.translate.waitForVideo")}</p>
        <MotionProjectList projects={projects} loading={false} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{t("studio.tools.translate")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.workspace.translate.hint")}</p>
      </div>
      {exportsLoading ?
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      : <LanguageExportPanel
          projectId={primary.id}
          hasCompletedFinal={primary.hasCompletedFinal}
          languageExports={languageExports}
          onLanguageExportsChange={setLanguageExports}
        />
      }
      {projects.length > 1 ?
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.workspace.motion.otherVideos")}
          </p>
          <div className="mt-2">
            <MotionProjectList projects={projects.filter((p) => p.id !== primary.id)} loading={false} />
          </div>
        </div>
      : null}
    </div>
  );
}

function StudioWorkspaceExportPanel({
  storyboardId,
  projects,
  loading,
}: {
  storyboardId: string;
  projects: StudioMotionProjectSummary[];
  loading: boolean;
}) {
  const t = useActiveTranslator();

  if (loading) {
    return <p className="text-sm text-zinc-500">{t("common.loading")}</p>;
  }

  if (projects.length === 0) {
    return <MotionProjectsEmpty storyboardId={storyboardId} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{t("studio.tools.export")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.workspace.export.hint")}</p>
      </div>
      <MotionProjectList projects={projects} loading={false} />
      <p className="text-xs text-zinc-500">{t("studio.workspace.export.openVideoHint")}</p>
    </div>
  );
}

function StudioWorkspaceVoicePanel({
  storyboard,
  characters,
  canModify,
  onStoryboardUpdated,
}: {
  storyboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  canModify: boolean;
  onStoryboardUpdated: (storyboard: StudioStoryboardDetail) => void;
}) {
  const t = useActiveTranslator();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{t("studio.tools.voice")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.workspace.voice.hint")}</p>
      </div>
      <StudioVoiceDirectorPanel
        storyboard={storyboard}
        canModify={canModify}
        onStoryboardUpdated={onStoryboardUpdated}
      />
      <StudioStoryboardVoiceIdentityPanel storyboard={storyboard} />
      {characters.length > 0 ?
        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-900">{t("studio.workspace.voice.charactersTitle")}</h3>
          <p className="mt-1 text-xs text-zinc-600">{t("studio.workspace.voice.charactersHint")}</p>
          <ul className="mt-3 space-y-2">
            {characters.map((character) => (
              <li key={character.id}>
                <Link
                  href={`/studio/characters/${encodeURIComponent(character.id)}/edit`}
                  prefetch={false}
                  className="flex items-center justify-between rounded-xl border border-zinc-100 px-3 py-2 text-sm hover:bg-zinc-50"
                >
                  <span className="font-medium text-zinc-900">{character.name}</span>
                  <span className="text-xs text-[#0067B1]">{t("studio.workspace.voice.manageCharacter")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      : null}
    </div>
  );
}

function StudioWorkspaceSubtitlesPanel({
  storyboardId,
  storyboard,
  canModify,
  onSwitchTool,
}: {
  storyboardId: string;
  storyboard: StudioStoryboardDetail;
  canModify: boolean;
  onSwitchTool?: (tool: StudioToolId) => void;
}) {
  const t = useActiveTranslator();
  const voiceEnabled = storyboard.voiceEnabled ?? false;
  const language = storyboard.voiceLanguage ?? "en";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{t("studio.tools.subtitles")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.workspace.subtitles.hint")}</p>
      </div>
      {!voiceEnabled ?
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p>{t("studio.workspace.subtitles.enableVoiceHint")}</p>
          {onSwitchTool ?
            <button
              type="button"
              onClick={() => onSwitchTool("voice")}
              className="mt-2 text-sm font-semibold text-[#0067B1] hover:underline"
            >
              {t("studio.workspace.subtitles.openVoiceTab")}
            </button>
          : null}
        </div>
      : <StudioSubtitlePreviewPanel
          storyboardId={storyboardId}
          enabled={voiceEnabled}
          language={language}
          canModify={canModify}
        />
      }
    </div>
  );
}

function StudioWorkspaceTextPanel({
  storyboard,
  activeScene,
  activeSceneIndex,
  sceneCount,
  onSwitchTool,
}: {
  storyboard: StudioStoryboardDetail;
  activeScene: StudioSceneDetail | null;
  activeSceneIndex: number;
  sceneCount: number;
  onSwitchTool?: (tool: StudioToolId) => void;
}) {
  const t = useActiveTranslator();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{t("studio.tools.text")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.workspace.text.hint")}</p>
      </div>
      {activeScene && activeSceneIndex >= 0 ?
        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.workspace.text.activeScene", { n: String(activeSceneIndex + 1) })}
          </p>
          <div className="mt-3">
            <StudioDirectorSectionText
              scene={activeScene}
              sceneIndex={activeSceneIndex}
              sceneCount={sceneCount}
              storyboardTitle={storyboard.title}
              storyboardDescription={storyboard.description}
              aiDirectorNotes={storyboard.aiDirectorPrompt ?? ""}
            />
          </div>
          {onSwitchTool ?
            <button
              type="button"
              onClick={() => onSwitchTool("story")}
              className="mt-4 text-sm font-semibold text-[#0067B1] hover:underline"
            >
              {t("studio.workspace.text.editInStory")}
            </button>
          : null}
        </section>
      : null}
      <StudioTextBeatsPreviewPanel storyboard={storyboard} />
    </div>
  );
}

export function StudioWorkspaceToolPanel({
  tool,
  storyboardId,
  storyboard,
  activeScene,
  activeSceneIndex,
  sceneCount,
  characters,
  canModify,
  onStoryboardUpdated,
  onSwitchTool,
}: Props) {
  const t = useActiveTranslator();
  const needsMotionProjects = tool === "translate" || tool === "export";
  const { projects, loading } = useStoryboardMotionProjects(storyboardId, needsMotionProjects);

  if (tool === "voice") {
    return (
      <StudioWorkspaceVoicePanel
        storyboard={storyboard}
        characters={characters}
        canModify={canModify}
        onStoryboardUpdated={onStoryboardUpdated}
      />
    );
  }

  if (tool === "text") {
    return (
      <StudioWorkspaceTextPanel
        storyboard={storyboard}
        activeScene={activeScene}
        activeSceneIndex={activeSceneIndex}
        sceneCount={sceneCount}
        onSwitchTool={onSwitchTool}
      />
    );
  }

  if (tool === "subtitles") {
    return (
      <StudioWorkspaceSubtitlesPanel
        storyboardId={storyboardId}
        storyboard={storyboard}
        canModify={canModify}
        onSwitchTool={onSwitchTool}
      />
    );
  }

  if (tool === "music") {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{t("studio.tools.music")}</h2>
          <p className="mt-1 text-sm text-zinc-600">{t("studio.workspace.music.planningHint")}</p>
        </div>
        <StudioMusicDirectorPanel storyboard={storyboard} onUpdated={onStoryboardUpdated} />
      </div>
    );
  }

  if (tool === "sound") {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{t("studio.tools.sound")}</h2>
          <p className="mt-1 text-sm text-zinc-600">{t("studio.workspace.sound.planningHint")}</p>
        </div>
        <StudioSoundDirectorPanel storyboard={storyboard} onUpdated={onStoryboardUpdated} />
      </div>
    );
  }

  if (tool === "translate") {
    return (
      <StudioWorkspaceTranslatePanel
        storyboardId={storyboardId}
        projects={projects}
        loading={loading}
      />
    );
  }

  if (tool === "export") {
    return (
      <StudioWorkspaceExportPanel storyboardId={storyboardId} projects={projects} loading={loading} />
    );
  }

  return null;
}
