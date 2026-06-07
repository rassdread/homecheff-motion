"use client";

import { StudioDirectorSectionText } from "@/components/studio/director-v2/sections/text-section";
import { StudioMusicDirectorPanel } from "@/components/studio/studio-music-director-panel";
import { StudioSoundDirectorPanel } from "@/components/studio/studio-sound-director-panel";
import { StudioStoryboardVoiceIdentityPanel } from "@/components/studio/studio-storyboard-voice-identity-panel";
import { StudioSubtitlePreviewPanel } from "@/components/studio/studio-subtitle-preview-panel";
import { StudioTextBeatsPreviewPanel } from "@/components/studio/studio-text-beats-preview-panel";
import { StudioVoiceDirectorPanel } from "@/components/studio/studio-voice-director-panel";
import { StudioWorkspaceCharacterVoiceInline } from "@/components/studio/studio-workspace-character-voice-inline";
import { StudioWorkspaceAudioProductionPanel } from "@/components/studio/studio-workspace-audio-production-panel";
import { StudioStoryboardExternalAudioPanel } from "@/components/studio/studio-storyboard-external-audio-panel";
import { StudioWorkspaceAudioMixPanel } from "@/components/studio/studio-workspace-audio-mix-panel";
import { StudioWorkspaceShotPlannerPanel } from "@/components/studio/studio-workspace-shot-planner-panel";
import { StudioWorkspaceVisualProductionPanel } from "@/components/studio/studio-workspace-visual-production-panel";
import { StudioWorkspaceConsistencyPanel } from "@/components/studio/studio-workspace-consistency-panel";
import { StudioWorkspaceContinuityPanel } from "@/components/studio/studio-workspace-continuity-panel";
import { StudioWorkspaceCreativeReviewPanel } from "@/components/studio/studio-workspace-creative-review-panel";
import { StudioWorkspaceCreationAssistantPanel } from "@/components/studio/studio-workspace-creation-assistant-panel";
import { StudioWorkspaceProductionHistoryPanel } from "@/components/studio/studio-workspace-production-history-panel";
import { StudioWorkspaceStoryArchitecturePanel } from "@/components/studio/studio-workspace-story-architecture-panel";
import { StudioWorkspaceSnapshotsSection } from "@/components/studio/studio-workspace-snapshots-section";
import {
  StudioWorkspaceDownloadPanel,
  StudioWorkspaceRenderPanel,
  StudioWorkspaceTextProductionPanel,
  StudioWorkspaceTranslatePanelEmbedded,
  StudioWorkspaceVersionsPanel,
} from "@/components/studio/studio-workspace-production-panels";
import { useStoryboardMotionProjects } from "@/hooks/use-studio-workspace-motion";
import { useActiveTranslator } from "@/i18n/client";
import { collectStoryboardCharacters } from "@/lib/studio-character-voice";
import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type { StudioToolId } from "@/lib/studio-tool-id";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioSceneDetail,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";

type Props = {
  tool: StudioToolId;
  storyboardId: string;
  storyboard: StudioStoryboardDetail;
  activeScene: StudioSceneDetail | null;
  activeSceneIndex: number;
  sceneCount: number;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
  projectMemory: StudioProjectMemorySnapshot | null;
  styleProfile: StudioPromptStyleProfile;
  directorProfile: StudioDirectorProfile;
  canModify: boolean;
  onStoryboardUpdated: (storyboard: StudioStoryboardDetail) => void;
  onSceneUpdated: (scene: StudioSceneDetail) => void;
  onRefreshStoryboard?: () => void | Promise<void>;
  onCharacterUpdated?: (character: StudioCharacterListItem) => void;
  onSwitchTool?: (tool: StudioToolId) => void;
};

const PRODUCTION_TOOLS = new Set<StudioToolId>(["render", "versions", "translate", "export"]);

