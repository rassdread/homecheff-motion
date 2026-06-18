/**
 * Quality and risk warnings for Assistant V4.
 */

import type { AssistantV3TurnInput } from "@/lib/assistant-v3-intelligence";
import { resolveAssistantV3AssetContext } from "@/lib/assistant-v3-intelligence";
import type { AssistantToolMatchResult } from "@/types/assistant-v4";

export type AssistantRiskWarning = {
  id: string;
  messageNl: string;
  messageEn: string;
  severity: "info" | "warning";
};

export function buildAssistantRiskWarnings(
  input: AssistantV3TurnInput,
  match: AssistantToolMatchResult | null
): AssistantRiskWarning[] {
  const warnings: AssistantRiskWarning[] = [];
  const asset = resolveAssistantV3AssetContext(input);
  const text = input.message.toLowerCase();

  if (asset?.assetType === "human" && match?.morphActionId === "human_to_cartoon") {
    warnings.push({
      id: "human_dark_photo",
      messageNl:
        "Deze foto is mogelijk donker of onscherp. Een cartoonversie werkt beter als het gezicht duidelijk zichtbaar is.",
      messageEn:
        "This photo may be dark or blurry. A cartoon version works better when the face is clearly visible.",
      severity: "warning",
    });
  }

  if (asset?.assetType === "animal" && match?.morphActionId === "pet_to_mascot") {
    warnings.push({
      id: "animal_partial_frame",
      messageNl:
        "Het dier is mogelijk deels buiten beeld. Staart of poten kunnen minder goed behouden blijven.",
      messageEn: "The animal may be partially out of frame. Tail or paws may be harder to preserve.",
      severity: "warning",
    });
  }

  if (match?.bestTool.category === "motion") {
    const project = input.activeProject ?? input.studio.project;
    if (project && project.assetStats.characterCount >= 2) {
      warnings.push({
        id: "motion_style_drift",
        messageNl:
          "De scènes kunnen sterk van stijl verschillen. Character consistency kan lager zijn.",
        messageEn: "Scenes may differ strongly in style. Character consistency may be lower.",
        severity: "warning",
      });
    }
  }

  if (/voice|stem/i.test(text)) {
    const voices = input.snapshot.library.voice.filter(
      (r) => r.projectId === (input.activeProject?.id ?? input.memory.selectedProjectId)
    );
    if (voices.length === 0) {
      warnings.push({
        id: "voice_no_preview",
        messageNl: "Deze stem heeft nog geen voorbeeldzin. Preview eerst aanbevolen.",
        messageEn: "This voice has no sample line yet. Preview is recommended first.",
        severity: "info",
      });
    }
  }

  if (
    match?.bestTool.toolId === "editor_masked_edit" &&
    (match.recommendedSettings.targetPart === "eyes" || /ogen|eyes/i.test(text))
  ) {
    warnings.push({
      id: "eyes_face_drift",
      messageNl: "Risico: het gezicht kan iets veranderen bij grote oog-aanpassingen.",
      messageEn: "Risk: the face may shift slightly with large eye adjustments.",
      severity: "info",
    });
  }

  return warnings.slice(0, 3);
}
