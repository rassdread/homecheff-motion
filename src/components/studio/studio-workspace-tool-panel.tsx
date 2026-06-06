"use client";

import Link from "next/link";
import { StudioDirectorSectionText } from "@/components/studio/director-v2/sections/text-section";
import { StudioMusicDirectorPanel } from "@/components/studio/studio-music-director-panel";
import { StudioSoundDirectorPanel } from "@/components/studio/studio-sound-director-panel";
import { StudioStoryboardVoiceIdentityPanel } from "@/components/studio/studio-storyboard-voice-identity-panel";
import { StudioSubtitlePreviewPanel } from "@/components/studio/studio-subtitle-preview-panel";
import { StudioTextBeatsPreviewPanel } from "@/components/studio/studio-text-beats-preview-panel";
import { StudioVoiceDirectorPanel } from "@/components/studio/studio-voice-director-panel";
import {
  StudioWorkspaceDownloadPanel,
  StudioWorkspaceRenderPanel,
  StudioWorkspaceTextProductionPanel,
  StudioWorkspaceTranslatePanelEmbedded,
  StudioWorkspaceVersionsPanel,
} from "@/components/studio/studio-workspace-production-panels";
import { useStoryboardMotionProjects } from "@/hooks/use-studio-workspace-motion";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioToolId } from "@/lib/studio-tool-id";
import type {
  StudioCharacterListItem,
  StudioSceneDetail,
  StudioStoryboardDetail,
} from "@/types/studio-api";

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

const PRODUCTION_TOOLS = new Set<StudioToolId>(["render", "versions", "translate", "export"]);

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
  storyboardId,
  storyboard,
  activeScene,
  activeSceneIndex,
  sceneCount,
  motionProjects,
  motionLoading,
  onSwitchTool,
}: {
  storyboardId: string;
  storyboard: StudioStoryboardDetail;
  activeScene: StudioSceneDetail | null;
  activeSceneIndex: number;
  sceneCount: number;
  motionProjects: ReturnType<typeof useStoryboardMotionProjects>["projects"];
  motionLoading: boolean;
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
      <StudioWorkspaceTextProductionPanel
        storyboardId={storyboardId}
        projects={motionProjects}
        loading={motionLoading}
        onSwitchTool={onSwitchTool}
      />
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
  const needsMotionProjects = PRODUCTION_TOOLS.has(tool) || tool === "text";
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
        storyboardId={storyboardId}
        storyboard={storyboard}
        activeScene={activeScene}
        activeSceneIndex={activeSceneIndex}
        sceneCount={sceneCount}
        motionProjects={projects}
        motionLoading={loading}
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

  if (tool === "render") {
    return (
      <StudioWorkspaceRenderPanel storyboardId={storyboardId} projects={projects} loading={loading} />
    );
  }

  if (tool === "versions") {
    return (
      <StudioWorkspaceVersionsPanel
        storyboardId={storyboardId}
        projects={projects}
        loading={loading}
        onSwitchTool={onSwitchTool}
      />
    );
  }

  if (tool === "translate") {
    return (
      <StudioWorkspaceTranslatePanelEmbedded
        storyboardId={storyboardId}
        projects={projects}
        loading={loading}
      />
    );
  }

  if (tool === "export") {
    return (
      <StudioWorkspaceDownloadPanel storyboardId={storyboardId} projects={projects} loading={loading} />
    );
  }

  return null;
}
