"use client";

import { useMemo, useState } from "react";
import { StudioFilmEditorPanel } from "@/components/studio/studio-film-editor-panel";
import { filmDocumentFromCreativeProject } from "@/lib/studio-creative-film-document";
import type { StudioFilmProjectDocument } from "@/lib/studio-film-pipeline";
import type { ProjectWorkspaceView } from "@/lib/studio-project-workspace";

/**
 * Film editing for the open creative project.
 * The project title is kept. Dialogue and subtitles save through the existing scene route.
 */
export function StudioProjectFilmEditor({ workspace }: { workspace: ProjectWorkspaceView }) {
  const seeded = useMemo(
    () =>
      filmDocumentFromCreativeProject({
        title: workspace.project.title,
        scenes: workspace.scenes.map((scene) => ({
          id: scene.id,
          order: scene.order,
          title: scene.title,
          dialogueText: scene.dialogueText,
          subtitleText: scene.subtitleText,
          characterId: scene.characters?.[0]?.id ?? null,
        })),
      }),
    [workspace],
  );
  const [film, setFilm] = useState<StudioFilmProjectDocument | null>(workspace.scenes.length > 0 ? seeded : null);

  if (workspace.scenes.length === 0) {
    return null;
  }

  return (
    <StudioFilmEditorPanel
      film={film ? { ...film, title: workspace.project.title } : seeded}
      music={workspace.music.map((item) => ({
        id: item.id,
        title: item.title,
        artist: "",
        source: "library",
        license: "owned",
        attributionRequired: false,
        attributionText: null,
        durationSeconds: 0,
        category: "Cinematic" as const,
        previewUrl: item.audioUrl,
      }))}
      pictures={workspace.scenes.map((scene) => ({ id: scene.id, label: scene.title || scene.id }))}
      onChange={(next) => {
        if (!next) return;
        const preserved = { ...next, title: workspace.project.title };
        const previous = film ?? seeded;
        setFilm(preserved);
        for (const scene of preserved.scenes) {
          const before = previous.scenes.find((item) => item.id === scene.id);
          if (!before) continue;
          const dialogueChanged = before.englishDialogue !== scene.englishDialogue;
          const subtitleChanged = before.dutchSubtitle !== scene.dutchSubtitle;
          const titleChanged = before.englishTitle !== scene.englishTitle;
          if (!dialogueChanged && !subtitleChanged && !titleChanged) continue;
          void fetch(`/api/studio/projects/${workspace.project.id}/scenes/${scene.id}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...(titleChanged ? { title: scene.englishTitle } : {}),
              ...(dialogueChanged ? { dialogueText: scene.englishDialogue } : {}),
              ...(subtitleChanged ? { subtitleText: scene.dutchSubtitle } : {}),
            }),
          });
        }
      }}
    />
  );
}
