"use client";

import { StudioDirectorSectionText } from "@/components/studio/director-v2/sections/text-section";
import { StudioMusicDirectorPanel } from "@/components/studio/studio-music-director-panel";
import { StudioSoundDirectorPanel } from "@/components/studio/studio-sound-director-panel";
import { StudioV9VoiceLibraryPanel } from "@/components/studio/studio-v9-voice-library-panel";
import { StudioV9MusicPanel } from "@/components/studio/studio-v9-music-panel";
import { StudioV9SoundEffectsPanel } from "@/components/studio/studio-v9-sound-effects-panel";
import { StudioStoryboardVoiceIdentityPanel } from "@/components/studio/studio-storyboard-voice-identity-panel";
import { StudioSubtitlePreviewPanel } from "@/components/studio/studio-subtitle-preview-panel";
import { StudioTextBeatsPreviewPanel } from "@/components/studio/studio-text-beats-preview-panel";
import { StudioVoiceDirectorPanel } from "@/components/studio/studio-voice-director-panel";
import { StudioVoiceCastOverviewPanel } from "@/components/studio/studio-voice-cast-overview-panel";
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
import { StudioWorkspaceDirectorPreferencesPanel } from "@/components/studio/studio-workspace-director-preferences-panel";
import { StudioWorkspaceInsightsHubPanel } from "@/components/studio/studio-workspace-insights-hub-panel";
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
  isAdmin?: boolean;
};

const PRODUCTION_TOOLS = new Set<StudioToolId>(["render", "versions", "translate", "export"]);

function StudioWorkspaceVoicePanel({
  storyboard,
  storyboardId,
  activeScene,
  activeSceneIndex,
  characters,
  canModify,
  onStoryboardUpdated,
  onCharacterUpdated,
  isAdmin = false,
}: {
  storyboard: StudioStoryboardDetail;
  storyboardId: string;
  activeScene: StudioSceneDetail | null;
  activeSceneIndex: number;
  characters: StudioCharacterListItem[];
  canModify: boolean;
  onStoryboardUpdated: (storyboard: StudioStoryboardDetail) => void;
  onCharacterUpdated?: (character: StudioCharacterListItem) => void;
  isAdmin?: boolean;
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
        <p
          className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2 text-xs font-medium text-indigo-950"
          data-testid="studio-audio-ownership-voice"
        >
          {t("studio.workspace.audioOwnership.voice")}
        </p>
      </div>
      <StudioV9VoiceLibraryPanel
        storyboardId={storyboardId}
        storyLanguage={storyLanguage}
        activeScene={activeScene}
        activeSceneIndex={activeSceneIndex}
        characters={storyCharacters}
        canModify={canModify}
      />
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
      <section className="rounded-2xl border border-violet-200 bg-violet-50/30 p-4">
        <StudioVoiceCastOverviewPanel
          storyboard={storyboard}
          characters={characters}
        />
      </section>
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
                  isAdmin={isAdmin}
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
          <p className="font-medium">{t("studio.workspace.subtitles.requiresVoiceTitle")}</p>
          <p className="mt-1">{t("studio.workspace.subtitles.enableVoiceHint")}</p>
          <p className="mt-1 text-xs text-amber-900/80">{t("studio.workspace.subtitles.scopeHint")}</p>
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
  isAdmin = false,
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

  if (tool === "insights") {
    return (
      <StudioWorkspaceInsightsHubPanel
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

  if (tool === "directorPreferences") {
    return <StudioWorkspaceDirectorPreferencesPanel storyboard={storyboard} />;
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
        storyboardId={storyboardId}
        activeScene={activeScene}
        activeSceneIndex={activeSceneIndex}
        characters={characters}
        canModify={canModify}
        onStoryboardUpdated={onStoryboardUpdated}
        onCharacterUpdated={onCharacterUpdated}
        isAdmin={isAdmin}
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
          <p
            className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs font-medium text-emerald-950"
            data-testid="studio-audio-ownership-music"
          >
            {t("studio.workspace.audioOwnership.music")}
          </p>
        </div>
        <StudioV9MusicPanel
          storyboardId={storyboardId}
          activeSceneId={activeScene?.id}
          activeSceneIndex={activeSceneIndex}
          canModify={canModify}
        />
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
          <p
            className="mt-2 rounded-lg border border-amber-100 bg-amber-50/70 px-3 py-2 text-xs font-medium text-amber-950"
            data-testid="studio-audio-ownership-sound"
          >
            {t("studio.workspace.audioOwnership.sound")}
          </p>
        </div>
        <StudioV9SoundEffectsPanel
          storyboardId={storyboardId}
          activeSceneId={activeScene?.id}
          activeSceneIndex={activeSceneIndex}
          canModify={canModify}
        />
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
