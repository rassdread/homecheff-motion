"use client";

import { useSyncExternalStore } from "react";
import { StudioProjectAssistantRail } from "@/components/studio/studio-project-assistant-rail";
import {
  readStudioFilmAssistantContext,
  subscribeStudioFilmAssistantContext,
} from "@/lib/studio-film-assistant-bridge";

/** Renders the film assistant inside the existing sidebar when a film workspace is open. */
export function StudioFilmAssistantHost({ onCollapse }: { onCollapse: () => void }) {
  const context = useSyncExternalStore(
    subscribeStudioFilmAssistantContext,
    readStudioFilmAssistantContext,
    () => null,
  );
  if (!context) return null;
  return (
    <div className="px-3 py-3" data-testid="studio-v23-film-assistant-host">
      <StudioProjectAssistantRail
        projectId={context.projectId}
        projectTitle={context.projectTitle}
        sectionLabel={context.sectionLabel}
        section={context.section}
        sceneId={context.sceneId}
        sceneTitle={context.sceneTitle}
        characterId={context.characterId}
        characterName={context.characterName}
        scenes={context.scenes}
        balance={context.balance}
        collapsed={false}
        onToggle={onCollapse}
      />
    </div>
  );
}

export function useStudioFilmAssistantContext() {
  return useSyncExternalStore(
    subscribeStudioFilmAssistantContext,
    readStudioFilmAssistantContext,
    () => null,
  );
}
