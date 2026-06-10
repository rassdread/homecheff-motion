import { computeStudioHandoffScore } from "@/lib/editor-v6-handoff-score";
import { resolveHumanFirstObjectType } from "@/lib/editor-ux-cleanup";
import type { EditorCanvasDocument, EditorV7ContextualSuggestion } from "@/types/homecheff-visual-editor";

export function resolveContextualCommandSuggestions(
  document: EditorCanvasDocument
): EditorV7ContextualSuggestion[] {
  const suggestions: EditorV7ContextualSuggestion[] = [];
  const types = new Set(
    document.objects
      .filter((l) => l.layerType !== "background")
      .map((l) => resolveHumanFirstObjectType(l))
  );

  const hasBackground = document.objects.some((l) => l.layerType === "background");
  const handoff = computeStudioHandoffScore(document);

  suggestions.push({
    id: "poster",
    labelKey: "editor.v7.suggest.poster",
    prompt: "Turn this into a restaurant poster",
  });

  if (handoff.score < 80) {
    suggestions.push({
      id: "motion",
      labelKey: "editor.v7.suggest.motion",
      prompt: "Make this motion-ready",
    });
  }

  if (hasBackground) {
    suggestions.push({
      id: "remove_bg",
      labelKey: "editor.v7.suggest.removeBackground",
      prompt: "Remove background",
    });
  }

  if (!types.has("logo")) {
    suggestions.push({
      id: "logo",
      labelKey: "editor.v7.suggest.addLogo",
      prompt: "Add my logo to the shirt",
    });
  }

  if (types.has("globe")) {
    suggestions.push({
      id: "gif",
      labelKey: "editor.v7.suggest.gif",
      prompt: "Create a GIF of the globe",
    });
  }

  suggestions.push({
    id: "social",
    labelKey: "editor.v7.suggest.social",
    prompt: "Make this suitable for Instagram",
  });

  return suggestions.slice(0, 6);
}
