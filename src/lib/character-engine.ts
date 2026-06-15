import {
  applyCharacterDynamicAiSuggestions,
  resolveCharacterDynamicQuestions,
  scoreCharacterIdeaConfidences,
} from "@/lib/character-dynamic-questions";
import {
  detectMotionCharacterParts,
  handsAndFeetRequiredForMotionReady,
  isMascotFlow,
  isPortraitOnlyFlow,
  portraitUploadDetectsMissingBody,
  resolveMotionWizardQuestions,
  resolveMotionStyleKind,
  summarizeMotionReadiness,
} from "@/lib/motion-ready-character-wizard";
import { detectBodyVisibilityFromVision } from "@/lib/studio-asset-animation-readiness";
import type {
  CharacterClusterRoute,
  CharacterDynamicQuestion,
  CharacterReferenceMode,
} from "@/types/character-cluster";
import type {
  CharacterAnalysisResult,
  CharacterCompletenessLevel,
  CharacterEngineSaveMetadata,
  CharacterEngineSummary,
  CharacterEngineSummaryLine,
  CharacterMotionReadinessResult,
} from "@/types/character-engine";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { MotionCharacterPartId } from "@/types/motion-ready-character-wizard";

const SUMMARY_PART_IDS: MotionCharacterPartId[] = [
  "face",
  "head",
  "torso",
  "arms",
  "hands",
  "legs",
  "feet",
  "clothing",
];

function partPresent(
  parts: CharacterAnalysisResult["partDetections"],
  id: MotionCharacterPartId
): boolean {
  return parts.find((p) => p.id === id)?.status === "present";
}

function analysisFromVision(vision: AssetVisionAnalysis): CharacterAnalysisResult {
  const partDetections = detectMotionCharacterParts(vision);
  const summary = summarizeMotionReadiness({ vision, parts: partDetections });
  const characterType =
    vision.objectType === "mascot" || isMascotFlow(vision)
      ? "mascot"
      : vision.objectType === "human"
        ? "human"
        : vision.objectTypeLabel?.toLowerCase() || vision.objectType || "character";

  return {
    characterType,
    confidence: vision.confidence ?? 0.7,
    hasFace: partPresent(partDetections, "face"),
    hasBody: partPresent(partDetections, "torso") || summary.bodyVisibility === "full_body",
    hasArms: partPresent(partDetections, "arms"),
    hasHands: partPresent(partDetections, "hands"),
    hasLegs: partPresent(partDetections, "legs"),
    hasFeet: partPresent(partDetections, "feet"),
    hasClothing: partPresent(partDetections, "clothing"),
    hasAccessories: false,
    visibleParts: summary.availableParts,
    missingParts: summary.missingParts,
    readinessScore: summary.readinessScore,
    partDetections,
    bodyVisibility: summary.bodyVisibility,
  };
}

function analysisFromIdea(idea: string): CharacterAnalysisResult {
  const confidences = scoreCharacterIdeaConfidences(idea);
  const avgScore =
    confidences.reduce((sum, row) => sum + row.score, 0) / Math.max(confidences.length, 1);
  const typeRow = confidences.find((c) => c.field === "characterType");
  const characterType = typeRow?.suggestion === "mascot" ? "mascot" : "human";
  const isMascot = characterType === "mascot";

  return {
    characterType,
    confidence: avgScore,
    hasFace: false,
    hasBody: false,
    hasArms: false,
    hasHands: false,
    hasLegs: false,
    hasFeet: false,
    hasClothing: /shirt|jacket|outfit|kleding|apron|dress/i.test(idea),
    hasAccessories: false,
    visibleParts: [],
    missingParts: isMascot
      ? (["hands", "feet", "legs", "arms"] as MotionCharacterPartId[])
      : (["body", "hands", "feet", "torso", "arms", "legs"] as MotionCharacterPartId[]),
    readinessScore: Math.round(avgScore * 100),
    partDetections: [],
    bodyVisibility: "unknown",
  };
}

export function analyzeCharacter(input: {
  vision?: AssetVisionAnalysis | null;
  idea?: string;
}): CharacterAnalysisResult {
  if (input.vision) {
    return analysisFromVision(input.vision);
  }
  return analysisFromIdea(input.idea?.trim() ?? "");
}

export function evaluateCharacterCompleteness(
  analysis: CharacterAnalysisResult
): CharacterCompletenessLevel {
  if (analysis.characterType === "mascot" || analysis.bodyVisibility === "mascot") {
    return "MASCOT";
  }
  if (analysis.bodyVisibility === "head_only") {
    return "HEAD_ONLY";
  }
  if (analysis.bodyVisibility === "portrait" || isPortraitOnlyFlow(analysis.bodyVisibility)) {
    return "PORTRAIT";
  }
  if (analysis.bodyVisibility === "unknown" && analysis.partDetections.length === 0) {
    return "UNKNOWN";
  }
  if (analysis.bodyVisibility === "full_body" && analysis.missingParts.length === 0) {
    return "COMPLETE";
  }
  if (
    analysis.bodyVisibility === "half_body" ||
    analysis.bodyVisibility === "partial" ||
    analysis.missingParts.length > 0
  ) {
    return "PARTIAL";
  }
  if (analysis.bodyVisibility === "unknown") {
    return "UNKNOWN";
  }
  return analysis.readinessScore >= 85 ? "COMPLETE" : "PARTIAL";
}

