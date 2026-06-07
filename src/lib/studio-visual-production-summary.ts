/**
 * Studio V2 — visual production summary and image readiness for workspace.
 */

import { analyzeSceneImagePlanner } from "@/lib/studio-scene-image-planner";
import { sceneHasCompletedImage } from "@/lib/studio-movie-scene-image";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import { normalizeStudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import { buildStoryboardIdentityConsumption } from "@/lib/studio-identity-consumption";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";

export type VisualProductionLevel = "ready" | "almost_ready" | "needs_work";

export type VisualProductionSummary = {
  sceneCount: number;
  scenesWithImage: number;
  scenesWithoutImage: number;
  scenesMissingLocation: number;
  scenesMissingCharacters: number;
  visualConsistencyScore: number;
};

export type VisualImageReadiness = {
  level: VisualProductionLevel;
  score: number;
  checks: Array<{ id: string; messageKey: string; passed: boolean }>;
  recommendationKeys: string[];
  identityCompletenessPassed?: boolean;
  identityContextLines?: string[];
};

const WARNING_TO_REC: Record<string, string> = {
  scene_missing_characters: "studio.visualProduction.rec.characters",
  location_unassigned: "studio.visualProduction.rec.location",
  character_disappears: "studio.visualProduction.rec.characterContinuity",
  location_jump: "studio.visualProduction.rec.locationContinuity",
  prop_drops: "studio.visualProduction.rec.props",
  mascot_disappears: "studio.visualProduction.rec.mascot",
};

function mapPlannerReadiness(readiness: string): VisualProductionLevel {
  if (readiness === "ready") {
    return "ready";
  }
  if (readiness === "needs_attention") {
    return "almost_ready";
  }
  return "needs_work";
}

export function buildVisualProductionSummary(
  storyboard: StudioStoryboardDetail
): VisualProductionSummary {
  const scenes = [...storyboard.scenes].sort((a, b) => a.order - b.order);
  const scenesWithImage = scenes.filter((s) => sceneHasCompletedImage(s)).length;
  const scenesMissingLocation = scenes.filter((s) => !s.locationId && !s.location).length;
  const scenesMissingCharacters = scenes.filter((s) => s.characters.length === 0).length;

  return {
    sceneCount: scenes.length,
    scenesWithImage,
    scenesWithoutImage: scenes.length - scenesWithImage,
    scenesMissingLocation,
    scenesMissingCharacters,
    visualConsistencyScore: 0,
  };
}

export function buildSceneImageReadiness(params: {
  storyboard: StudioStoryboardDetail;
  styleProfile?: string;
  directorProfile?: string;
  characters?: StudioCharacterListItem[];
  locations?: StudioLocationListItem[];
  props?: StudioPropListItem[];
  worlds?: StudioWorldProfileListItem[];
}): VisualImageReadiness {
  const report = analyzeSceneImagePlanner({
    storyboard: params.storyboard,
    styleProfile: normalizeStudioPromptStyleProfile(
      params.styleProfile ?? params.storyboard.promptStyleProfile
    ),
    directorProfile: normalizeStudioDirectorProfile(
      params.directorProfile ?? params.storyboard.directorProfile
    ),
  });

  const scenes = [...params.storyboard.scenes].sort((a, b) => a.order - b.order);
  const hasCharacters = scenes.some((s) => s.characters.length > 0);
  const hasLocation = scenes.some((s) => s.locationId || s.location);
  const hasCamera = scenes.some((s) => s.shotType?.trim() || s.camera?.trim());
  const hasEmotion = scenes.filter((s) => s.emotion?.trim()).length >= Math.ceil(scenes.length * 0.5);
  const hasWorld = scenes.some(
    (s) =>
      s.location?.worldProfile ||
      s.characters.some((c) => c.worldProfile)
  );
  const imagesOk = scenes.length > 0 && scenes.every((s) => sceneHasCompletedImage(s));

  const checks = [
    {
      id: "characters",
      messageKey: "studio.visualProduction.readiness.check.characters",
      passed: hasCharacters,
    },
    {
      id: "location",
      messageKey: "studio.visualProduction.readiness.check.location",
      passed: hasLocation,
    },
    {
      id: "world",
      messageKey: "studio.visualProduction.readiness.check.world",
      passed: hasWorld || hasLocation,
    },
    {
      id: "camera",
      messageKey: "studio.visualProduction.readiness.check.camera",
      passed: hasCamera,
    },
    {
      id: "emotion",
      messageKey: "studio.visualProduction.readiness.check.emotion",
      passed: hasEmotion,
    },
    {
      id: "images",
      messageKey: "studio.visualProduction.readiness.check.images",
      passed: imagesOk,
    },
  ];

  const recommendationKeys = [
    ...checks.filter((c) => !c.passed).map((c) => {
      const map: Record<string, string> = {
        characters: "studio.visualProduction.rec.characters",
        location: "studio.visualProduction.rec.location",
        world: "studio.visualProduction.rec.world",
        camera: "studio.visualProduction.rec.camera",
        emotion: "studio.visualProduction.rec.emotion",
        images: "studio.visualProduction.rec.generateImages",
        identity: "studio.identityConsumption.rec.completeIdentity",
      };
      return map[c.id];
    }),
    ...report.warnings
      .map((w) => WARNING_TO_REC[w.code] ?? null)
      .filter((k): k is string => Boolean(k)),
  ];

  const librariesProvided =
    params.characters || params.locations || params.props || params.worlds;
  let identityCompletenessPassed: boolean | undefined;
  let identityContextLines: string[] | undefined;

  if (librariesProvided) {
    const consumption = buildStoryboardIdentityConsumption({
      storyboard: params.storyboard,
      libraries: {
        characters: params.characters ?? [],
        locations: params.locations ?? [],
        props: params.props ?? [],
        worlds: params.worlds ?? [],
      },
    });
    identityCompletenessPassed =
      consumption.completenessChecks.length === 0 ||
      consumption.completenessChecks.every((c) => c.passed);
    identityContextLines = consumption.visualProductionLines.slice(0, 6);

    if (consumption.assetSummaries.length > 0 && !identityCompletenessPassed) {
      checks.push({
        id: "identity",
        messageKey: "studio.identityConsumption.readiness.incomplete",
        passed: false,
      });
    } else if (consumption.assetSummaries.length > 0) {
      checks.push({
        id: "identity",
        messageKey: "studio.identityConsumption.readiness.complete",
        passed: true,
      });
    }
  }

  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);
  const plannerLevel = mapPlannerReadiness(report.readiness);
  const level: VisualProductionLevel =
    score >= 85 && plannerLevel === "ready" ? "ready"
    : score >= 50 || plannerLevel === "almost_ready" ? "almost_ready"
    : "needs_work";

  return {
    level,
    score,
    checks,
    recommendationKeys: [...new Set(recommendationKeys)].slice(0, 6),
    identityCompletenessPassed,
    identityContextLines,
  };
}

export function findSceneVisualPlan(
  storyboard: StudioStoryboardDetail,
  sceneId: string,
  styleProfile?: string,
  directorProfile?: string
) {
  const report = analyzeSceneImagePlanner({
    storyboard,
    styleProfile: normalizeStudioPromptStyleProfile(
      styleProfile ?? storyboard.promptStyleProfile
    ),
    directorProfile: normalizeStudioDirectorProfile(
      directorProfile ?? storyboard.directorProfile
    ),
  });
  return report.scenes.find((s) => s.requirements.sceneId === sceneId) ?? null;
}

export function enrichVisualProductionSummary(
  summary: VisualProductionSummary,
  storyboard: StudioStoryboardDetail,
  styleProfile?: string,
  directorProfile?: string
): VisualProductionSummary {
  const report = analyzeSceneImagePlanner({
    storyboard,
    styleProfile: normalizeStudioPromptStyleProfile(
      styleProfile ?? storyboard.promptStyleProfile
    ),
    directorProfile: normalizeStudioDirectorProfile(
      directorProfile ?? storyboard.directorProfile
    ),
  });
  return { ...summary, visualConsistencyScore: report.visualConsistencyScore };
}