function StudioWorkspaceVoicePanel({
  storyboard,
  characters,
  canModify,
  onStoryboardUpdated,
  onCharacterUpdated,
}: {
  storyboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  canModify: boolean;
  onStoryboardUpdated: (storyboard: StudioStoryboardDetail) => void;
  onCharacterUpdated?: (character: StudioCharacterListItem) => void;
}) {
  const t = useActiveTranslator();
  const storyLanguage = storyboard.voiceLanguage ?? "en";
  const storyCharacters = collectStoryboardCharacters(storyboard).map(
    (c) => characters.find((lib) => lib.id === c.id) ?? c
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{t("studio.tools.voice")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.workspace.voice.hint")}</p>
      </div>
      <StudioWorkspaceAudioMixPanel
        storyboard={storyboard}
        canModify={canModify}
        onStoryboardUpdated={onStoryboardUpdated}
      />
      <StudioStoryboardExternalAudioPanel
        storyboard={storyboard}
        characters={characters}
        canModify={canModify}
        onStoryboardUpdated={onStoryboardUpdated}
        onCharacterUpdated={onCharacterUpdated}
      />
      <StudioWorkspaceAudioProductionPanel
        storyboard={storyboard}
        characters={characters}
        canModify={canModify}
      />
      <StudioVoiceDirectorPanel
        storyboard={storyboard}
        canModify={canModify}
        onStoryboardUpdated={onStoryboardUpdated}
      />
      <StudioStoryboardVoiceIdentityPanel storyboard={storyboard} />
      {storyCharacters.length > 0 ?
        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-900">{t("studio.workspace.voice.charactersTitle")}</h3>
          <p className="mt-1 text-xs text-zinc-600">{t("studio.workspace.voice.charactersInlineHint")}</p>
          <ul className="mt-3 space-y-3">
            {storyCharacters.map((character) => (
              <li key={character.id}>
                <StudioWorkspaceCharacterVoiceInline
                  character={character}
                  storyLanguage={storyLanguage}
                  storyVoiceProfile={storyboard.voiceProfile}
                  canModify={canModify}
                  onCharacterUpdated={(updated) => onCharacterUpdated?.(updated)}
                />
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
  locations,
  props,
  worlds,
  projectMemory,
  styleProfile,
  directorProfile,
  canModify,
  onStoryboardUpdated,
  onSceneUpdated,
  onRefreshStoryboard,
  onCharacterUpdated,
  onSwitchTool,
}: Props) {
  const t = useActiveTranslator();
  const needsMotionProjects = PRODUCTION_TOOLS.has(tool) || tool === "text";
  const { projects, loading } = useStoryboardMotionProjects(storyboardId, needsMotionProjects);

  if (tool === "storyArchitecture") {
    return (
      <StudioWorkspaceStoryArchitecturePanel
        storyboard={storyboard}
        characters={characters}
        locations={locations}
        props={props}
        worlds={worlds}
        projectMemory={projectMemory}
        styleProfile={styleProfile}
        directorProfile={directorProfile}
        onSwitchTool={onSwitchTool}
      />
    );
  }

  if (tool === "productionHistory") {
    return (
      <StudioWorkspaceProductionHistoryPanel
        storyboard={storyboard}
        characters={characters}
        locations={locations}
        props={props}
        worlds={worlds}
        projectMemory={projectMemory}
        onSwitchTool={onSwitchTool}
        onRefreshStoryboard={onRefreshStoryboard}
        canModify={canModify}
      />
    );
  }

  if (tool === "creationAssistant") {
    return (
      <StudioWorkspaceCreationAssistantPanel
        storyboard={storyboard}
        characters={characters}
        locations={locations}
        props={props}
        worlds={worlds}
        projectMemory={projectMemory}
        styleProfile={styleProfile}
        directorProfile={directorProfile}
        onSwitchTool={onSwitchTool}
      />
    );
  }

  if (tool === "creativeReview") {
    return (
      <StudioWorkspaceCreativeReviewPanel
        storyboard={storyboard}
        characters={characters}
        locations={locations}
        props={props}
        worlds={worlds}
        projectMemory={projectMemory}
        styleProfile={styleProfile}
        directorProfile={directorProfile}
        onSwitchTool={onSwitchTool}
      />
    );
  }

  if (tool === "continuity") {
    if (!projectMemory) {
      return (
        <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-600">
          {t("common.loading")}
        </div>
      );
    }
    return (
      <StudioWorkspaceContinuityPanel
        storyboard={storyboard}
        characters={characters}
        locations={locations}
        props={props}
        worlds={worlds}
        memory={projectMemory}
        styleProfile={styleProfile}
        directorProfile={directorProfile}
        onSwitchTool={onSwitchTool}
      />
    );
  }

  if (tool === "consistency") {
    return (
      <StudioWorkspaceConsistencyPanel
        storyboard={storyboard}
        characters={characters}
        locations={locations}
        props={props}
        worlds={worlds}
        styleProfile={styleProfile}
        directorProfile={directorProfile}
        onSwitchTool={onSwitchTool}
      />
    );
  }

  if (tool === "visual") {
    return (
      <div className="space-y-6">
        <StudioWorkspaceShotPlannerPanel
          storyboard={storyboard}
          characters={characters}
          locations={locations}
          props={props}
          worlds={worlds}
          canModify={canModify}
          onStoryboardUpdated={onStoryboardUpdated}
          onScenesUpdated={onRefreshStoryboard}
        />
        <StudioWorkspaceVisualProductionPanel
          storyboardId={storyboardId}
          storyboard={storyboard}
          activeScene={activeScene}
          activeSceneIndex={activeSceneIndex}
          styleProfile={styleProfile}
          directorProfile={directorProfile}
          canModify={canModify}
          onSceneUpdated={onSceneUpdated}
          onRefreshStoryboard={onRefreshStoryboard}
          onSwitchTool={onSwitchTool}
          characters={characters}
          locations={locations}
          props={props}
          worlds={worlds}
        />
      </div>
    );
  }

  if (tool === "voice") {
    return (
      <StudioWorkspaceVoicePanel
        storyboard={storyboard}
        characters={characters}
        canModify={canModify}
        onStoryboardUpdated={onStoryboardUpdated}
        onCharacterUpdated={onCharacterUpdated}
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
      <StudioWorkspaceRenderPanel
        storyboardId={storyboardId}
        storyboard={storyboard}
        characters={characters}
        locations={locations}
        props={props}
        worlds={worlds}
        projects={projects}
        loading={loading}
      />
    );
  }

  if (tool === "versions") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{t("studio.tools.versions")}</h2>
          <p className="mt-1 text-sm text-zinc-600">{t("studio.snapshot.versions.subtitle")}</p>
        </div>
        <StudioWorkspaceSnapshotsSection
          storyboard={storyboard}
          characters={characters}
          locations={locations}
          props={props}
          worlds={worlds}
          projectMemory={projectMemory}
          canModify={canModify}
          onRestored={onRefreshStoryboard}
          onSwitchTool={onSwitchTool}
        />
        <StudioWorkspaceVersionsPanel
          storyboardId={storyboardId}
          projects={projects}
          loading={loading}
          onSwitchTool={onSwitchTool}
        />
      </div>
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