const COMPLETENESS_LABEL_KEYS: Record<CharacterCompletenessLevel, string> = {
  COMPLETE: "characterEngine.completeness.complete",
  PARTIAL: "characterEngine.completeness.partial",
  PORTRAIT: "characterEngine.completeness.portrait",
  HEAD_ONLY: "characterEngine.completeness.headOnly",
  MASCOT: "characterEngine.completeness.mascot",
  UNKNOWN: "characterEngine.completeness.unknown",
};

export function evaluateMotionReadiness(input: {
  analysis: CharacterAnalysisResult;
  vision?: AssetVisionAnalysis | null;
  strict?: boolean;
}): CharacterMotionReadinessResult {
  const { analysis, vision, strict = false } = input;
  const missingRequirements: string[] = [];

  if (!analysis.hasFace) {
    missingRequirements.push("face");
  }
  if (!analysis.hasBody && analysis.bodyVisibility !== "full_body") {
    missingRequirements.push("body");
  }
  if (!analysis.hasHands) {
    missingRequirements.push("hands");
  }
  if (!analysis.hasFeet) {
    missingRequirements.push("feet");
  }

  const recommendations: string[] = [];
  if (strict) {
    if (handsAndFeetRequiredForMotionReady(analysis.partDetections)) {
      if (!analysis.hasHands) {
        recommendations.push("characterEngine.recommendation.generateHands");
      }
      if (!analysis.hasFeet) {
        recommendations.push("characterEngine.recommendation.generateFeet");
      }
    }
    const missingBody =
      (vision ? portraitUploadDetectsMissingBody(vision) : false) ||
      isPortraitOnlyFlow(analysis.bodyVisibility);
    if (missingBody) {
      recommendations.push("characterEngine.recommendation.generateFullBody");
    }
    const background = analysis.partDetections.find((p) => p.id === "background");
    if (background?.status === "present") {
      recommendations.push("characterEngine.recommendation.transparentBackground");
    }
    const pose = analysis.partDetections.find((p) => p.id === "pose");
    if (pose && pose.status !== "present") {
      recommendations.push("characterEngine.recommendation.neutralPose");
    }
    if (!analysis.hasClothing) {
      recommendations.push("characterEngine.recommendation.animationClothing");
    }
  }

  const score = analysis.readinessScore;
  const ready = strict
    ? score >= 90 &&
      analysis.hasFace &&
      analysis.hasHands &&
      analysis.hasFeet &&
      (analysis.hasBody || analysis.bodyVisibility === "full_body")
    : score >= 75 && analysis.hasFace;

  return {
    ready,
    score,
    missingRequirements,
    recommendations,
  };
}

export function resolveCharacterEngineQuestions(input: {
  route: CharacterClusterRoute;
  idea?: string;
  vision?: AssetVisionAnalysis | null;
  referenceMode?: CharacterReferenceMode;
  locale?: "nl" | "en";
  strictMotion?: boolean;
}): CharacterDynamicQuestion[] {
  return resolveCharacterDynamicQuestions({
    route: input.route,
    idea: input.idea,
    vision: input.vision,
    referenceMode: input.referenceMode,
    locale: input.locale,
  });
}

export function seedCharacterEngineAnswers(
  questions: CharacterDynamicQuestion[]
): Record<string, string | boolean | undefined> {
  return applyCharacterDynamicAiSuggestions(questions);
}

function summaryLines(
  analysis: CharacterAnalysisResult,
  present: boolean
): CharacterEngineSummaryLine[] {
  if (analysis.partDetections.length > 0) {
    return analysis.partDetections
      .filter((p) => SUMMARY_PART_IDS.includes(p.id))
      .filter((p) => (present ? p.status === "present" : p.status !== "present"))
      .map((p) => ({
        id: p.id,
        labelKey: `motionReady.wizard.part.${p.id}`,
        present: p.status === "present",
      }));
  }

  const conceptParts: Array<{ id: MotionCharacterPartId; has: boolean }> = [
    { id: "face", has: analysis.hasFace },
    { id: "torso", has: analysis.hasBody },
    { id: "arms", has: analysis.hasArms },
    { id: "hands", has: analysis.hasHands },
    { id: "legs", has: analysis.hasLegs },
    { id: "feet", has: analysis.hasFeet },
    { id: "clothing", has: analysis.hasClothing },
  ];

  return conceptParts
    .filter((row) => (present ? row.has : !row.has))
    .map((row) => ({
      id: row.id,
      labelKey: `motionReady.wizard.part.${row.id}`,
      present: row.has,
    }));
}

