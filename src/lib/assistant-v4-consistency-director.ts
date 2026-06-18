/**
 * Asset consistency director for Assistant V4.
 */

import { buildAssistantActionRoute } from "@/lib/assistant-route-builder";
import type { AssistantV3TurnInput } from "@/lib/assistant-v3-intelligence";
import type { AssistantConsistencySuggestion } from "@/types/assistant-v4";

export function analyzeAssetConsistency(input: AssistantV3TurnInput): AssistantConsistencySuggestion[] {
  const suggestions: AssistantConsistencySuggestion[] = [];
  const project = input.activeProject ?? input.studio.project;
  if (!project) {
    return suggestions;
  }

  const characters = input.snapshot.library.characters.filter((r) => r.projectId === project.id);
  const videos = input.snapshot.library.motionVideos.filter((r) => r.projectId === project.id);
  const worldAssets = input.snapshot.library.assets.filter(
    (r) => r.projectId === project.id && /world|wereld/i.test(`${r.assetName} ${r.promptSummary ?? ""}`)
  );
  const locationAssets = input.snapshot.library.assets.filter(
    (r) => r.projectId === project.id && /location|locatie|keuken|kantoor|tuin/i.test(`${r.assetName} ${r.promptSummary ?? ""}`)
  );

  const mascotStyles = new Set(
    characters
      .filter((c) => /mascot|globe|chef|garden|designer/i.test(c.assetName))
      .map((c) => (c.promptSummary ?? c.assetName).toLowerCase().slice(0, 32))
  );
  if (mascotStyles.size >= 2) {
    suggestions.push({
      id: "harmonize_mascot",
      messageNl: "Meerdere mascotte-stijlen gedetecteerd — harmoniseer naar één brand-variant.",
      messageEn: "Multiple mascot styles detected — harmonize to one brand variant.",
      severity: "warning",
      suggestedActionId: "edit_mascot",
      suggestedRoute: buildAssistantActionRoute("edit_mascot", { projectId: project.id }),
    });
  }

  const faceHashes = new Set(
    characters.map((c) => `${c.assetName}:${(c.promptSummary ?? "").slice(0, 24)}`.toLowerCase())
  );
  if (characters.length >= 2 && faceHashes.size >= 2) {
    suggestions.push({
      id: "character_face_drift",
      messageNl: "Personagegezichten lijken inconsistent — gebruik één referentiepersonage.",
      messageEn: "Character faces look inconsistent — use one reference character.",
      severity: "suggestion",
      suggestedActionId: "create_character",
      suggestedRoute: buildAssistantActionRoute("create_character", { projectId: project.id }),
    });
  }

  const outfitKeywords = characters.map((c) => {
    const text = `${c.assetName} ${c.promptSummary ?? ""}`.toLowerCase();
    if (/chef/i.test(text)) return "chef";
    if (/garden/i.test(text)) return "garden";
    if (/designer/i.test(text)) return "designer";
    return "default";
  });
  if (new Set(outfitKeywords).size >= 3) {
    suggestions.push({
      id: "outfit_inconsistency",
      messageNl: "Outfits verschillen sterk — overweeg één outfitlijn per personage.",
      messageEn: "Outfits differ strongly — consider one outfit line per character.",
      severity: "suggestion",
      suggestedActionId: "prepare_outfit",
    });
  }

  const reusableMissing =
    characters.length > 0 &&
    input.snapshot.library.references.filter((r) => r.projectId === project.id).length < characters.length;
  if (reusableMissing) {
    suggestions.push({
      id: "save_reusable",
      messageNl: "Sla personages op in Library voor hergebruik in Studio en Motion.",
      messageEn: "Save characters to Library for reuse in Studio and Motion.",
      severity: "info",
      suggestedActionId: "open_asset",
      suggestedRoute: buildAssistantActionRoute("open_asset", { projectId: project.id }),
    });
  }

  if (videos.length >= 2) {
    const aspects = new Set(videos.map((v) => (v.promptSummary ?? "").match(/16:9|9:16|1:1/)?.[0] ?? "unknown"));
    if (aspects.size >= 2) {
      suggestions.push({
        id: "aspect_ratio_mismatch",
        messageNl: "Verschillende beeldverhoudingen over scènes — export kan inconsistent aanvoelen.",
        messageEn: "Different aspect ratios across scenes — export may feel inconsistent.",
        severity: "warning",
      });
    }
  }

  if (worldAssets.length > 0 && locationAssets.length === 0 && project.assetStats.videoCount > 0) {
    suggestions.push({
      id: "use_location",
      messageNl: "Je hebt een World maar geen Location — koppel een concrete locatie voor consistente scènes.",
      messageEn: "You have a World but no Location — link a concrete location for consistent scenes.",
      severity: "suggestion",
      suggestedActionId: "prepare_location",
      suggestedRoute: buildAssistantActionRoute("prepare_location", { projectId: project.id }),
    });
  }

  const voices = input.snapshot.library.voice.filter((r) => r.projectId === project.id);
  if (voices.length >= 2) {
    suggestions.push({
      id: "same_voice",
      messageNl: "Meerdere stemmen in één project — overweeg dezelfde voice voor consistentie.",
      messageEn: "Multiple voices in one project — consider the same voice for consistency.",
      severity: "info",
    });
  }

  return suggestions.slice(0, 4);
}
