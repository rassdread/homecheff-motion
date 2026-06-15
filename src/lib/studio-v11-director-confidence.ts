import type { StudioProductionBrief } from "@/types/studio-production-brief";
import type { StudioProductionBriefSelections } from "@/types/studio-production-brief-v3";
import type {
  StudioV11ConfidenceField,
  StudioV11ConfidenceLevel,
  StudioV11DirectorSuggestions,
  StudioV11FieldConfidence,
} from "@/types/studio-v11-director-wizard";

function scoreToLevel(score: number): StudioV11ConfidenceLevel {
  if (score >= 0.75) return "high";
  if (score >= 0.45) return "medium";
  return "low";
}

function ideaMentions(idea: string, patterns: RegExp[]): boolean {
  const lower = idea.toLowerCase();
  return patterns.some((p) => p.test(lower));
}

export function scoreDirectorFieldConfidences(input: {
  idea: string;
  selections: StudioProductionBriefSelections;
  suggestions: StudioV11DirectorSuggestions;
  brief?: StudioProductionBrief;
}): StudioV11FieldConfidence[] {
  const { idea, selections, suggestions, brief } = input;
  const lower = idea.toLowerCase();

  const fields: Array<{ field: StudioV11ConfidenceField; score: number; suggestion: string | string[]; reasonKey: string }> = [
    {
      field: "goal",
      score: selections.goals.length > 0 && idea.length > 20 ? 0.8 : selections.goals.length > 0 ? 0.55 : 0.3,
      suggestion: suggestions.goal,
      reasonKey: "studio.v11.confidence.reason.goal",
    },
    {
      field: "audience",
      score:
        ideaMentions(idea, [/ondernemer|entrepreneur|klant|customer|jong|youth|senior|doelgroep|audience/]) ||
        (selections.audience[0] && selections.audience[0] !== "general")
          ? 0.78
          : selections.audience[0]
            ? 0.5
            : 0.28,
      suggestion: suggestions.audience,
      reasonKey: "studio.v11.confidence.reason.audience",
    },
    {
      field: "cta",
      score: ideaMentions(idea, [/koop|buy|registreer|sign up|contact|ontdek|discover|cta|actie|action/]) ? 0.82 : 0.35,
      suggestion: suggestions.cta,
      reasonKey: "studio.v11.confidence.reason.cta",
    },
    {
      field: "duration",
      score:
        ideaMentions(idea, [/\b15\s*sec|\b30\s*sec|\b60\s*sec|\b90\s*sec|seconden|seconds|minuut|minute/]) ||
        selections.length[0]
          ? 0.72
          : 0.4,
      suggestion: suggestions.durationLabel,
      reasonKey: "studio.v11.confidence.reason.duration",
    },
    {
      field: "narrativeType",
      score:
        ideaMentions(idea, [/documentair|documentary|reclame|commercial|uitleg|explainer|community|verhaal|story/]) ||
        selections.goals.includes("story")
          ? 0.76
          : 0.42,
      suggestion: suggestions.narrativeType,
      reasonKey: "studio.v11.confidence.reason.narrativeType",
    },
    {
      field: "characters",
      score:
        suggestions.characters.length >= 2 &&
        !suggestions.characters[0]!.toLowerCase().includes(idea.slice(0, 24).toLowerCase())
          ? 0.88
          : lower.includes("sergio") || lower.includes("mascot") || lower.includes("personage")
            ? 0.8
            : brief && brief.mainCharacters.length > 0
              ? 0.7
              : 0.32,
      suggestion: suggestions.characters,
      reasonKey: "studio.v11.confidence.reason.characters",
    },
    {
      field: "locations",
      score:
        lower.includes("rotterdam") || suggestions.locations.length >= 2
          ? 0.85
          : brief && brief.recommendedLocations.length > 0
            ? 0.68
            : ideaMentions(idea, [/locatie|location|stad|city|plek|markt|universiteit/])
              ? 0.55
              : 0.3,
      suggestion: suggestions.locations,
      reasonKey: "studio.v11.confidence.reason.locations",
    },
    {
      field: "products",
      score:
        suggestions.products.length > 0 || ideaMentions(idea, [/product|app|platform|merk|brand|homecheff/])
          ? 0.62
          : 0.25,
      suggestion: suggestions.products,
      reasonKey: "studio.v11.confidence.reason.products",
    },
    {
      field: "emotion",
      score: selections.tones.length > 0 && selections.tones[0] !== "energetic" ? 0.7 : selections.tones.length > 0 ? 0.52 : 0.35,
      suggestion: suggestions.emotion,
      reasonKey: "studio.v11.confidence.reason.emotion",
    },
    {
      field: "dialogueMode",
      score: selections.narrative.length > 0 && selections.narrative[0] !== "both" ? 0.74 : selections.narrative.length > 0 ? 0.48 : 0.36,
      suggestion: suggestions.dialogueMode,
      reasonKey: "studio.v11.confidence.reason.dialogueMode",
    },
  ];

  return fields.map((row) => ({
    field: row.field,
    level: scoreToLevel(row.score),
    suggestion: row.suggestion,
    reasonKey: row.reasonKey,
  }));
}

export function resolveOverallDirectorConfidence(
  confidences: StudioV11FieldConfidence[]
): StudioV11ConfidenceLevel {
  const low = confidences.filter((c) => c.level === "low").length;
  const medium = confidences.filter((c) => c.level === "medium").length;
  if (low >= 4) return "low";
  if (low >= 2 || medium >= 5) return "medium";
  return "high";
}

export function questionLimitForOverall(level: StudioV11ConfidenceLevel): { min: number; max: number } {
  if (level === "high") return { min: 0, max: 2 };
  if (level === "medium") return { min: 2, max: 5 };
  return { min: 5, max: 8 };
}