export function buildCharacterSummary(input: {
  analysis: CharacterAnalysisResult;
  vision?: AssetVisionAnalysis | null;
  completeness?: CharacterCompletenessLevel;
  motionReadiness?: CharacterMotionReadinessResult;
  strictMotion?: boolean;
}): CharacterEngineSummary {
  const completeness = input.completeness ?? evaluateCharacterCompleteness(input.analysis);
  const motionReadiness =
    input.motionReadiness ??
    evaluateMotionReadiness({
      analysis: input.analysis,
      vision: input.vision,
      strict: input.strictMotion ?? false,
    });
  const detectedLines = summaryLines(input.analysis, true);
  const missingLines = summaryLines(input.analysis, false);
  const canGenerateMissingParts =
    missingLines.length > 0 || completeness !== "COMPLETE";

  return {
    titleKey: "characterEngine.summary.title",
    characterType: input.analysis.characterType,
    completeness,
    completenessLabelKey: COMPLETENESS_LABEL_KEYS[completeness],
    readinessScore: motionReadiness.score,
    motionReady: motionReadiness.ready,
    detectedLines,
    missingLines,
    canGenerateMissingParts,
    leadKey: canGenerateMissingParts
      ? "characterEngine.summary.leadCanGenerate"
      : "characterEngine.summary.leadComplete",
  };
}

export function characterEngineMetadataToDraftFields(
  metadata: CharacterEngineSaveMetadata
): Record<string, string | null> {
  return {
    characterCompleteness: metadata.characterCompleteness,
    motionReadinessScore: String(metadata.motionReadinessScore),
    motionReady: metadata.motionReady ? "true" : "false",
    missingParts: JSON.stringify(metadata.missingParts),
    characterType: metadata.characterType,
    sourceRoute: metadata.sourceRoute,
    characterEngineAnalyzedAt: metadata.analyzedAt,
  };
}

export function buildCharacterEngineSaveMetadata(input: {
  analysis: CharacterAnalysisResult;
  route: CharacterClusterRoute;
  vision?: AssetVisionAnalysis | null;
  strictMotion?: boolean;
}): CharacterEngineSaveMetadata {
  const completeness = evaluateCharacterCompleteness(input.analysis);
  const motion = evaluateMotionReadiness({
    analysis: input.analysis,
    vision: input.vision,
    strict: input.strictMotion ?? input.route === "motion-ready",
  });

  return {
    characterCompleteness: completeness,
    motionReadinessScore: motion.score,
    motionReady: motion.ready,
    missingParts: input.analysis.missingParts,
    characterType: input.analysis.characterType,
    bodyVisibility: input.analysis.bodyVisibility,
    sourceRoute: input.route,
    analyzedAt: new Date().toISOString(),
  };
}

export function runCharacterEngine(input: {
  route: CharacterClusterRoute;
  vision?: AssetVisionAnalysis | null;
  idea?: string;
  referenceMode?: CharacterReferenceMode;
  locale?: "nl" | "en";
  strictMotion?: boolean;
}): {
  analysis: CharacterAnalysisResult;
  completeness: CharacterCompletenessLevel;
  motionReadiness: CharacterMotionReadinessResult;
  summary: CharacterEngineSummary;
  questions: CharacterDynamicQuestion[];
  answers: Record<string, string | boolean | undefined>;
  saveMetadata: CharacterEngineSaveMetadata;
} {
  const analysis = analyzeCharacter({ vision: input.vision, idea: input.idea });
  const completeness = evaluateCharacterCompleteness(analysis);
  const strict = input.strictMotion ?? input.route === "motion-ready";
  const motionReadiness = evaluateMotionReadiness({ analysis, vision: input.vision, strict });
  const summary = buildCharacterSummary({
    analysis,
    vision: input.vision,
    completeness,
    motionReadiness,
    strictMotion: strict,
  });
  const questions = resolveCharacterEngineQuestions({
    route: input.route,
    idea: input.idea,
    vision: input.vision,
    referenceMode: input.referenceMode,
    locale: input.locale,
    strictMotion: strict,
  });
  const answers = seedCharacterEngineAnswers(questions);
  const saveMetadata = buildCharacterEngineSaveMetadata({
    analysis,
    route: input.route,
    vision: input.vision,
    strictMotion: strict,
  });

  return {
    analysis,
    completeness,
    motionReadiness,
    summary,
    questions,
    answers,
    saveMetadata,
  };
}

/** Re-export vision helpers used by wizards — single import surface. */
export {
  detectBodyVisibilityFromVision,
  detectMotionCharacterParts,
  resolveMotionStyleKind,
  summarizeMotionReadiness,
};
