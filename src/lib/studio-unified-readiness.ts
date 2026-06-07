/**
 * Studio V2 — single source of truth for readiness across workspace surfaces.
 * Wraps existing helpers only; no new scoring engine.
 */

import { buildRenderReadinessSummary } from "@/lib/studio-render-readiness-summary";
import { resolveStoryboardShotPlanReadiness } from "@/lib/studio-shot-planner";
import { buildSceneImageReadiness } from "@/lib/studio-visual-production-summary";
import {
  buildIdentityConsumptionFixActions,
  buildStoryboardIdentityConsumption,
} from "@/lib/studio-identity-consumption";
import {
  buildReadinessFixActions,
  type StudioReadinessFixAction,
} from "@/lib/studio-consistency-fix-suggestions";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import { normalizeStudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import { sceneHasCompletedImage } from "@/lib/studio-movie-scene-image";
import type { StudioToolId } from "@/lib/studio-tool-id";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";

export type UnifiedReadinessLevel = "ready" | "almost_ready" | "needs_work";

export type UnifiedReadinessCheckId =
  | "scenes"
  | "characters"
  | "location"
  | "world"
  | "camera"
  | "images"
  | "voice"
  | "text_beats"
  | "emotion";

export type UnifiedReadinessCheck = {
  id: UnifiedReadinessCheckId;
  messageKey: string;
  passed: boolean;
};

export type { StudioReadinessFixAction } from "@/lib/studio-consistency-fix-suggestions";

export type StudioRenderSoftWarning = {
  messageKey: string;
  params?: Record<string, string>;
};

export type StudioUnifiedReadiness = {
  level: UnifiedReadinessLevel;
  score: number;
  softGateKey: string;
  checks: UnifiedReadinessCheck[];
  fixes: StudioReadinessFixAction[];
  renderWarnings: StudioRenderSoftWarning[];
};

export function unifiedLevelFromScore(score: number): UnifiedReadinessLevel {
  if (score >= 85) {
    return "ready";
  }
  if (score >= 55) {
    return "almost_ready";
  }
  return "needs_work";
}

export function unifiedSoftGateKey(level: UnifiedReadinessLevel): string {
  if (level === "ready") {
    return "studio.execution.softGate.ready";
  }
  if (level === "almost_ready") {
    return "studio.execution.softGate.review";
  }
  return "studio.execution.softGate.missing";
}

function buildRenderSoftWarnings(
  storyboard: StudioStoryboardDetail,
  checks: UnifiedReadinessCheck[]
): StudioRenderSoftWarning[] {
  const scenes = [...storyboard.scenes].sort((a, b) => a.order - b.order);
  const warnings: StudioRenderSoftWarning[] = [];

  const imagesCheck = checks.find((c) => c.id === "images");
  if (imagesCheck && !imagesCheck.passed) {
    const missing = scenes.filter((s) => !sceneHasCompletedImage(s)).length;
    if (missing > 0) {
      warnings.push({
        messageKey: "studio.execution.renderWarning.missingImages",
        params: { count: String(missing) },
      });
    }
  }

  const locationCheck = checks.find((c) => c.id === "location");
  if (locationCheck && !locationCheck.passed) {
    const missing = scenes.filter((s) => !s.locationId && !s.location).length;
    if (missing > 0) {
      warnings.push({
        messageKey: "studio.execution.renderWarning.missingLocations",
        params: { count: String(missing) },
      });
    }
  }

  const charactersCheck = checks.find((c) => c.id === "characters");
  if (charactersCheck && !charactersCheck.passed) {
    warnings.push({ messageKey: "studio.execution.renderWarning.missingCharacters" });
  }

  const voiceCheck = checks.find((c) => c.id === "voice");
  if (voiceCheck && !voiceCheck.passed && storyboard.voiceEnabled) {
    warnings.push({ messageKey: "studio.execution.renderWarning.missingVoice" });
  }

  const worldCheck = checks.find((c) => c.id === "world");
  if (worldCheck && !worldCheck.passed) {
    warnings.push({ messageKey: "studio.execution.renderWarning.worldInconsistent" });
  }

  const shotReadiness = resolveStoryboardShotPlanReadiness(storyboard);
  if (!shotReadiness.hasShotFlow) {
    warnings.push({ messageKey: "studio.shotPlanner.readiness.missingFlow" });
  } else if (!shotReadiness.motionLogical) {
    warnings.push({ messageKey: "studio.shotPlanner.readiness.motionReview" });
  }

  return warnings;
}

export function buildStudioUnifiedReadiness(params: {
  storyboard: StudioStoryboardDetail;
  characters?: StudioCharacterListItem[];
  locations?: StudioLocationListItem[];
  props?: StudioPropListItem[];
  worlds?: StudioWorldProfileListItem[];
  styleProfile?: string;
  directorProfile?: string;
}): StudioUnifiedReadiness {
  const styleProfile = normalizeStudioPromptStyleProfile(
    params.styleProfile ?? params.storyboard.promptStyleProfile
  );
  const directorProfile = normalizeStudioDirectorProfile(
    params.directorProfile ?? params.storyboard.directorProfile
  );

  const render = buildRenderReadinessSummary(params.storyboard);
  const visual = buildSceneImageReadiness({
    storyboard: params.storyboard,
    styleProfile,
    directorProfile,
    characters: params.characters,
    locations: params.locations,
    props: params.props,
    worlds: params.worlds,
  });

  const renderById = new Map(render.checks.map((c) => [c.id, c]));
  const visualById = new Map(visual.checks.map((c) => [c.id, c]));

  const checks: UnifiedReadinessCheck[] = [
    {
      id: "scenes",
      messageKey: renderById.get("scenes")!.messageKey,
      passed: renderById.get("scenes")!.passed,
    },
    {
      id: "characters",
      messageKey: visualById.get("characters")!.messageKey,
      passed: visualById.get("characters")!.passed,
    },
    {
      id: "location",
      messageKey: visualById.get("location")!.messageKey,
      passed: visualById.get("location")!.passed,
    },
    {
      id: "world",
      messageKey: visualById.get("world")!.messageKey,
      passed: visualById.get("world")!.passed,
    },
    {
      id: "camera",
      messageKey: visualById.get("camera")!.messageKey,
      passed: visualById.get("camera")!.passed,
    },
    {
      id: "images",
      messageKey: renderById.get("images")!.messageKey,
      passed: renderById.get("images")!.passed && visualById.get("images")!.passed,
    },
    {
      id: "voice",
      messageKey: renderById.get("voice")!.messageKey,
      passed: renderById.get("voice")!.passed,
    },
    {
      id: "text_beats",
      messageKey: renderById.get("text_beats")!.messageKey,
      passed: renderById.get("text_beats")!.passed,
    },
    {
      id: "emotion",
      messageKey: renderById.get("emotion")!.messageKey,
      passed: renderById.get("emotion")!.passed,
    },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);
  const level = unifiedLevelFromScore(score);

  const fixes = buildReadinessFixActions({
    storyboard: params.storyboard,
    checks,
    characters: params.characters ?? [],
    locations: params.locations ?? [],
    props: params.props ?? [],
    worlds: params.worlds ?? [],
  });

  if (params.characters?.length || params.worlds?.length) {
    const consumption = buildStoryboardIdentityConsumption({
      storyboard: params.storyboard,
      libraries: {
        characters: params.characters ?? [],
        locations: params.locations ?? [],
        props: params.props ?? [],
        worlds: params.worlds ?? [],
      },
    });
    const identityFixes = buildIdentityConsumptionFixActions(consumption).map((fix) => ({
      id: fix.id,
      checkId: "characters" as const,
      tool: fix.tool,
      issueKey: fix.issueKey,
      reasonKey: fix.reasonKey,
      currentLabel: fix.currentLabel,
      suggestedLabel: fix.suggestedLabelKey,
    }));
    fixes.push(...identityFixes.slice(0, 3));
  }

  return {
    level,
    score,
    softGateKey: unifiedSoftGateKey(level),
    checks,
    fixes,
    renderWarnings: buildRenderSoftWarnings(params.storyboard, checks),
  };
}

/** Map unified readiness to legacy proposal render readiness shape. */
export function unifiedToProposalRenderReadiness(unified: StudioUnifiedReadiness) {
  const proposalCheckIds = [
    "scenes",
    "characters",
    "location",
    "voice",
    "text_beats",
    "emotion",
    "images",
  ] as const;

  const checks = proposalCheckIds.map((id) => {
    const check = unified.checks.find((c) => c.id === id);
    return {
      id,
      messageKey: check?.messageKey ?? `studio.directorProposal.readiness.check.${id}`,
      passed: check?.passed ?? false,
    };
  });

  const recommendationKeys = checks
    .filter((c) => !c.passed)
    .map((c) => {
      const map: Record<string, string> = {
        scenes: "studio.directorProposal.readiness.rec.scenes",
        characters: "studio.directorProposal.readiness.rec.characters",
        location: "studio.directorProposal.readiness.rec.location",
        voice: "studio.directorProposal.readiness.rec.voice",
        text_beats: "studio.directorProposal.readiness.rec.textBeats",
        emotion: "studio.directorProposal.readiness.rec.emotion",
        images: "studio.directorProposal.readiness.rec.images",
      };
      return map[c.id];
    })
    .filter((k): k is string => Boolean(k));

  return {
    level: unified.level,
    score: unified.score,
    checks,
    recommendationKeys,
  };
}
