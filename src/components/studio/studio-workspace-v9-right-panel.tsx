"use client";

import { StudioDirectorInspectorColumn } from "@/components/studio/director-v2/studio-director-inspector-column";
import { StudioProductionInsightsRail } from "@/components/studio/studio-production-insights-rail";
import { StudioSceneHandoffBadges } from "@/components/studio/studio-scene-handoff-badges";
import { StudioWorkspaceChangePlanPanel } from "@/components/studio/studio-workspace-change-plan-panel";
import { StudioWorkspaceAudioReviewSummary } from "@/components/studio/studio-workspace-audio-review-summary";
import { isStudioAiAssistantEnabled } from "@/lib/studio-ai-assistant-flag";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type {
  StudioCharacterListItem,
  StudioSceneDetail,
  StudioStoryboardDetail,
} from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
  scene: StudioSceneDetail;
  sceneIndex: number;
  sceneCount: number;
  styleProfile: StudioPromptStyleProfile;
  directorProfile: StudioDirectorProfile;
  saving: boolean;
  characters: StudioCharacterListItem[];
  canModify: boolean;
  onSceneUpdated: (scene: StudioSceneDetail) => void;
};

export function StudioWorkspaceV9RightPanel({
  storyboard,
  scene,
  sceneIndex,
  sceneCount,
  saving,
  characters,
  canModify,
  onSceneUpdated,
}: Props) {
  const t = useActiveTranslator();

  return (
    <div className="space-y-4" data-testid="studio-v9-right-panel">
      <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          {t("studio.v9.right.aiDirector" as never)}
        </p>
      </div>

      {isStudioAiAssistantEnabled() ?
        <StudioProductionInsightsRail
          storyboard={storyboard}
          scene={scene}
          sceneIndex={sceneIndex}
          sceneCount={sceneCount}
          characters={characters}
          canModify={canModify}
          onSceneUpdated={onSceneUpdated}
        />
      : null}

      <StudioWorkspaceChangePlanPanel storyboardId={storyboard.id} />

      <StudioWorkspaceAudioReviewSummary
        storyboard={storyboard}
        characters={characters}
        storyboardId={storyboard.id}
      />

      <StudioSceneHandoffBadges scene={scene} />
      <StudioDirectorInspectorColumn
        scene={scene}
        sceneIndex={sceneIndex}
        sceneCount={sceneCount}
        saving={saving}
      />
    </div>
  );
}
