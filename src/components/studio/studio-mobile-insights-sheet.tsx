"use client";

import { MotionBottomSheet } from "@/components/ui/motion-bottom-sheet";
import { StudioProductionInsightsRail } from "@/components/studio/studio-production-insights-rail";
import { isStudioAiAssistantEnabled } from "@/lib/studio-ai-assistant-flag";
import type { StudioToolId } from "@/lib/studio-tool-id";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioCharacterListItem, StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";

type Props = {
  open: boolean;
  onClose: () => void;
  storyboard: StudioStoryboardDetail;
  scene: StudioSceneDetail;
  sceneIndex: number;
  sceneCount: number;
  characters: StudioCharacterListItem[];
  canModify: boolean;
  onSceneUpdated: (scene: StudioSceneDetail) => void;
  onSwitchTool?: (tool: StudioToolId) => void;
  projectMemory?: StudioProjectMemorySnapshot | null;
};

export function StudioMobileInsightsSheet({
  open,
  onClose,
  storyboard,
  scene,
  sceneIndex,
  sceneCount,
  characters,
  canModify,
  onSceneUpdated,
  onSwitchTool,
  projectMemory,
}: Props) {
  const t = useActiveTranslator();

  if (!isStudioAiAssistantEnabled()) {
    return null;
  }

  return (
    <MotionBottomSheet open={open} title={t("studio.mobileInsights.title")} onClose={onClose}>
      <StudioProductionInsightsRail
        storyboard={storyboard}
        scene={scene}
        sceneIndex={sceneIndex}
        sceneCount={sceneCount}
        characters={characters}
        canModify={canModify}
        onSceneUpdated={onSceneUpdated}
        compact
        onSwitchTool={onSwitchTool}
        projectMemory={projectMemory}
      />
    </MotionBottomSheet>
  );
}
