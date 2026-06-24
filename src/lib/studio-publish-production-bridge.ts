/**
 * Bridge orchestrator music → Publish production config for export mux.
 */

import {
  defaultPublishMusicConfig,
  defaultPublishProductionConfig,
  loadPublishProductionFromProject,
  savePublishProductionToProject,
} from "@/lib/publish-media-production";
import type { PublishProject } from "@/types/publish-overlay";
import type { HcOrchestratorState } from "@/types/studio-video-production";

export function hydratePublishProjectWithOrchestratorMusic(
  project: PublishProject,
  orchestrator: HcOrchestratorState | null | undefined
): PublishProject {
  const musicUrl = orchestrator?.musicAudioUrl?.trim();
  if (!musicUrl) {
    return project;
  }

  const production = loadPublishProductionFromProject(project);
  const base = production.voice ? production : defaultPublishProductionConfig();

  return savePublishProductionToProject(project, {
    ...base,
    music: {
      ...defaultPublishMusicConfig(),
      ...base.music,
      mode: "upload",
      trackUrl: musicUrl,
      label: "Production music",
      durationMatch: true,
      volume: base.music?.volume ?? 70,
    },
  });
}
