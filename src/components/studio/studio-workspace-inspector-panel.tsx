"use client";

import { StudioDirectorInspectorColumn } from "@/components/studio/director-v2/studio-director-inspector-column";
import { StudioProductionInsightsRail } from "@/components/studio/studio-production-insights-rail";
import { StudioSceneHandoffBadges } from "@/components/studio/studio-scene-handoff-badges";
import { isStudioAiAssistantEnabled } from "@/lib/studio-ai-assistant-flag";
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

export function StudioWorkspaceInspectorPanel({
  storyboard,
  scene,
  sceneIndex,
  sceneCount,
  saving,
  characters,
  canModify,
  onSceneUpdated,
}: Props) {
  return (
    <div className="space-y-4">
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
